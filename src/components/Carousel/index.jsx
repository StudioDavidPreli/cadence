import { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { motion, animate, useMotionValue } from 'framer-motion'
import { useRive, useViewModel, useViewModelInstance } from '@rive-app/react-webgl2'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useTheme } from '../../context/ThemeContext'
import { useHCContrastColors } from '../../hooks/useHCContrastColors'
import { useRiveSupersampling } from '../../hooks/useRiveSupersampling'
import styles from './Carousel.module.css'

// ─── Slide content ────────────────────────────────────────────────────────────
// Four principles selected because they're directly observable in this
// component's own behavior — the carousel demonstrates what the slides describe.
// Each slide carries an optional `riv` reference: a static Rive image authored
// with the same theme view-model convention as the principle animations
// (ViewModel1 + Light/Dark/Contrast instances), so the slide art tracks the
// active theme. `stateMachine` is the machine name inside the .riv file —
// authored in Rive, not derivable from the title (note the literal "&" in the
// squash file name and machine name). Slides without a `riv` render no
// image; the compact variant ignores `riv` entirely (it omits the placeholder).
const SLIDES = [
  {
    title:       'Follow Through',
    description: 'The drag carries momentum. The snap follows through to rest — overshooting the target before settling, the way a door swings past its frame.',
    riv: { src: '/rive/carouselStatics/followthrough_static.riv', stateMachine: 'followThrough_staticSM' },
  },
  {
    title:       'Slow In / Slow Out',
    description: 'Deceleration on snap imitates physical objects losing energy. Nothing in nature stops instantly. The spring easing makes this visible.',
    riv: { src: '/rive/carouselStatics/slowinslowout_static.riv', stateMachine: 'slowInSlowOut_staticSM' },
  },
  {
    title:       'Squash & Stretch',
    description: 'The drag compresses the stack at boundaries — dragElastic: 0.1 lets the slides yield slightly before pushing back. Resistance communicates the edge. The system has shape.',
    riv: { src: '/rive/carouselStatics/squash&stretch_static.riv', stateMachine: 'squash&stretch_staticSM' },
  },
  {
    title:       'Imitation of Life',
    description: 'Gesture-driven motion earns trust by matching physical intuition. The carousel responds to velocity, not just position — the same way objects do.',
    riv: { src: '/rive/carouselStatics/imitationoflife_static.riv', stateMachine: 'imitationOfLife_staticSM' },
  },
]

// Map ThemeContext theme values to the view model instance names in the .riv
// files. Identical to PrincipleAnimation's map — both high-contrast themes bind
// the single 'Contrast' instance; high-contrast-dark flips its stroke/fill at
// runtime (useHCContrastColors).
const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast-light': 'Contrast',
  'high-contrast-dark': 'Contrast',
}

// ─── SlideImage ───────────────────────────────────────────────────────────────
//
// Isolated useRive boundary for a single slide's static image, one per visible
// slide. Mirrors PrincipleAnimation/RiveCanvas: all Rive hook calls live here,
// not in Carousel, so each canvas's lifecycle is tied to its own element and
// cleaned up correctly as slides mount/unmount. React's only job is theme
// synchronization via the view model instance; the image itself is static.
function SlideImage({ src, stateMachine, theme }) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
    autoBind: false,
  })

  // 2x supersampling: the webgl2 renderer's MSAA is coarser than the old
  // canvas runtime's rasterizer on this thin-stroke art. See the hook.
  useRiveSupersampling(rive)

  const viewModel = useViewModel(rive, { name: 'ViewModel1' })

  // Passing { rive } rebinds the instance whenever the name changes (theme
  // switch). No manual useEffect needed — same pattern as PrincipleAnimation.
  const instance = useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  // high-contrast-dark flips the shared 'Contrast' instance's stroke/fill.
  useHCContrastColors(instance, theme)

  return <RiveComponent className={styles.slideImage} />
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
//
// ── Release-to-advance pattern ────────────────────────────────────────────────
// Nothing commits while the user is dragging. Slide advancement is determined
// at the moment of release (dragEnd), not during the drag. This is the correct
// model for gesture-driven navigation: the user can reconsider mid-drag and
// the system holds its position until they let go.
//
// On release, two thresholds are checked independently:
//
// Velocity threshold (|velocity.x| > 500px/s):
//   Catches fast flicks — the user barely moved the slide but the intent was
//   clear from speed. A flick feels deliberate even if it only travels 20px.
//   Without this threshold, fast flicks would snap back because the offset
//   was small. The system would feel unresponsive to confident gestures.
//
// Offset threshold (|offset.x| > 50px):
//   Catches slow deliberate drags — the user moved the slide far enough to
//   signal intent, even if they did it slowly. Without this threshold, only
//   flicks would advance the slide. Slow deliberate drags by users who want
//   control (older users, accessibility contexts) would be ignored.
//
// Both thresholds are checked because gesture intent has two readable signals:
// speed (I did it quickly) and distance (I moved it far enough). Requiring
// only one would either miss slow drags or require excessive force for flicks.
//
// ── Why spring easing for snap ────────────────────────────────────────────────
// The snap uses ease.overshoot (cubic-bezier(0.34, 1.56, 0.64, 1)) — an
// overshooting curve. This is deliberate:
//
// The overshoot IS the Follow Through.
//
// When you release a physical object (a drawer, a card, a book), it doesn't
// stop exactly where it lands. Momentum carries it past the resting point,
// friction brings it back. Overshoot easing replicates this. The slide
// overshoots the snap target slightly and settles — the same micro-movement
// that makes analog controls feel authoritative.
//
// Ease.standard would produce a cleaner stop but a less believable one.
// The spring overshoot is the difference between a software animation and
// something that feels like it has mass.
//
// ── useMotionValue + useAnimation ────────────────────────────────────────────
// useMotionValue(0) creates the x position that both the drag gesture and the
// snap animation write to. The MotionValue is the single source of truth for
// where the track currently is.
//
// useAnimation() creates imperative animation controls. controls.start({x: N})
// animates the MotionValue from its current position to N, using whatever
// transition is specified. This is the correct tool when the animation target
// is computed at runtime (slide index × measured slide width) rather than
// declared as a fixed animate prop.
//
// useLayoutEffect reads offsetWidth before the first browser paint.
// This avoids a flash of incorrectly-sized slides on the first render —
// slideWidth is set synchronously after DOM commit, so the browser only
// ever paints the correctly-sized layout. A ResizeObserver then keeps the
// measurement live: the carousel is width-responsive (the container query in
// the CSS widens the card when the demo column offers ≥480px), so the slide
// width can change after mount and every snap target moves with it.

// compact: when true, the slide description is omitted and slide padding is
// tightened. Used by the Follow Through principle demo where the carousel sits
// in a ~165 px column inside the principle card. Full slide copy needs ~300 px
// of width to render legibly; squeezing it produces 15+ wrapped lines that
// overflow vertically. In compact mode the slide title plus the dot indicator
// are enough to demonstrate the principle (drag → snap → indicator follows).
// slides defaults to the module-level SLIDES so existing call sites keep
// working. A caller can pass its own array to vary content per instance
// (option 1 from the tracker's carousel note) — the P5 principle demo and the
// TokenLab Gesture tab currently share this default.
export function Carousel({ compact = false, slides = SLIDES }) {
  const tokens      = useMotionTokens()
  const { theme }   = useTheme()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideWidth, setSlideWidth]     = useState(0)

  const containerRef = useRef(null)
  const x            = useMotionValue(0)

  // animRef stores the AnimationPlaybackControls returned by animate() so we
  // can cancel the in-progress snap when a new drag starts or when the component
  // unmounts. Without cancellation, a spring animation that's still running when
  // Carousel unmounts keeps updating the MotionValue — Framer Motion's internal
  // drag subscriptions on x may still be alive, causing stale updates.
  const animRef = useRef(null)

  // Measure the slide width synchronously after the first DOM commit.
  // useLayoutEffect fires before the browser paints, so there is no frame
  // where slides appear at the wrong size. The ResizeObserver keeps the value
  // current afterward — the wide-layout container query changes the carousel's
  // max-width at runtime, and a stale slideWidth would leave every snap target
  // (index × -slideWidth) pointing at the wrong pixel position.
  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    const measure = () => setSlideWidth(node.offsetWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // currentSlide mirrored into a ref so the reposition effect below can read
  // it without listing it as a dependency — depending on currentSlide would
  // re-run the effect on every slide change and jump-cut the animated snap.
  const currentSlideRef = useRef(currentSlide)
  currentSlideRef.current = currentSlide

  // When the measured width changes (container resize, wide-layout breakpoint
  // crossing), jump the track straight to the current slide's new resting
  // position. x.set, not animate: a resize is not a gesture, so the track
  // shouldn't appear to respond to one.
  useEffect(() => {
    if (!slideWidth) return
    animRef.current?.stop()
    x.set(currentSlideRef.current * -slideWidth)
  }, [slideWidth, x])

  // Cancel any running animation on unmount so Framer Motion's internal
  // MotionValue subscriptions (from the drag system) don't receive updates
  // from a spring that's still resolving after the component is gone.
  useEffect(() => {
    return () => { animRef.current?.stop() }
  }, [])

  // ── dragConstraints: useMemo, not inline object ──────────────────────────
  // An inline object literal creates a new reference on every render. Framer
  // Motion uses referential equality to decide whether to recalculate
  // constraints. A new reference on every render triggers a DOM measurement
  // pass that snapshots ALL layout-tracked elements in the tree (tabPill,
  // toggleThumb, etc.). If those snapshots drift from expected positions,
  // Framer Motion fires correction animations on elements that should be idle.
  //
  // useMemo produces a stable reference that only changes when slideWidth
  // changes (once, after the initial useLayoutEffect measurement).
  const dragConstraints = useMemo(
    () => ({ left: -(slides.length - 1) * slideWidth, right: 0 }),
    [slides.length, slideWidth]
  )

  function goToSlide(index) {
    setCurrentSlide(index)
    // Cancel any in-progress snap before starting a new one.
    animRef.current?.stop()
    // Overshoot easing: the overshoot is the Follow Through principle made visible.
    // The slide carries past its resting point and settles — physical momentum.
    // duration.slow matches Stepper's cascade — sequential components share
    // the same token so adjusting duration.slow affects both simultaneously.
    animRef.current = animate(x, index * -slideWidth, {
      duration: tokens.duration.slow,
      ease: tokens.ease.overshoot,
    })
  }

  // dragEnd receives the Framer Motion PanInfo object: { velocity, offset, ... }
  // velocity.x: pixels per second at the moment of release
  // offset.x:   total distance traveled from drag start
  function handleDragEnd(_, info) {
    const { velocity, offset } = info
    let next = currentSlide

    // Advance forward: fast leftward flick OR sufficient leftward distance
    if (velocity.x < -500 || offset.x < -50) {
      next = Math.min(currentSlide + 1, slides.length - 1)
    }
    // Advance backward: fast rightward flick OR sufficient rightward distance
    else if (velocity.x > 500 || offset.x > 50) {
      next = Math.max(currentSlide - 1, 0)
    }
    // Neither threshold met: snap back to current slide

    goToSlide(next)
  }

  const carouselClass = compact
    ? `${styles.carousel} ${styles.carouselCompact}`
    : styles.carousel

  return (
    // The host div is the CSS container the @container query in the module
    // measures. A container query can only respond to an ancestor's size, so
    // the carousel needs a wrapper — it can't query its own width to decide
    // its own max-width.
    <div className={styles.host}>
    <div className={carouselClass}>

      {/* ── Slide viewport ──────────────────────────────────────────────── */}
      {/* overflow:hidden clips the non-active slides out of view. */}
      <div className={styles.viewport} ref={containerRef}>

        <motion.div
          className={styles.track}
          drag="x"
          dragConstraints={dragConstraints}
          // dragElastic: 0.1 — slight resistance at the first and last slide
          // boundaries. Physical but not rubbery. A value of 0 would feel like
          // hitting a wall; 1.0 would feel like dragging through water.
          dragElastic={0.1}
          style={{ x }}
          onDragEnd={handleDragEnd}
        >
          {slides.map((slide, i) => (
            // Each slide is a motion.div so it can animate scale independently.
            // scale.lift (default 1.02) gives the active slide a subtle elevation
            // above its neighbors — physical affordance: the current item is "up."
            <motion.div
              key={i}
              className={styles.slide}
              style={{ width: slideWidth || undefined }}
              animate={{ scale: currentSlide === i ? tokens.scale.lift : 1 }}
              transition={{ duration: tokens.duration.fast, ease: tokens.ease.standard }}
            >
              {/* Image — full mode only. A 4:5 portrait frame holding the
                  slide's static Rive art, which tracks the active theme. The
                  frame renders even if a slide has no `riv` (graceful empty
                  frame). aria-hidden: the title/description carry the meaning. */}
              {!compact && (
                <div className={styles.slidePlaceholder} aria-hidden="true">
                  {slide.riv && (
                    <SlideImage
                      src={slide.riv.src}
                      stateMachine={slide.riv.stateMachine}
                      theme={theme}
                    />
                  )}
                </div>
              )}
              {/* Text. Below the image in the narrow (portrait-card) layout;
                  beside it, on the right, once the container query flips the
                  slide to a row. */}
              <div className={styles.slideText}>
                <h3 className={styles.slideTitle}>{slide.title}</h3>
                {!compact && (
                  <p className={styles.slideDescription}>{slide.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>

      {/* ── Dot indicators ──────────────────────────────────────────────── */}
      {/* Each dot is always rendered — no conditional mounting or layoutId.
          The active dot expands from a circle to a pill via CSS transitions,
          driven by --motion-duration-fast and --motion-ease-overshoot tokens.
          This avoids Framer Motion's layout animation system entirely.
          The layoutId + LayoutGroup approach was removed because LayoutGroup
          does not isolate from the global ProjectionNode tree — it only scopes
          the layoutId namespace. The ongoing spring animation on carouselActiveDot
          was triggering global ProjectionNode snapshots that corrupted the
          opacity animation on newly-mounted tab panels, leaving them at
          opacity: 0 until page reload. CSS transitions are immune to this. */}
      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={styles.dotButton}
            onClick={() => goToSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          >
            <span className={`${styles.dotPip} ${currentSlide === i ? styles.dotPipActive : ''}`} />
          </button>
        ))}
      </div>

    </div>
    </div>
  )
}
