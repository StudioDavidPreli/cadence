import { useEffect, useMemo, useRef, useState } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { backgroundIdlePeriodSeconds } from '../../utils/feedbackDuration'
import { growArmature, RULESETS } from '../../background/lsystem'
import { densityMap, aggregate, AGGREGATION } from '../../background/raster'
import { samplePlacements, composeStamps, strokesOf, COMPOSE } from '../../background/compose'
import { GLYPHS } from '../../background/glyphs'
import { transformInk, inkKeyOf, TOKEN_INK_KEY } from '../../background/ink'
import { normalizationFactors } from '../../background/census'
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
// It draws one composition twice. The vector face paints the glyph outlines;
// the pixel face paints the same strokes after they have been through the
// committed aggregation. They are not two drawings that resemble each other,
// they are one display list rendered two ways, which is why the ink resolves
// once here, above both, rather than inside either.
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
// Seed, surface size and the high-contrast flag. NOT motion tokens: geometry
// does not depend on them, so editing a duration must not re-reveal the
// background (it would re-reveal on every slider frame). NOT theme, either:
// David ruled no reveal on any theme switch, so a theme change repaints and,
// across the high-contrast boundary, swaps the composition without animation.
// That is why `theme` is absent from the memo keys below and only `highContrast`
// appears, and why `revealKey` is deliberately narrower than the memo.

// ── One resolver, two faces, and why it takes a key rather than a color ───────
//
// Both faces must agree about what color a mark is. The obvious arrangement,
// resolving the ink where each face paints, does not achieve that: the pixel
// face does not paint strokes, it paints cells whose dominant ink was decided
// during aggregation, and aggregation happens inside the geometry memo. Resolve
// at paint time only and the vector face gets the theme's ink while the pixel
// face is still shading whatever the library authored. In high contrast that is
// glaring, because the blanket override changes every stroke.
//
// It cannot be fixed by resolving before aggregation either, because the
// geometry memo deliberately does not depend on the theme (ruling A: a theme
// switch must not regenerate or re-reveal).
//
// So aggregation runs on a stable ink KEY: the authored color, or the sentinel
// below for a `currentColor` stroke. The dominant-by-crossing-length decision
// only ever needed a stable identity per stroke, not a final color. The key is
// then resolved to an actual ink at paint time, by this one function, for both
// faces. Geometry stays theme-independent and the faces cannot drift.
// ORDER IS THE CONTRACT HERE, and the order changed when the libraries gained
// authored colorways. The steps, outermost first:
//
//   tokenInk    a `currentColor` stroke is bound to --color-text-base and so it
//               ALREADY flips per theme. Nothing below may touch it: an ink
//               transform would invert the flip, driving dark's #e1e1e1 back to
//               #1e1e1e, and a colorway lookup has nothing to say about an ink
//               the token layer owns.
//
//   override    the lab's "paint this ink as that colour". It is keyed on the
//               CANONICAL ink, which is what the census lists and what the
//               swatch shows, so it has to bite before the colorway lookup
//               rewrites the key out from under it.
//
//   markPalette the authored colorway. This is the theme's real answer now, and
//               it is why the blanket and the transform below it are both
//               inert on a library that ships four colorways.
//
//   transform   the runtime ink flip. Superseded by the colorways for shipped
//               art and kept as a lab knob (see ink.js), so it only fires when
//               the caller asks for a mode other than 'authored'.
//
// ── The high-contrast blanket now defers ──────────────────────────────────────
//
// It used to run first and repaint every ink to --color-accent, because the HC
// themes have no quiet grey and a library authored for dark could not be trusted
// on pure black or pure white. A library carrying authored `contrastDark` and
// `contrastLight` colorways has already answered that question, with more care
// than one flat token can: principles resolves to #b9b0ff on HC-dark rather than
// to the accent, which is a drawing decision the blanket would erase.
//
// So the blanket is the FALLBACK for high contrast, not the override. It still
// catches a library with no contrast colorway, which is the case it was really
// written for.
//
// `inkTransformScope` is a SET OF INK KEYS rather than a set of marks, and that
// is forced by the two faces rather than chosen. The vector face could scope by
// mark, since a stamp carries its markIndex. The pixel face cannot: a cell
// aggregates whatever strokes crossed it and remembers only the dominant ink
// key, never which mark laid it down. An ink-keyed rule is the only one both can
// honour, which is the same argument that put this resolver above both faces,
// and the same one that made `markPalette` ink-keyed too.
function inkFromKey(key, palette) {
  if (!key || key === TOKEN_INK_KEY) return palette.tokenInk  // authored `currentColor`

  const override = palette.inkOverrides?.[key.toLowerCase()]
  if (override) return override

  // The authored colorway for this theme. `null` on the canonical colorway,
  // where the key already IS the ink.
  const authored = palette.markPalette ? palette.markPalette.get(key) : key
  if (authored === TOKEN_INK_KEY) return palette.tokenInk
  if (authored) {
    if (palette.inkTransform && palette.inkTransform !== 'authored') {
      if (!palette.inkTransformScope || palette.inkTransformScope.has(key.toLowerCase())) {
        return transformInk(authored, palette.inkTransform)
      }
    }
    return authored
  }

  // No colorway entry for this ink: a mark the palette could not pair up. Fall
  // back to the blanket in high contrast, and to the canonical ink otherwise.
  if (palette.blanket) return palette.blanket
  return transformInk(key, palette.inkTransform)
}

// Shade a resolved ink by its cell's tone. A cell whose strokes carried no ink
// key at all falls back to the surface's ramp.
function cellFill(cell, buckets, palette) {
  if (!cell.color) return palette.ramp[Math.min(cell.tone, palette.ramp.length - 1)]
  const level = buckets <= 1 ? 1 : cell.tone / (buckets - 1)
  return shade(inkFromKey(cell.color, palette), 0.35 + 0.65 * level)
}

// ── One <path> per ink per stamp, not one per subpath ─────────────────────────
//
// A stroke here is a SUBPATH, and the vector face used to emit an element for
// each one. That was fine for a library of line drawings, where a mark is a
// handful of strokes. It stops being fine for a pixel-authored library: a mark
// built from one rect per pixel is one subpath per pixel, around 100 of them per
// mark, so a 55-stamp composition would draw 5,475 path elements in a nav column
// that is on screen for the whole session.
//
// Nothing about the drawing requires that. SVG path data takes any number of
// `M ... L ...` runs in one `d`, so every subpath sharing an ink can be one
// element. Same picture, same strokes, same ink, two orders of magnitude fewer
// nodes. Grouping by ink rather than concatenating everything is what keeps it
// the same picture: a multi-colour mark still gets one element per colour.
//
// CONSECUTIVE runs of one ink, not all subpaths of one ink. The difference is
// paint order, and it is the difference between a compression and an edit.
// Collecting every same-ink subpath into one element would move ink A's later
// subpaths in front of ink B's earlier ones, which changes which colour is on
// top wherever two strokes overlap. Merging only while the ink stays the same
// preserves document order exactly, so the picture is the one the file
// describes.
//
// It is not free. Measured on the Token Lab library at seed 4242: 1,627
// elements against 308 for the unordered version, well down from the 5,475 this
// replaced. The gap is the price of not reordering paint, and it is worth paying
// on art whose overlaps have not been audited.
//
// How well it pays is a property of the ART, not of this function. A file that
// groups its rects by ink gives long consecutive runs and collapses hard; one
// that interleaves inks scanline by scanline gives runs of one and collapses
// barely at all. The rats interleave (seven to nine inks woven through the fur),
// the runners do not (two inks, grouped), which is most of the distance between
// the 3.4x this achieves and the 17.8x the unordered form would.
//
// Under the high-contrast blanket every stroke resolves to one ink, so the two
// forms are identical there and a stamp collapses to a single element.
function pathDataByInk(strokes, palette) {
  const runs = []
  for (const stroke of strokes) {
    if (stroke.pts.length < 2) continue
    const ink = inkFromKey(inkKeyOf(stroke), palette)
    const d = 'M ' + stroke.pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')
    const last = runs[runs.length - 1]
    if (last && last[0] === ink) last[1] += ' ' + d
    else runs.push([ink, d])
  }
  return runs
}

function shade(color, factor) {
  const hex = color.startsWith('#') ? color.slice(1) : null
  if (!hex) return color
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const channels = [0, 2, 4].map((i) => Math.round(Math.min(255, parseInt(full.slice(i, i + 2), 16) * factor)))
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
}

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
  library,
  seed = 11,
  ruleset = 'vine',
  roots,
  baseline = 0,
  clearanceFade = 0,
  cellSize = 8,
  budget = 40,
  stampScale = 0.34,
  alignFlow = true,
  highContrast = false,
  palette,
  // How an AUTHORED ink resolves for the current theme: 'authored' paints the
  // hex as drawn, 'invert' flips it per channel, 'lightness' flips L in OKLab
  // and keeps the hue. Token-bound and high-contrast inks never see this (see
  // inkFromKey). The caller owns the policy, because the decision is per library
  // and per theme and this component knows neither: it is handed a library and a
  // palette, not a section and a theme name. See NavBackgroundArt.
  inkTransform = 'authored',
  // Which authored inks the transform is allowed to touch: a Set of lowercased
  // hexes, or undefined for all of them. The caller owns this for the same
  // reason it owns the mode, and more so: deciding that one GROUP of marks flips
  // while another does not is a fact about the art, and this component cannot
  // see groups. See inkFromKey for why the scope is inks and not marks.
  inkTransformScope,
  // The active theme's colorway, as a Map from the canonical ink to this
  // theme's, or null on the canonical colorway itself. Built once at load in
  // library.js; see the note there for why the paint travels separately from the
  // geometry rather than as four libraries.
  markPalette,
  // The authored shapes for the active colorway, indexed by markIndex. Only the
  // native face reads this; the traced face works from `library` as before. Both
  // are indexed the same way, so a stamp finds its art either way.
  shapes,
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
  // Lab knobs. All four are inert at their defaults, so the committed drawing is
  // exactly what it was before the lab existed.
  //
  //   inkOverrides   { '<lowercased authored hex>': '<hex>' }, painted instead
  //                  of the transform result. Authored inks only (see inkFromKey).
  //   inkNormalize   0..1. Evens ink deposition across marks by scaling stroke
  //                  width per mark. Close to inert on the current Token Lab
  //                  library, which spans only 0.83x to 1.25x since the boxes
  //                  were normalized; it earns its keep on a mixed one. census.js
  //   strokeWidth    the vector face's base weight, previously the literal 1.3.
  //   minSpacing     world px between stamp centers, 0 for the old behaviour.
  inkOverrides,
  inkNormalize = 0,
  strokeWidth = 1.3,
  minSpacing = 0,
  // Called with the composition's counts after each regeneration, so the lab can
  // report what the knobs actually produced. Memoize it in the caller: it is a
  // dependency of the effect that reports.
  onStats,
  face = 'both',
  cellReveal = 'pop',
  showGrid = false,
  // Mesh weight as a multiplier rather than a px value, so one number covers
  // both grid treatments: the line face and the high-contrast dot face are
  // different shapes and would otherwise need a knob each. 1 is the committed
  // 1px line / 1.5px dot. Open for the visual pass (handoff 6e).
  gridWeight = 1,
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

  // The transform rides ON the palette rather than travelling as a second
  // argument, because "everything needed to turn an ink key into a colour" is
  // exactly what the palette already is. The alternative was a third parameter
  // threaded through inkFromKey, cellFill and pathDataByInk, which is four call
  // sites changed to carry one value that belongs in the object anyway.
  //
  // Only the two ART paths read this. The grid mesh below keeps the raw palette:
  // it paints --color-border, a token read, and is in the same class as tokenInk
  // for exactly the reason spelled out at inkFromKey.
  const inkPalette = useMemo(
    () => (palette ? { ...palette, inkTransform, inkTransformScope, inkOverrides, markPalette } : palette),
    [palette, inkTransform, inkTransformScope, inkOverrides, markPalette],
  )

  // Per-mark stroke weight. Indexed by markIndex, which every stamp carries
  // through from its placement, so a stamp can be drawn at its own mark's
  // corrected weight without the renderer knowing anything about authoring
  // styles. Flat `strokeWidth` for everything when normalization is off.
  const markWidths = useMemo(() => {
    if (!inkNormalize || !library?.length) return null
    return normalizationFactors(library, inkNormalize).map((f) => strokeWidth * f)
  }, [library, inkNormalize, strokeWidth])

  // Geometry. Regenerates only on the inputs that change the drawing, which
  // deliberately excludes the motion tokens and the theme.
  const composition = useMemo(() => {
    if (!width || !height || !library?.length) return null

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
    const { placements, stats: placementStats } = samplePlacements(density.cells, {
      seed,
      budget,
      markCount: library.length,
      scale: stampScale,
      cellSize: 14,
      alignFlow,
      minSpacing,
    })

    const { stamps } = composeStamps(placements, library)
    const buckets = highContrast ? AGGREGATION.bucketsHighContrast : AGGREGATION.buckets
    // Aggregate on the ink KEY, not the authored color, so the dominant-ink
    // decision is theme-independent and both faces resolve it the same way at
    // paint time. See the note above inkFromKey.
    const keyed = strokesOf(stamps).map((stroke) => ({ ...stroke, color: inkKeyOf(stroke) }))
    const cells = aggregate(keyed, { cell: cellSize, width, height, buckets })

    return { stamps, cells: cells.cells, buckets, stats: cells.stats, placementStats }
  }, [width, height, library, seed, ruleset, roots, baseline, clearanceFade,
      cellSize, budget, stampScale, alignFlow, highContrast, minSpacing, idleAmplitude])

  // Report what the knobs produced. Depends on `composition`, which is a memo,
  // so this fires once per regeneration rather than once per render: without
  // that the lab's setState would re-render this component and loop.
  useEffect(() => {
    if (!composition || !onStats) return
    onStats({
      stamps: composition.stamps.length,
      cells: composition.cells.length,
      rejected: composition.placementStats?.rejected ?? 0,
    })
  }, [composition, onStats])

  const timing = revealTiming(tokens, { reducedMotion: prefersReduced })
  const stampDelays = revealDelays(composition?.stamps.length ?? 0, {
    windowSeconds: timing.windowSeconds,
    reducedMotion: prefersReduced,
  })
  const cellDelays = revealDelays(composition?.cells.length ?? 0, {
    windowSeconds: timing.windowSeconds,
    reducedMotion: prefersReduced,
  })

  // Chrome timing, read once. Returns null under reduced motion, and the
  // component then renders no sway or breathe groups at all rather than running
  // them at zero: a zero-duration infinite animation is still infinite.
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

  // ── The reveal runs once, on mount, and never again ─────────────────────────
  //
  // Ruling A: no reveal on any theme switch. Enforcing that takes more than
  // leaving `theme` out of the memo keys, because crossing the high-contrast
  // boundary genuinely changes the composition (two tone levels instead of
  // four, and a reduced budget). Fewer cells means React mounts a different set
  // of elements, and a freshly mounted element carrying an arrival animation
  // plays it. Measured before this guard existed: dark to high-contrast-dark
  // took the pixel face from 779 rects to 592, and the 592 re-revealed.
  //
  // So the arrival is attached only while the first reveal is in flight. After
  // it lands, later compositions appear without animation, which is what the
  // ruling asks for: entering high contrast repaints the whole page anyway, and
  // an animated background would be the one element drawing attention to
  // itself.
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

  if (!composition) return null

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

  // Both faces group by ONE y-band partition, so the pixel shimmer moves with
  // the glyph drift rather than merely near it.
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

  const showVector = face === 'both' || face === 'vector'
  const showPixel = face === 'both' || face === 'pixel'
  const showNative = face === 'native'

  // Mark ids share a document with every other SVG on the page, so they carry
  // the seed. NOT the theme: `<use href>` has to stay stable across a theme
  // change so the browser repaints the referenced group rather than remounting
  // the reference, which is the same reason the geometry does not move
  // (ruling A).
  //
  // Declared here rather than beside `gridId` below, and it has to stay here:
  // `nativeDefs` is a const that evaluates immediately, so a declaration further
  // down puts this in the temporal dead zone and the whole component throws on
  // first render.
  const symbolPrefix = `bg-mark-${seed}`

  // ── The native face ─────────────────────────────────────────────────────────
  //
  // The authored shapes, filled, placed with an SVG transform. No flattening, no
  // stroking, no ink resolution: the file already says what colour it is, in
  // this theme, because the theme has its own file.
  //
  // One `<symbol>` per MARK and one `<use>` per STAMP, which is the shape of the
  // saving. The traced face emits an element per subpath run per stamp and grows
  // with the budget; this pays a fixed cost for the symbols and one node per
  // stamp after that. The crossover sits around 36 stamps, so it is roughly a
  // third leaner at the default budget and several times leaner above it.
  //
  // The transform is the same normalization `buildMark` bakes into coordinates
  // for the traced face, written as a transform instead: place, rotate, scale by
  // the stamp's own factor times the viewBox unit, then pull the attachment
  // point (the viewBox CENTRE, by ruling) back to the origin. Reading it right
  // to left is reading it in the order it applies.
  //
  // `shapes` is indexed by markIndex, the same index the sampler drew, so a
  // stamp finds its art the same way in either face.
  const nativeStamp = (stamp) => {
    const shape = shapes?.[stamp.markIndex]
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
  const nativeDefs = showNative && shapes?.length ? (
    <defs>
      {shapes.map((shape, i) => (
        <g key={i} id={`${symbolPrefix}-${i}`}>
          {shape.paths.map((p, j) => (
            <path key={j} d={p.d} fill={p.fill} transform={p.transform} />
          ))}
        </g>
      ))}
    </defs>
  ) : null

  // ── The empty-cell grid ───────────────────────────────────────────────────
  //
  // The pixel face's substrate, drawn as ONE patterned rect rather than a rect
  // per empty cell: the full lattice is ~2400 cells at 8px against ~400 inked,
  // so per-cell would 6x the DOM for pure background structure. A pattern tiling
  // from the SVG origin aligns to the same cell lattice the inked rects use
  // (both at multiples of cellSize from 0), so nothing seams.
  //
  // Static: no reveal, no breathe. It is present from the first frame and the
  // ink arrives into it, which is the grid-hold rule taken to its conclusion.
  //
  // Two treatments. Light and dark get a line mesh at --color-border, which is
  // genuinely quiet there (~1.3:1). High contrast has no quiet gray, so
  // --color-border is pure black/white and a solid mesh would be a loud
  // lattice; it gets sparse dots at the intersections instead, the same
  // philosophy as DemoField's high-contrast sparse mode. Judge whether even the
  // dots are too much; suppressing the HC grid entirely is a one-line change.
  const gridTop = cellSize > 0 ? Math.ceil(baseline / cellSize) * cellSize : baseline
  const gridId = `bg-grid-${seed}-${cellSize}-${highContrast ? 'hc' : 'std'}`
  const gridBackdrop = showPixel && showGrid && palette?.grid ? (
    <>
      <defs>
        <pattern id={gridId} width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
          {highContrast ? (
            <rect
              x="0"
              y="0"
              width={1.5 * gridWeight}
              height={1.5 * gridWeight}
              fill={palette.grid}
              shapeRendering="crispEdges"
            />
          ) : (
            <path
              d={`M0 0 H${cellSize} M0 0 V${cellSize}`}
              stroke={palette.grid}
              strokeWidth={gridWeight}
              fill="none"
              shapeRendering="crispEdges"
            />
          )}
        </pattern>
      </defs>
      <rect
        x="0"
        y={gridTop}
        width={width}
        height={Math.max(0, height - gridTop)}
        fill={`url(#${gridId})`}
      />
    </>
  ) : null

  return (
    <div ref={layerRef} className={[styles.layer, className].filter(Boolean).join(' ')} aria-hidden="true" data-seed={seed}>
      {/* `color` is set so an authored `currentColor` inside a native symbol
          resolves to the same token the traced face hands it through
          `palette.tokenInk`, rather than to whatever the nav column inherits. */}
      <svg
        className={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={showNative && palette?.tokenInk ? { color: palette.tokenInk } : undefined}
      >
        {/* Backmost: the grid substrate paints before both faces so all ink
            lands on top of it. */}
        {gridBackdrop}
        {nativeDefs}
        {showNative && groupBy(composition.stamps, (s) => s.y).map(([band, entries]) =>
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
            // It is also exactly how the traced face works, for the same reason
            // from the other direction: that face bakes placement into
            // coordinates, so its animated group has no transform attribute to
            // lose. Two ways of arriving at one rule, which is that the animated
            // element and the placed element must not be the same element.
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
        {showVector && groupBy(composition.stamps, (s) => s.y).map(([band, entries]) =>
          wrapIdle(band, entries.map(({ item, i }) => (
            <g key={`s${pass}-${i}`} className={revealing ? styles.stamp : undefined} style={arrival(stampDelays[i])}>
              {pathDataByInk(item.strokes, inkPalette).map(([ink, d], k) => (
                <path
                  key={k}
                  d={d}
                  fill="none"
                  stroke={ink}
                  strokeWidth={markWidths?.[item.markIndex] ?? strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          )), `v${band}`),
        )}

        {showPixel && groupBy(composition.cells, (c) => c.iy * cellSize + cellSize / 2).map(([band, entries]) => {
          const cells = entries.map(({ item, i }) => (
            <rect
              key={`c${pass}-${i}`}
              className={revealing ? (cellReveal === 'scale' ? styles.cellScale : styles.cellPop) : undefined}
              style={arrival(cellDelays[i])}
              x={item.ix * cellSize}
              y={item.iy * cellSize}
              width={cellSize}
              height={cellSize}
              fill={cellFill(item, composition.buckets, inkPalette)}
            />
          ))
          if (!idle) return <g key={`p${band}`}>{cells}</g>
          const t = idle[band % idle.length]
          // The pixel face HOLDS THE GRID. It breathes on opacity only and never
          // takes a positional transform, so it is immune to the Firefox SVG
          // child-transform shimmer and to sub-pixel blur on pixel art.
          return (
            <g
              key={`p${band}`}
              className={styles.breathe}
              style={{
                '--dim': t.dim.toFixed(3),
                animationDuration: `${t.breatheDuration.toFixed(2)}s`,
                animationDelay: `${idleStart}s`,
              }}
            >
              {cells}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export { CHOREOGRAPHY }
