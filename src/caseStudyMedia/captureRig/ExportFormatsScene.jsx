import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ExportSection } from '../../components/TokenLab'
import {
  INITIAL_STATE,
  toDtcgJson,
  toFlatJson,
  toCssVars,
  toFramerMotion,
} from '../../data/motionPresets'
import { Button } from '../../components/Button'
import { ScrambleCode } from './ScrambleCode'
import rigStyles from './CaptureRig.module.css'

// ─── ExportFormatsScene (V01 material, David's spec 2026-08-10) ──────────────
//
// The Token Lab Export section stepping through its four output formats, with
// the file each one actually produces beneath it. Export is the one place the
// token state leaves the app as an artifact, and no capture has ever shown it.
//
// The composition answers a hard constraint: this footage is a plate in a 3D
// composite (exportScene/sceneMap/exportMap.png), and the plate is 864 x 978
// inside a 1920 x 1080 frame. Portrait, so the layout stacks rather than
// sitting side by side, and the panel below gets the tall remainder.
//
// The trigger is a single step button above the crop line, so the recording
// never contains the pointer that drives it. It advances the format only: the
// rig never clicks Export or Copy, because a download shelf or a clipboard
// permission prompt would land in frame.
//
// Token state is INITIAL_STATE (the Standard preset). Nothing else moves; the
// format toggle is the whole subject.

// ── Take knobs ──────────────────────────────────────────────────────────────
// Adjust between takes. PLATE comes from the scene map and should not change
// without re-measuring it.
const PLATE = { w: 864, h: 978 }
// Outlines the plate so the crop is unambiguous. Off for the real take.
const SHOW_CROP_GUIDE = true
// The shipped Export section is a 300px tool-bar column. Scale, never resize:
// the component lays out at its shipped geometry and the browser rasterizes it
// crisp, the same reasoning .compareStage and .principleStage carry.
const CONTROL_SCALE = 2
// The code panel is NOT scaled. It is rig furniture, so it sets type directly;
// scaling it would tie font size to panel size, and the number that matters
// here is rows per panel.
const CODE_FONT_PX = 14
const CODE_LINE_HEIGHT = 1.5
// 34 rows is chosen against the real outputs: CSS (28 lines) and Flat (33) sit
// whole with headroom, FM (45) and DTCG (123) overflow into the bottom fade.
// Two fitting and two not is the argument the clip makes without a caption.
const VISIBLE_LINES = 34
// Rest on each format before the auto-cycle steps.
const HOLD_MS = 3000
// Total length of one scramble-to-snap transition.
const SCRAMBLE_MS = 700
// Fraction of the transition a single character spends scrambling.
const SETTLE_SPAN = 0.35
// Glyph re-roll rate. Deliberately below the frame rate: the noise should read
// as digital, not as a dropped frame.
const SCRAMBLE_FPS = 24
// Characters shared between the old and new text at the same position skip the
// scramble entirely, so common structure holds still while the rest churns.
const HOLD_MATCHING = true

// The four formats in step order, each with the stringifier that produces it
// and the grammar the panel highlights it with. The language field is the
// reason this table lives here rather than in ExportSection: the app has no
// use for it.
const FORMATS = [
  { key: 'dtcg', stringify: toDtcgJson,     language: 'json' },
  { key: 'flat', stringify: toFlatJson,     language: 'json' },
  { key: 'css',  stringify: toCssVars,      language: 'css' },
  { key: 'fm',   stringify: toFramerMotion, language: 'javascript' },
]

export function ExportFormatsScene() {
  const [index, setIndex] = useState(0)
  const [running, setRunning] = useState(false)

  // A CSS transform paints outside the layout box without enlarging it, so the
  // scaled control still occupies only its 300px-wide, unscaled-height slot and
  // the code panel would ride up underneath it. Measuring the transformed
  // element (getBoundingClientRect reports the SCALED box) and reserving that
  // height keeps the stack honest without hard-coding a number that would go
  // stale the moment the section's padding changes.
  const controlRef = useRef(null)
  const [controlHeight, setControlHeight] = useState(0)
  useLayoutEffect(() => {
    const el = controlRef.current
    if (!el) return
    // Measured live, not once: the mono webfont lands after first layout and
    // shifts the section's natural height by a few pixels, and a stale band
    // height overlaps or gaps the code panel inside a plate that composites
    // 1:1 into footage. ResizeObserver tracks any reflow, fonts included.
    const measure = () => setControlHeight(el.getBoundingClientRect().height)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const step = () => setIndex((i) => (i + 1) % FORMATS.length)

  useEffect(() => {
    if (!running) return
    const id = setInterval(step, HOLD_MS)
    return () => clearInterval(id)
  }, [running])

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

  const format = FORMATS[index]
  const text = format.stringify(INITIAL_STATE)

  return (
    <div className={rigStyles.stage}>
      {/* Above the crop line: frame the recording on the plate below. */}
      <header className={rigStyles.hint}>
        capture rig · export-formats · Space {running ? 'stops' : 'starts'} the cycle · or step below · plate {PLATE.w}×{PLATE.h}, record at 2x
      </header>

      <div className={rigStyles.triggerRow}>
        <span className={rigStyles.compareSub}>step</span>
        <Button onClick={step}>{format.key}</Button>
      </div>

      <div className={rigStyles.plateWrap}>
        <div
          className={`${rigStyles.plate} ${SHOW_CROP_GUIDE ? rigStyles.plateGuide : ''}`}
          style={{ width: PLATE.w, height: PLATE.h }}
        >
          {/* The real shipped component, driven from out here so the panel
              beneath it can show the same format's output. */}
          <div className={rigStyles.controlBand} style={{ height: controlHeight || undefined }}>
            <div
              ref={controlRef}
              className={rigStyles.exportControl}
              style={{ '--control-scale': CONTROL_SCALE }}
            >
              <ExportSection
                rawState={INITIAL_STATE}
                format={format.key}
                onFormatChange={(key) => setIndex(FORMATS.findIndex((f) => f.key === key))}
              />
            </div>
          </div>

          <div
            className={rigStyles.codePanel}
            style={{
              fontSize: `${CODE_FONT_PX}px`,
              lineHeight: CODE_LINE_HEIGHT,
              // Height is derived from the row count rather than authored, so
              // changing VISIBLE_LINES cannot leave a half row peeking under
              // the fade.
              height: `calc(${VISIBLE_LINES} * ${CODE_FONT_PX * CODE_LINE_HEIGHT}px + 28px)`,
            }}
          >
            <ScrambleCode
              text={text}
              language={format.language}
              visibleLines={VISIBLE_LINES}
              scrambleMs={SCRAMBLE_MS}
              settleSpan={SETTLE_SPAN}
              scrambleFps={SCRAMBLE_FPS}
              holdMatching={HOLD_MATCHING}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
