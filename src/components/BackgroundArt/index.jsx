import { useEffect, useMemo, useRef, useState } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { backgroundIdlePeriodSeconds } from '../../utils/feedbackDuration'
import { growArmature, RULESETS } from '../../background/lsystem'
import { densityMap, aggregate, AGGREGATION } from '../../background/raster'
import { samplePlacements, composeStamps, strokesOf, COMPOSE } from '../../background/compose'
import { GLYPHS } from '../../background/glyphs'
import {
  bandOf,
  revealDelays,
  revealTiming,
  idleTimings,
  idleStartSeconds,
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
// editable --motion-* tokens and a preset change retimes it. The idle is
// infinite, so it is chrome: it reads the fixed
// --feedback-background-idle-period and Explore mode cannot touch it. Neither
// carries a literal. See docs/briefings/background_system_rulings.md section 1.
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
const TOKEN_INK_KEY = 'currentColor'

function inkKeyOf(stroke) {
  return stroke.tokenBound ? TOKEN_INK_KEY : (stroke.color || null)
}

function inkFromKey(key, palette) {
  if (palette.blanket) return palette.blanket                 // high contrast repaints all
  if (!key || key === TOKEN_INK_KEY) return palette.tokenInk  // authored `currentColor`
  return key
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
// built from ~90 rects is ~90 subpaths, so a 120-stamp composition drew 10,683
// path elements in a nav column that is on screen for the whole session.
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
// It is not free. Measured on the Token Lab library at seed 4242: 2,546
// elements against 546 for the unordered version, still well down from the
// 10,683 this replaced. The gap is the price of not reordering paint, and it is
// worth paying on art whose overlaps have not been audited.
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
  budget = 120,
  stampScale = 0.21,
  alignFlow = true,
  highContrast = false,
  palette,
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
  const tokens = useMotionTokens()

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
    const markReach =
      (GLYPHS.span / 2) * Math.SQRT2 * stampScale * (1 + COMPOSE.scaleVariance) +
      14 * COMPOSE.jitter
    const density = densityMap(armature.lines, {
      cell: 14,
      width,
      height,
      baseline: baseline + markReach,
      fade: clearanceFade,
    })

    // High contrast carries a reduced budget alongside its two tone levels:
    // the HC themes have no quiet gray to spend on a dense field.
    const { placements } = samplePlacements(density.cells, {
      seed,
      budget: Math.round(budget * (highContrast ? 0.6 : 1)),
      markCount: library.length,
      scale: stampScale,
      cellSize: 14,
      alignFlow,
    })

    const { stamps } = composeStamps(placements, library)
    const buckets = highContrast ? AGGREGATION.bucketsHighContrast : AGGREGATION.buckets
    // Aggregate on the ink KEY, not the authored color, so the dominant-ink
    // decision is theme-independent and both faces resolve it the same way at
    // paint time. See the note above inkFromKey.
    const keyed = strokesOf(stamps).map((stroke) => ({ ...stroke, color: inkKeyOf(stroke) }))
    const cells = aggregate(keyed, { cell: cellSize, width, height, buckets })

    return { stamps, cells: cells.cells, buckets, stats: cells.stats }
  }, [width, height, library, seed, ruleset, roots, baseline, clearanceFade,
      cellSize, budget, stampScale, alignFlow, highContrast])

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
      periodSeconds: prefersReduced ? 0 : backgroundIdlePeriodSeconds(),
      seed,
      reducedMotion: prefersReduced,
    }),
    [seed, prefersReduced],
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

  const revealedRef = useRef(false)
  const [revealing, setRevealing] = useState(true)
  useEffect(() => {
    if (revealedRef.current) return
    const settleMs = (timing.windowSeconds + timing.stampDuration) * 1000
    const timer = setTimeout(() => {
      revealedRef.current = true
      setRevealing(false)
    }, settleMs)
    return () => clearTimeout(timer)
    // Mount only. Deliberately not keyed on the timing values: a token edit
    // mid-reveal must not restart this clock, or dragging a duration slider
    // would hold the background permanently in its arrival state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <svg className={styles.svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Backmost: the grid substrate paints before both faces so all ink
            lands on top of it. */}
        {gridBackdrop}
        {showVector && groupBy(composition.stamps, (s) => s.y).map(([band, entries]) =>
          wrapIdle(band, entries.map(({ item, i }) => (
            <g key={`s${i}`} className={revealing ? styles.stamp : undefined} style={arrival(stampDelays[i])}>
              {pathDataByInk(item.strokes, palette).map(([ink, d], k) => (
                <path
                  key={k}
                  d={d}
                  fill="none"
                  stroke={ink}
                  strokeWidth="1.3"
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
              key={`c${i}`}
              className={revealing ? (cellReveal === 'scale' ? styles.cellScale : styles.cellPop) : undefined}
              style={arrival(cellDelays[i])}
              x={item.ix * cellSize}
              y={item.iy * cellSize}
              width={cellSize}
              height={cellSize}
              fill={cellFill(item, composition.buckets, palette)}
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
