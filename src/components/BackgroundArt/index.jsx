import { useEffect, useMemo, useRef, useState } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { backgroundIdlePeriodSeconds } from '../../utils/feedbackDuration'
import { growArmature, RULESETS } from '../../background/lsystem'
import { densityMap } from '../../background/raster'
import { samplePlacements, COMPOSE } from '../../background/compose'
import { GLYPHS } from '../../background/glyphs'
import {
  bandOf,
  revealDelays,
  revealTiming,
  idleTimings,
  idleStartSeconds,
  driftPeriodSeconds,
  maxSwayReach,
  CHOREOGRAPHY,
} from '../../background/choreography'
import styles from './BackgroundArt.module.css'

// ─── BackgroundArt ────────────────────────────────────────────────────────────
//
// The renderer. Everything above it in src/background/ is pure; this is the one
// piece that touches React, the DOM and the token layer.
//
// ── One face, and why the other two went ──────────────────────────────────────
//
// This drew the same composition three ways until 2026-07-28. The traced face
// flattened every shape to a polyline and stroked the outline with a 1.3px pen;
// the pixel face aggregated those polylines into cells and painted the cells.
// Both were written for hand-drawn line work, where outlining a filled region
// gives you a drawing. The libraries are pixel art now, where a 1.3px pen
// against a 1.59px box outlines every interior edge twice and the whole mark
// fills in.
//
// The native face draws the authored shapes filled, one `<g>` per mark in
// `<defs>` and one `<use>` per stamp carrying the placement as a transform. No
// flattening, no stroking, and no ink resolution at all: the file already says
// what colour it is in this theme, because the theme has its own file.
//
// That last clause is what deleted the most code. An ink-keyed palette, the
// runtime ink transform, the census, the high-contrast blanket and the whole
// single-resolution-point contract existed so two faces could agree about what
// colour a mark is. One face reading authored fills has nothing to agree with.
// The `#76c17d` split that the palette could not represent went with it.
//
// The deleted faces are in git and the argument for having built them is in
// docs/decisions/background-colorways-and-native-face-2026-07-27.md.
//
// ── What reads which timing ───────────────────────────────────────────────────
// The reveal is one-shot and bounded, so it is demonstration: it reads the
// editable --motion-* tokens and a preset change retimes it (see revealKey).
//
// The idle is infinite, so it is chrome, but chrome means BOUNDED rather than
// FIXED: its period scales with --motion-duration-slower and is clamped, so no
// editable value can drive it toward the strobe the rule exists to prevent. The
// fixed --feedback-background-idle-period is the anchor Standard maps to. Its
// SHAPE is a plain ease-in-out and not a token; see driftPeriodSeconds for why
// that was tried and dropped.
//
// Neither carries a literal. See docs/briefings/background_system_rulings.md
// section 1.
//
// ── What triggers a regeneration ──────────────────────────────────────────────
// Seed and surface size. NOT motion tokens: geometry does not depend on them, so
// editing a duration must not re-reveal the background (it would re-reveal on
// every slider frame). NOT theme, and that is now true by construction rather
// than by discipline. The composition is a list of PLACEMENTS, which carry
// position, rotation, scale and a mark index and nothing about colour; the
// theme only decides which `shapes` array those indexes are looked up in. There
// is no longer a theme-shaped value the memo could accidentally depend on,
// which is what ruling A always wanted.

// HOST CONTRACT: the element this mounts into must be a stacking context
// (`isolation: isolate` is the clearest way) and should be `position: relative`.
// The layer paints at z-index -1 so it sits behind the host's in-flow content,
// and without a stacking context that puts it behind the host's own background
// instead, where an opaque background hides it entirely. In development the
// component checks and warns, because the failure renders nothing at all while
// the DOM looks perfectly correct, which is a miserable thing to debug.
export function BackgroundArt({
  width,
  height,
  // The authored shapes for the active theme's colorway, indexed by markIndex.
  // Each entry is { name, cx, cy, unit, paths: [{ d, fill, transform }] }.
  shapes,
  // Which library is on screen, as a key. Read by the composition memo and by
  // nothing else: switching tools has to plant a new field even when the two
  // libraries happen to hold the same number of marks, and `markCount` alone
  // cannot see that (tokenLab and principles are both 10). A theme switch never
  // changes this, so it cannot cause a regeneration.
  libraryKey,
  // How many marks the library holds. Passed separately rather than read off
  // `shapes` so the composition memo cannot depend on a theme-shaped value even
  // by accident: the colorways are parity-checked to the same length (see
  // library.test.js), so the two agree, but only this one is theme-independent
  // in the type of thing it is.
  markCount,
  seed = 11,
  ruleset = 'vine',
  roots,
  baseline = 0,
  clearanceFade = 0,
  budget = 40,
  stampScale = 0.45,
  alignFlow = true,
  // Only `tokenInk` is read, and only to resolve an authored `currentColor`
  // inside a mark. Everything else the palette used to carry (the tone ramp, the
  // grid ink, the high-contrast blanket) belonged to the deleted faces.
  palette,
  // Bumped by the caller when a preset is loaded or the defaults are restored,
  // and by nothing else. Each change re-reads the motion tokens and replays the
  // reveal with them, which is the only path by which the tool bar reaches this
  // component. See MotionPresetContext and the reveal-passes note below.
  revealKey = 0,
  // Peak sway displacement in px. Feeds the idle table AND the baseline
  // clearance, which is why it lives on the composition memo as well: a taller
  // sway needs more room reserved above the nav labels, not just a bigger
  // animation. See CHOREOGRAPHY.idleAmplitude.
  idleAmplitude = CHOREOGRAPHY.idleAmplitude,
  // Floor and ceiling on the drift period, seconds. The floor is what makes the
  // period safe to derive from an editable token at all; see driftPeriodSeconds.
  driftPeriodClamp = CHOREOGRAPHY.driftPeriodClamp,
  // World px between stamp centers, 0 to place without a spacing pass.
  minSpacing = 0,
  className,
}) {
  // useMediaQuery, NOT framer's useReducedMotion, and the difference is the fix
  // for a reduced-motion bug. framer's hook resolves its value a tick AFTER
  // first render (documented in PrinciplesLibrary): on that first render it can
  // report no-reduce even when the preference is on, so the reveal and the idle
  // both mount with their full non-reduced timing and correct a frame later --
  // a flash of exactly the motion the preference exists to suppress.
  // useMediaQuery reads matchMedia synchronously in its useState initializer, so
  // the very first render already knows the preference and nothing non-reduced
  // is ever committed. (useMotionTokens still flattens a tick late, but the
  // reduced reveal no longer derives its window from those tokens -- see
  // revealTiming and CHOREOGRAPHY.reducedWindow -- so that tick no longer bites.)
  const prefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  // `readKey` makes the hook re-read :root on a preset change. Without it the
  // tokens are whatever they were at mount, and a replayed reveal would run at
  // the old preset's timing while claiming to show the new one.
  const tokens = useMotionTokens({ readKey: revealKey })

  // Geometry. Regenerates only on the inputs that change the drawing, which
  // deliberately excludes the motion tokens and the theme.
  const composition = useMemo(() => {
    if (!width || !height || !markCount) return null

    const profile = RULESETS[ruleset] || RULESETS.vine
    const rootXs = roots?.length ? roots : [width * 0.29, width * 0.71]
    const armature = growArmature(profile, {
      seed,
      roots: rootXs,
      baseline,
      rootScatter: width * 0.1,
    })

    // The clearance ramp gates placement CENTERS, but a stamp is not a point:
    // its ink reaches outward from that center, so marks placed exactly at the
    // baseline hang above it and sit behind the nav labels the baseline exists
    // to protect. Measured in the nav at the default scale, the overhang was
    // about 25px against a 359px baseline, which put ink behind the last
    // header.
    //
    // So the density map is given a baseline pushed down by the worst case a
    // stamp can reach: half the normalized span along its diagonal (a rotated
    // mark presents a corner, not an edge), at the largest scale the variance
    // allows, plus the jitter that can move the center up in the first place.
    //
    // The sway is the third term and it is easy to forget, because it acts
    // AFTER the sampler has finished: a stamp placed legally at the baseline
    // still drifts up into the labels once the idle starts. It was invisible at
    // the old 3px amplitude and is not at 8.
    const markReach =
      (GLYPHS.span / 2) * Math.SQRT2 * stampScale * (1 + COMPOSE.scaleVariance) +
      14 * COMPOSE.jitter +
      maxSwayReach(idleAmplitude)
    const density = densityMap(armature.lines, {
      cell: 14,
      width,
      height,
      baseline: baseline + markReach,
      fade: clearanceFade,
    })

    // ONE budget, every theme. High contrast used to run at 0.6x, and the
    // reason was that the HC themes had no quiet grey to spend on a dense field:
    // every ink was being repainted to one accent token at runtime, so density
    // was the only lever left for keeping the field calm.
    //
    // That mechanism is gone. `contrastDark` and `contrastLight` are authored,
    // so how loud high contrast reads is already decided in the art. Leaving the
    // multiplier in would have it quietly second-guessing a choice made in
    // Illustrator, and it would mean crossing into HC changed two things at
    // once. David's call, 2026-07-27.
    const { placements } = samplePlacements(density.cells, {
      seed,
      budget,
      markCount,
      scale: stampScale,
      cellSize: 14,
      alignFlow,
      minSpacing,
    })

    return { placements }
    // `libraryKey` is a REGENERATION KEY, not a value this memo reads, which is
    // why the exhaustive-deps rule flags it and why the rule is wrong here.
    // Switching tools has to plant a new field, and the inputs that would
    // otherwise signal that are not reliable: tokenLab and principles both hold
    // ten marks, so `markCount` does not move between them, and the sampler
    // draws a mark by index rather than by identity. Without this dep, opening
    // Principles from Token Lab would redraw the same field with different
    // animals in the same twelve places.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, markCount, libraryKey, seed, ruleset, roots, baseline, clearanceFade,
      budget, stampScale, alignFlow, minSpacing, idleAmplitude])

  const timing = revealTiming(tokens, { reducedMotion: prefersReduced })
  const stampDelays = revealDelays(composition?.placements.length ?? 0, {
    windowSeconds: timing.windowSeconds,
    reducedMotion: prefersReduced,
  })

  // Chrome timing, read once. Returns null under reduced motion, and the
  // component then renders no sway groups at all rather than running them at
  // zero: a zero-duration infinite animation is still infinite.
  const idle = useMemo(
    () => idleTimings({
      // The chrome constant is the ANCHOR, not the answer: Standard maps to it
      // exactly and the other presets scale around it, clamped. See
      // driftPeriodSeconds for why the period rather than the curve carries the
      // preset, and why a clamp is the honest reading of the chrome rule.
      //
      // The scaling reads a token and writes nothing. No CSS property is
      // touched, so the clamp cannot reach any component but this idle.
      periodSeconds: prefersReduced
        ? 0
        : driftPeriodSeconds(tokens, {
            basePeriod: backgroundIdlePeriodSeconds(),
            clamp: driftPeriodClamp,
          }),
      seed,
      reducedMotion: prefersReduced,
      amplitude: idleAmplitude,
    }),
    [seed, prefersReduced, idleAmplitude, tokens, driftPeriodClamp],
  )
  const idleStart = idleStartSeconds({
    windowSeconds: timing.windowSeconds,
    stampDuration: timing.stampDuration,
  })

  // Dev-only host check. See the HOST CONTRACT note above the component: a host
  // that is not a stacking context hides the artwork behind its own background,
  // and the DOM gives no hint that anything is wrong.
  const layerRef = useRef(null)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const host = layerRef.current?.parentElement
    if (!host) return
    const cs = getComputedStyle(host)
    const isContext =
      cs.isolation === 'isolate' ||
      cs.zIndex !== 'auto' ||
      cs.opacity !== '1' ||
      cs.transform !== 'none' ||
      cs.filter !== 'none' ||
      cs.contain === 'paint' ||
      cs.willChange.includes('transform') ||
      cs.mixBlendMode !== 'normal'
    const opaqueBackground = cs.backgroundColor && !/transparent|rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor)
    if (!isContext && opaqueBackground) {
      console.warn(
        '[BackgroundArt] the host element is not a stacking context and has an opaque ' +
        `background (${cs.backgroundColor}). The artwork paints at z-index -1 and is ` +
        'therefore hidden behind that background. Add `isolation: isolate` to the host.',
        host,
      )
    }
    // Print the seed so a plant worth keeping can be read off and pinned with
    // ?seed=<n>. Dev only, and once: the seed does not change after mount.
    console.info(`[BackgroundArt] seed ${seed}. Pin with ?seed=${seed}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Reveal passes ───────────────────────────────────────────────────────────
  //
  // The reveal used to run once and never again, full stop. That kept every
  // accidental re-reveal out (a theme switch, a resize, a token drag) at the
  // cost of the one that was worth having: nothing the tool bar did could ever
  // reach the background, so the reveal read the tokens seconds before the user
  // could touch a slider and the connection was decorative.
  //
  // `revealKey` is the narrow opening the header comment always anticipated. It
  // changes ONLY on a preset load or a reset to defaults, never on a drag (see
  // MotionPresetContext), so the rule that mattered survives: a continuous
  // stream of values still cannot restart this clock. A named, deliberate act
  // can.
  //
  // `pass` rather than a boolean, because a CSS animation does not replay just
  // because its class was re-applied to an element that never left the DOM. The
  // pass number goes into the element keys below, React unmounts and remounts
  // the stamps, and the browser starts the animation fresh. It is also what
  // makes a second load of the SAME preset replay, which it should.
  const [pass, setPass] = useState(0)
  const [revealing, setRevealing] = useState(true)
  const seenRevealKey = useRef(revealKey)

  useEffect(() => {
    if (revealKey === seenRevealKey.current) return
    seenRevealKey.current = revealKey
    setPass((n) => n + 1)
    setRevealing(true)
  }, [revealKey])

  // The timing this pass will actually run at, read fresh each render so the
  // settle timer below can see it without depending on it.
  const timingRef = useRef(timing)
  timingRef.current = timing

  useEffect(() => {
    const { windowSeconds, stampDuration } = timingRef.current
    const timer = setTimeout(() => setRevealing(false), (windowSeconds + stampDuration) * 1000)
    return () => clearTimeout(timer)
    // Keyed on the PASS, never on the timing values: a token edit mid-reveal
    // must not restart this clock, or dragging a duration slider would hold the
    // background permanently in its arrival state. Reading the timing through a
    // ref is what lets the clock use the current values without subscribing to
    // them.
  }, [pass])

  if (!composition || !shapes?.length) return null

  const ease = timing.enterEase ? `cubic-bezier(${timing.enterEase.join(',')})` : undefined
  // Returns undefined once the reveal has landed, which drops the class as well
  // as the style, so a later composition simply appears.
  const arrival = (delay) => (revealing
    ? {
        animationDuration: `${timing.stampDuration}s`,
        animationTimingFunction: ease,
        animationDelay: `${delay}s`,
      }
    : undefined)
  const swayStyle = (band, axis) => ({
    [axis === 'x' ? '--amp-x' : '--amp-y']: `${(axis === 'x' ? band.ampX : band.ampY).toFixed(2)}px`,
    animationDuration: `${(axis === 'x' ? band.durationX : band.durationY).toFixed(2)}s`,
    animationDelay: `${idleStart}s`,
    animationDirection: axis === 'x' && band.reverse ? 'reverse' : undefined,
  })

  // Stamps are grouped into y-bands so a whole band drifts together, which reads
  // as depth rather than as every mark wandering on its own.
  const groupBy = (items, y) => {
    const bands = new Map()
    items.forEach((item, i) => {
      const band = bandOf(y(item), height)
      if (!bands.has(band)) bands.set(band, [])
      bands.get(band).push({ item, i })
    })
    return [...bands.entries()].sort((a, b) => a[0] - b[0])
  }

  const wrapIdle = (band, children, key) => {
    if (!idle) return <g key={key}>{children}</g>
    const t = idle[band % idle.length]
    return (
      <g key={key} className={styles.swayX} style={swayStyle(t, 'x')}>
        <g className={styles.swayY} style={swayStyle(t, 'y')}>{children}</g>
      </g>
    )
  }

  // Mark ids share a document with every other SVG on the page, so they carry
  // the seed. NOT the theme: `<use href>` has to stay stable across a theme
  // change so the browser repaints the referenced group rather than remounting
  // the reference, which is the same reason the geometry does not move
  // (ruling A).
  //
  // Declared here rather than beside the defs below, and it has to stay here:
  // `nativeDefs` is a const that evaluates immediately, so a declaration further
  // down puts this in the temporal dead zone and the whole component throws on
  // first render. That shipped once. Nothing in the project had ever rendered
  // this component, so lint, the suite and a clean build all missed it; there is
  // a render test now.
  const symbolPrefix = `bg-mark-${seed}`

  // The placement transform: the same normalization the deleted flattener baked
  // into coordinates, written as a transform instead. Place, rotate, scale by
  // the stamp's own factor times the viewBox unit, then pull the attachment
  // point (the viewBox CENTRE, by ruling) back to the origin. Reading it right
  // to left is reading it in the order it applies.
  //
  // `shapes` is indexed by markIndex, the same index the sampler drew.
  const nativeStamp = (stamp) => {
    const shape = shapes[stamp.markIndex]
    if (!shape) return null
    const k = (stamp.scale * shape.unit).toFixed(4)
    const deg = ((stamp.rotation * 180) / Math.PI).toFixed(2)
    return (
      `translate(${stamp.x.toFixed(2)} ${stamp.y.toFixed(2)}) ` +
      `rotate(${deg}) scale(${k}) translate(${-shape.cx} ${-shape.cy})`
    )
  }

  // `<g>` rather than `<symbol>`, deliberately. A symbol with no viewBox still
  // establishes a viewport whose clipping depends on width/height defaults that
  // differ between engines, and there is nothing to gain from it here: the marks
  // are already normalized and the `<use>` carries the whole placement. A group
  // in defs has no viewport semantics at all, so it renders exactly what it
  // holds, everywhere.
  const nativeDefs = (
    <defs>
      {shapes.map((shape, i) => (
        <g key={i} id={`${symbolPrefix}-${i}`}>
          {shape.paths.map((p, j) => (
            <path key={j} d={p.d} fill={p.fill} transform={p.transform} />
          ))}
        </g>
      ))}
    </defs>
  )

  return (
    <div ref={layerRef} className={[styles.layer, className].filter(Boolean).join(' ')} aria-hidden="true" data-seed={seed}>
      {/* `color` is set so an authored `currentColor` inside a mark resolves to
          --color-text-base rather than to whatever the nav column inherits. */}
      <svg
        className={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={palette?.tokenInk ? { color: palette.tokenInk } : undefined}
      >
        {nativeDefs}
        {groupBy(composition.placements, (s) => s.y).map(([band, entries]) =>
          wrapIdle(band, entries.map(({ item, i }) => {
            const transform = nativeStamp(item)
            if (!transform) return null
            const href = `#${symbolPrefix}-${item.markIndex}`

            // ── Two elements, and the placement never animates ──────────────
            //
            // The wrapper owns the placement transform and is never touched by
            // CSS; the inner `<use>` owns the reveal and carries no transform
            // attribute at all. That separation is the whole point.
            //
            // Placement here is a `transform` ATTRIBUTE, which is the weakest
            // thing in the cascade: any CSS `transform` declaration replaces it
            // outright and an animated one certainly does. Put the reveal on the
            // placed element and every mark draws at authored size in the
            // top-left for the whole reveal, then snaps into position when the
            // class drops. That shipped for one afternoon and is what this
            // structure exists to prevent.
            //
            // Two other fixes were built and compared before this one was
            // chosen (animating the individual `scale` property, which composes
            // with the attribute; and opacity-only, which never declares a
            // transform). Both worked. This one costs a node per stamp and needs
            // nothing of the browser, which is why it won.
            return (
              <g key={`n${pass}-${i}`} transform={transform}>
                <use
                  href={href}
                  className={revealing ? styles.stamp : undefined}
                  style={arrival(stampDelays[i])}
                />
              </g>
            )
          }), `n${band}`),
        )}
      </svg>
    </div>
  )
}

export { CHOREOGRAPHY }
