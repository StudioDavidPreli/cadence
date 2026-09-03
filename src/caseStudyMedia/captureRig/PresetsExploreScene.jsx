import { useEffect, useReducer, useRef, useState } from 'react'
import {
  EasingSection,
  SpringSection,
  DurationSection,
} from '../../components/TokenLab'
import { Button } from '../../components/Button'
import { ActiveTokenProvider } from '../../context/ActiveTokenContext'
import { INITIAL_STATE, BUILT_IN_PRESETS, reducer } from 'cadence-tokens'
import rigStyles from './CaptureRig.module.css'

// ─── PresetsExploreScene (V01 material, David's spec 2026-08-11) ─────────────
//
// Presets and Explore mode, argued with the tool bar's own controls and nothing
// else. Three token families sit side by side as opaque panels, and every beat
// moves all three at once: the curve bends, the settle curve slackens, the four
// duration thumbs slide. One state change, the whole system retimed. That
// simultaneity is the claim, and it is why the plate holds three panels rather
// than one section at a time.
//
// Four beats, looping closed on their own:
//
//   Standard → Snappy → Cinematic → Explore
//
// The fourth is a state no preset could hold: every value in EXPLORE_STATE sits
// outside its constrained range and inside its explore range, so it exists only
// because the ranges opened. The durations are the semantic ladder run
// backwards, `fast` at 1800ms and `slower` at 80ms. The names stop describing
// the values, which is the argument the whole tool is making: the labels are
// conventions, not laws, and systematizing motion organizes it rather than
// fencing it in. See EXPLORE_STATE for how each number was chosen.
//
// Nothing in frame is labelled. There is no preset row, no toggle, no title
// (David's reconfiguration, 2026-08-11): the clip is the controls moving, and
// the names belong to the edit, where they can be timed against the voiceover
// instead of competing with the graphs. What is left in the plate is three
// panels and the values inside them.
//
// The sections are the shipped ones, extracted from TokenLab for this scene the
// way ExportSection was extracted for the export scene, and the rig runs the
// real reducer, so a beat here is the state transition it is in the app. Two
// props trim them for the camera, both defaulting to the app's behavior and
// both passed only from here:
//
//   - EasingSection display. The section becomes a readout: the curve, and its
//     four numbers under it. No tabs, no curve grid, no drag, and the plot's
//     bounds locked so the grid cannot resize between beats. Every one of those
//     was a moving part, and a frame that steps presets has to hold still
//     everywhere the presets are not (David, 2026-08-11).
//   - DurationSection showVisualizer={false}. Four token sliders, per David's
//     spec. It also takes the tallest thing in the bar out of the plate, which
//     is what let the panels grow from 1.32 to 1.7.
//
// The panels are opaque because they have to be. The field behind them is a
// flat key color (a screen recording carries no alpha, so the container tint
// has to be drawn in the composite instead), which means anything not sitting
// on an opaque surface would key out along with it.
//
// One thing visible in frame that is not a rig bug: Snappy's duration.slower is
// 350ms, below its constrained minimum of 400, so that thumb pins at zero while
// its readout says 350. It is the tool telling the truth about a preset that
// steps outside its own band, and it makes the Explore beat land harder.

// ── Take knobs ──────────────────────────────────────────────────────────────
// Same plate as rive-embed: the red area of riveBlockReference.png, 1728 x 864
// centered in 1920 x 1080. Do not change without re-measuring.
const PLATE = { w: 1728, h: 864 }
const SHOW_CROP_GUIDE = true
// What fills the rig window behind the plate. Unlike rive-embed this scene
// defaults to 'key': the panels carry their own opaque surface, so everything
// that is not a panel is matte and there is nothing left to preview a tint
// against.
const BACKDROP = 'key'
// Red, per David's spec. Nothing in the four themes, the syntax palette or the
// accent role is red, so no part of the tool falls into the matte. The two
// greens in frame (the accent curve and the delay dots) are the furthest thing
// from it on the wheel, which is the easiest pull a keyer can be given.
const KEY_COLOR = '#ff0000'
// Zero, so the container contributes nothing and the key color is uniform under
// everything. Raise it only to preview how the tint will read in the composite;
// a tinted container cannot be keyed cleanly and must not be recorded.
const CONTAINER_TINT = 0
// Scale, never resize: the sections lay out at their shipped geometry (the tool
// bar column is 300px) and the browser rasterizes them crisp.
//
// With the preset row gone and the duration visualizer with it, WIDTH is now
// what binds rather than height. Three panels at 300 * 1.7 come to 1530 of the
// plate's 1632 inner width, leaving 51px in each of the two gaps. Going higher
// closes those gaps before it runs out of vertical room, so 1.7 is close to the
// ceiling no matter what the fit readout says about height.
const COLUMN_SCALE = 1.7
// The tool bar's own column width. The sections are authored for it.
const BAR_WIDTH = 300
// 'stretch' makes the three panels one even band, top to bottom of the plate,
// with each section's content sitting at the top of its own panel. 'flex-start'
// lets each panel stop at its content, which leaves three cards of different
// heights. Duration is now four sliders and much the shortest, so the two read
// quite differently: the band is the steadier shape to composite over a moving
// background, the cards are the more dynamic one.
const PANEL_ALIGN = 'stretch'
// Rest on each beat. Explore gets longer: it is the only beat asking the viewer
// to read numbers rather than watch shapes move.
const HOLD_MS = 3000
const EXPLORE_HOLD_MS = 4200

// ── The Explore demonstration set (David's spec 2026-08-11) ─────────────────
//
// A fourth state, authored for this clip, that no preset could hold: every
// value below sits OUTSIDE its constrained range and inside its explore range.
// That is the whole demonstration. In constrained mode these sliders would pin
// at their ends; explore is what lets them land where they land.
//
// The durations are the semantic ladder run backwards. `fast` is 1800ms and
// `slower` is 80ms, which is the illustration TokenLab's own explore comment
// gives ("a user setting duration.slower to 50ms is previewing what a component
// looks like if piped to duration.fast instead"). The names stop describing the
// values, and that is the argument: the labels are conventions, not laws. On a
// flat 0 to 2000 track the four thumbs read as a descending staircase, the
// exact inverse of what the three presets show.
//
// The spring is the rubber ball the constrained band exists to exclude. Its own
// comment says the constrained ranges cover "a legible arrival, a little
// bounce, not a rubber ball and not a door-closer", so the demonstration set
// goes and gets the rubber ball. Stiff (1120, over the 800 ceiling), light
// (0.2, under the 0.5 floor) and barely damped (6, under the 8 floor) puts the
// damping ratio at 0.20: about 53% overshoot and a few visible rings, which
// plots as something legibly different rather than as noise. The visualizer
// rescales its own axes, so nothing here can overflow the plot.
//
// The easing slot is a curve with no name: it anticipates below zero and
// overshoots to a 1.45 handle, past the 1.25 ceiling of the normal coordinate
// space. It is the one value here that constrained mode could also reach (a
// curve is dragged, not ranged), and it earns its place by making the same
// point in the other direction: a curve that cannot be named cannot be
// systematized. Its 1.45 handle sits above the locked plot and draws there,
// outside the frame: the bounds are the reference, the handles are free.
//
// Scale and delay are inverted on the same principle. Neither is in frame, but
// a demonstration state with a tidy half is not a demonstration state.
const EXPLORE_STATE = {
  duration: { fast: 1800, base: 1200, slow: 150, slower: 80 },
  easing: { standard: [0.85, -0.04, 0.12, 1.45], enter: 'enter', exit: 'exit', overshoot: 'overshoot' },
  delay: { short: 1600, medium: 1100, long: 90 },
  scale: { pressSubtle: 1.15, pressBase: 0.55, pressExpressive: 1.1, lift: 0.62 },
  spring: { stiffness: 1120, damping: 6, mass: 0.2 },
  // Held at 1 like every preset. Its only consumer is the duration visualizer,
  // which this scene does not render, so a value here would do nothing.
  scalar: 1,
}

// The four beats.
//
// Every beat carries BOTH a state and a mode, rather than some beats loading
// values and others flipping a switch. Explore is the only beat with the mode
// on, so returning to Standard has to turn it back off, and a beat that only
// said "load Standard" would leave the ranges wide and the loop would not close
// on its first frame.
const preset = (id) => BUILT_IN_PRESETS.find((p) => p.id === id).state
const STEPS = [
  { id: 'standard', label: 'Standard', state: preset('standard'), explore: false },
  { id: 'snappy', label: 'Snappy', state: preset('snappy'), explore: false },
  { id: 'cinematic', label: 'Cinematic', state: preset('cinematic'), explore: false },
  { id: 'explore', label: 'Explore', state: EXPLORE_STATE, explore: true, hold: EXPLORE_HOLD_MS },
]

// The three families that carry a graph. Scale and Delay are slider-only and
// move least between presets, so they would spend the clip being quiet.
//
// Easing takes `display: true` (the readout mode: curve and caption, no tabs,
// no drag); Duration takes `showVisualizer: false` (sliders without the plot).
// The per-section props ride in the table rather than in branches at the call
// site.
const COLUMNS = [
  { label: 'Easing', Section: EasingSection, props: { display: true } },
  { label: 'Spring', Section: SpringSection, props: {} },
  { label: 'Duration', Section: DurationSection, props: { showVisualizer: false } },
]

export function PresetsExploreScene() {
  // The real reducer, from the real initial state. The rig drives it with the
  // same two actions the app's preset row and Explore toggle dispatch.
  const [rawState, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [exploreMode, setExploreMode] = useState(false)
  const [index, setIndex] = useState(0)
  const [running, setRunning] = useState(false)

  const step = STEPS[index]
  const advance = () => setIndex((i) => (i + 1) % STEPS.length)

  // Beats are applied from the index rather than from the click handler, so the
  // auto-cycle and the manual step button cannot drift into different states.
  // Each beat is a full assignment (state AND mode), so it is idempotent, which
  // is what makes Strict Mode's double-invoked mount effect harmless here.
  //
  // Both writes land in one render, so the sliders never show explore values on
  // constrained tracks: that intermediate would pin every thumb at an end for a
  // frame, which is the one frame this clip must not contain.
  useEffect(() => {
    const s = STEPS[index]
    setExploreMode(s.explore)
    dispatch({ type: 'LOAD_PRESET', payload: s.state })
  }, [index])

  useEffect(() => {
    if (!running) return
    // Read off STEPS rather than the derived `step`, so the effect depends on
    // the index alone. `step` is a fresh object every render; naming it here
    // would put an unstable value in the dependency list to say something the
    // index already says.
    const id = setTimeout(advance, STEPS[index].hold ?? HOLD_MS)
    return () => clearTimeout(id)
  }, [running, index])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setRunning((r) => !r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Same self-measure the rive-embed scene carries, for the same reason: a
  // column that runs past the plate is clipped, and it loses its bottom rows,
  // which is where two of the three graphs live. The arithmetic is tight enough
  // that it should not be trusted.
  //
  // The measurement is a rect comparison, not scrollHeight. The columns have no
  // fixed height of their own, so they never scroll; the clipping happens one
  // level up, at the plate's overflow. And they are transformed, so their layout
  // box is the unscaled 300px one while getBoundingClientRect reports the box
  // actually painted, which is the one that either fits or does not.
  //
  // It runs per beat, after a settle delay, because Explore mode adds the
  // Overshoot tab to Easing and the section heights animate on the chrome
  // constant. Measuring in a layout effect would catch them mid-collapse and
  // report an overflow that resolves a moment later.
  //
  // Sticky once tripped: the operator is watching the plate, not the strip, and
  // a warning that clears itself on the next beat is a warning nobody sees.
  const plateRef = useRef(null)
  const columnRefs = useRef([])
  const [overflow, setOverflow] = useState(null)
  const [fit, setFit] = useState(null)
  useEffect(() => {
    const id = setTimeout(() => {
      const plate = plateRef.current
      if (!plate) return
      const pad = parseFloat(getComputedStyle(plate).paddingBottom) || 0
      const limit = plate.getBoundingClientRect().bottom - pad
      const fits = []
      const over = columnRefs.current
        .map((el, i) => {
          if (!el) return null
          const rect = el.getBoundingClientRect()
          // The largest COLUMN_SCALE this column would still fit at. The
          // painted height is natural * scale, so the natural height is
          // recoverable by dividing it back out, and the room available is
          // whatever sits between the column's top and the plate's inner floor.
          fits.push(((limit - rect.top) / (rect.height / COLUMN_SCALE)))
          const past = Math.round(rect.bottom - limit)
          return past > 1 ? `${COLUMNS[i].label} +${past}px` : null
        })
        .filter(Boolean)
      // Reported every beat, not only on failure. Knowing there is 0.2 of
      // headroom left is what tells the operator whether the next beat (Explore
      // adds a tab to Easing) is going to be the one that clips.
      const headroom = fits.length ? Math.min(...fits) : null
      if (over.length) {
        setOverflow(`${STEPS[index].label}: ${over.join(', ')} · fits at COLUMN_SCALE ${headroom.toFixed(2)}`)
      } else if (headroom !== null) {
        // Kept at the tightest beat seen, not the current one: the number is
        // only useful if it is the scale that fits ALL of them.
        setFit((prev) => (prev === null ? headroom : Math.min(prev, headroom)))
      }
    }, 700)
    return () => clearTimeout(id)
  }, [index, exploreMode])

  return (
    // The sections' SliderRows call useSetActiveToken, whose context defaults to
    // null. Nothing in this scene touches a slider, but a focus event would be
    // enough to call null, so the real provider goes over the whole stage.
    <ActiveTokenProvider>
      <div className={rigStyles.stage}>
        {/* Above the crop line: frame the recording on the plate below. */}
        <header className={rigStyles.hint}>
          capture rig · presets-explore · Space {running ? 'stops' : 'starts'} the cycle · or step
          below · plate {PLATE.w}×{PLATE.h} centered in 1920×1080 · backdrop {BACKDROP}
          {' '}· COLUMN_SCALE {COLUMN_SCALE}
          {fit !== null && !overflow && ` (fits up to ${fit.toFixed(2)})`}
          {overflow && (
            <strong className={rigStyles.overflowWarn}> · column clips: {overflow}</strong>
          )}
        </header>

        <div className={rigStyles.triggerRow}>
          <span className={rigStyles.compareSub}>beat {index + 1}/{STEPS.length}</span>
          <Button onClick={advance}>{step.label}</Button>
        </div>

        <div
          className={`${rigStyles.plateWrap} ${rigStyles[`backdrop_${BACKDROP}`]}`}
          style={{ '--key-color': KEY_COLOR }}
        >
          <div
            ref={plateRef}
            className={`${rigStyles.presetsPlate} ${SHOW_CROP_GUIDE ? rigStyles.plateGuide : ''}`}
            style={{
              width: PLATE.w,
              height: PLATE.h,
              '--container-tint': CONTAINER_TINT,
              // Set once on the plate and inherited by every wrapper below, so
              // the CSS can reserve painted widths (calc(bar * scale)) without
              // each element restating the numbers.
              '--bar-width': `${BAR_WIDTH}px`,
              '--column-scale': COLUMN_SCALE,
            }}
          >
            <div className={rigStyles.presetsColumns} style={{ alignItems: PANEL_ALIGN }}>
              {COLUMNS.map(({ label, Section, props }, i) => (
                <div key={label} className={rigStyles.presetsColumn}>
                  <div
                    ref={(el) => { columnRefs.current[i] = el }}
                    className={rigStyles.presetsColumnScale}
                  >
                    {/* type-eyebrow is the role the real section headers compose,
                        so the column titles read as the bar's own. No chevron:
                        these do not collapse, and drawing one would promise a
                        control that is not there. */}
                    <div className={rigStyles.presetsColumnLabel}>{label}</div>
                    <div className={rigStyles.presetsColumnBody}>
                      <Section
                        rawState={rawState}
                        dispatch={dispatch}
                        exploreMode={exploreMode}
                        {...props}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ActiveTokenProvider>
  )
}
