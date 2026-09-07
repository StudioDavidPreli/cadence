// Measure: the reverse-engineering page (build-order item 8). A screen
// recording of one transition comes in, a Cadence token file goes out, with
// the fit's confidence and its blind spots stated in the output.
//
// This section replaces the whole right region like the Glossary does, owns
// its own scroll, and sits outside MotionTokensProvider: nothing here reads a
// --motion-* token. The recording is the demonstration; the page's only motion
// is chrome (hover, the drop zone's highlight), on --feedback-* timing. The
// video preview never autoplays, so reduced motion has nothing to hold still.
//
// Privacy is structural, not a promise: the file goes into a hidden <video>
// through an <input type=file>, the pixels are read on a canvas, and no
// request carries them. The e2e self-test asserts an empty network log.
//
// Copy on this page is drafted against archive/voice/voice-analysis.md and
// awaits David's voice pass. Em-dash count: zero.

import { useEffect, useState } from 'react'
import { useRecording, STATUS } from './useRecording'
import { MeasureTitle } from './MeasureTitle'
import { TracePlot, ProgressPlot } from './TracePlot'
import { NAMED_CURVES } from './measureModel'
import {
  DURATION_SLOTS, CURVE_SLOTS, proposeDurationSlot, proposeCurveSlot,
  buildMeasuredTokens, libraryBezier,
} from './measureExport'
import styles from './Measure.module.css'

const SAMPLES_URL = '/measure-samples/samples.json'
const ms = s => Math.round(s * 1000)

// The plain-language line per confidence label. Frames and separability decide
// the label (measureModel.confidenceFor), never the residual.
const CONFIDENCE_COPY = {
  high: 'Enough frames to name the curve alone.',
  medium: 'Few frames, but the curve reads alone or with one close neighbor.',
  low: 'Too few frames to tell the library apart. The band is the honest number.',
}

// Triggers a client-side download for a text payload. Same pattern as Token
// Lab's export: a Blob, a temporary object URL, a synthetic <a download>.
function downloadTextFile(filename, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function MeasureSection() {
  const rec = useRecording()
  const [samples, setSamples] = useState([])
  const [dragging, setDragging] = useState(false)

  // The sample list is a small JSON beside the recordings; fetched once so the
  // page does not carry three file names it could not verify.
  useEffect(() => {
    let live = true
    fetch(SAMPLES_URL)
      .then(r => (r.ok ? r.json() : { samples: [] }))
      .then(doc => { if (live) setSamples(doc.samples ?? []) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const onFile = file => { if (file) rec.measure(file) }
  const onDrop = event => {
    event.preventDefault()
    setDragging(false)
    onFile(event.dataTransfer?.files?.[0])
  }

  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="Measure">
      <article className={styles.page}>
        <MeasureTitle still={rec.status === STATUS.DECODING || rec.status === STATUS.MEASURING} />
        <p className={styles.lede}>
          Drop a screen recording of one transition and get its tokens back:
          the duration, the curve, and how far the recording can be trusted.
          The file is decoded and measured inside this page. It is never
          uploaded.
        </p>

        <section className={styles.guide} aria-label="Recording guidance">
          <p className={styles.guideRow}>
            <strong>Hold the press.</strong> A click is two transitions back to
            back, the press and the release. A hold puts a pause between them
            so each can be measured on its own.
          </p>
          <p className={styles.guideRow}>
            <strong>Keep the frame tight.</strong> Record the element that
            moves and little else. The page finds the loudest patch of change
            on its own, but a cursor crossing the frame is change too.
          </p>
          <p className={styles.guideRow}>
            <strong>Record at the highest frame rate you can.</strong> At
            sixty frames a second, a hundred-millisecond transition is six
            frames. Every fit below says how many frames it rests on.
          </p>
        </section>

        <label
          className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="video/*"
            className={styles.fileInput}
            data-testid="file"
            onChange={e => onFile(e.target.files?.[0])}
          />
          <span className={styles.dropLabel}>Drop a recording here, or choose a file</span>
          <span className={styles.dropHint}>.mov, .mp4, .webm</span>
        </label>

        {samples.length > 0 && (
          <div className={styles.samples}>
            <span className={styles.samplesLabel}>Or try one of this site&apos;s own:</span>
            {samples.map(sample => (
              <button
                key={sample.id}
                type="button"
                className={styles.sampleButton}
                onClick={() => rec.measureSample(sample)}
                data-testid={`sample-${sample.id}`}
              >
                {sample.label}
              </button>
            ))}
          </div>
        )}

        <StatusLine rec={rec} />

        {rec.result && <Results rec={rec} />}
      </article>
    </div>
  )
}

// One live line under the drop zone. Errors read in plain text-base, no
// accent, per the error-surfaces rule (2026-07-18).
function StatusLine({ rec }) {
  const { status, error, result, file } = rec
  let text = ''
  if (status === STATUS.DECODING) text = 'Decoding the recording and finding what moves.'
  else if (status === STATUS.MEASURING) text = 'Measuring.'
  else if (status === STATUS.EMPTY) text = 'Nothing moved in that recording, so there is nothing to measure.'
  else if (status === STATUS.ERROR) text = `That file could not be read. ${error ?? ''}`.trim()
  else if (status === STATUS.DONE && result) {
    const { meta, fps, segments, sample } = result
    const found = `${segments.length} ${segments.length === 1 ? 'transition' : 'transitions'} found.`
    if (sample) {
      // A stored trace: recorded once, fitted now. Said that way, so the
      // page never implies it decoded a video it did not.
      text = `${sample.label}, recorded ${sample.recorded} from this site's Button: a trace of ${meta.frames} frames at ${fps.toFixed(0)} per second, fitted now. ${found}`
    } else {
      // The decoder retries at slower rates until no frame drops; if drops
      // remain the fit ran on a partial recording and must not read as a
      // measurement.
      const dropped = meta.dropped
        ? ` The decoder dropped ${meta.dropped} frames even at its slowest, so this machine was too busy for a reliable read; try again with less running.`
        : ''
      text = `${file?.name ?? 'Recording'}: ${meta.frames} frames at ${fps.toFixed(0)} per second. ${found}${dropped}`
    }
  }
  return (
    <p
      className={styles.status}
      data-testid="status"
      data-state={status}
      data-dropped={result?.meta?.dropped ?? 0}
      data-attempts={result?.meta?.attempts ? JSON.stringify(result.meta.attempts) : undefined}
      aria-live="polite"
    >
      {text}
    </p>
  )
}

function Results({ rec }) {
  const { result, previewUrl } = rec
  const { region, meta, t, e, thr, segments, sample } = result
  const [selected, setSelected] = useState(0)
  useEffect(() => { setSelected(0) }, [result])

  // A sample carries the truth it was recorded at, shown beside the fit: the
  // self-test, in the open. A dropped file has none.
  const truth = sample?.truth ?? null

  // The region overlay is placed in percentages of the frame, so it holds at
  // any display width. Set as custom properties rather than a computed style
  // object: the stylesheet still owns the drawing, JS only supplies the four
  // numbers it cannot know. A sample's frame is its still; a file's is the
  // video.
  const frame = sample ? sample.still : meta
  const overlayVars = {
    '--rx': `${(region.left / frame.width) * 100}%`,
    '--ry': `${(region.top / frame.height) * 100}%`,
    '--rw': `${(region.width / frame.width) * 100}%`,
    '--rh': `${(region.height / frame.height) * 100}%`,
  }

  return (
    <div className={styles.results}>
      <section className={styles.block} aria-label="The recording">
        <div className={styles.blockHead}>
          <span className={styles.blockTitle}>Recording</span>
          <span className={styles.blockMeta}>
            {sample
              ? `one frame of the recording; measured region ${region.width} × ${region.height} px`
              : `measured region ${region.width} × ${region.height} px, found automatically`}
          </span>
        </div>
        <div className={styles.videoBox}>
          {sample ? (
            <img className={styles.video} src={sample.still.src} width={sample.still.width} height={sample.still.height} alt="" />
          ) : (
            // No autoplay, no loop: the preview plays only when asked, so
            // reduced motion has nothing to suppress here.
            <video className={styles.video} src={previewUrl} controls muted playsInline preload="metadata" />
          )}
          <div className={styles.regionOverlay} style={overlayVars} aria-hidden="true" />
        </div>
        {sample && <p className={styles.small}>{sample.source}</p>}
      </section>

      <section className={styles.block} aria-label="Motion energy">
        <div className={styles.blockHead}>
          <span className={styles.blockTitle}>Motion energy</span>
          <span className={styles.blockMeta}>pixel change per frame; transitions on accent</span>
        </div>
        <TracePlot t={t} e={e} segments={segments} thr={thr} />
      </section>

      {segments.length === 0 && (
        <p className={styles.note}>
          The recording moved, but not in a way that reads as a transition
          between two holds. Try a recording with a pause before and after.
        </p>
      )}

      {segments.map((segment, i) => (
        <TransitionCard
          key={segment.start}
          index={i}
          segment={segment}
          truth={i === 0 ? truth : null}
          selected={selected === i}
          onSelect={() => setSelected(i)}
          selectable={segments.length > 1}
        />
      ))}

      {segments.length > 0 && <Assignment segment={segments[selected]} index={selected} />}
    </div>
  )
}

function TransitionCard({ index, segment, truth, selected, onSelect, selectable }) {
  const best = segment.named[0]
  const others = segment.indistinct.filter(n => n !== best.name)
  const kGap = segment.kform.rms - best.rms
  return (
    <section
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      aria-label={`Transition ${index + 1}`}
      data-testid={`transition-${index}`}
      data-curve={best.name}
      data-ms={ms(best.D)}
      data-band={`${ms(best.band[0])}-${ms(best.band[1])}`}
      data-frames={segment.frames}
      data-confidence={segment.confidence}
      data-indistinct={segment.indistinct.join(',')}
    >
      <div className={styles.cardHead}>
        <span className={styles.blockTitle}>
          Transition {index + 1}
          {index === 1 && ' · the release'}
        </span>
        <span className={styles.blockMeta}>
          {segment.frames} frames · {Math.round(segment.spanMs)} ms of visible motion
        </span>
      </div>

      <div className={styles.cardBody}>
        <ProgressPlot segment={segment} curve={best} />
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Curve</dt>
            <dd className={styles.factValue}>
              <code className={styles.chip}>{best.name}</code>
              {others.length > 0 && (
                <span className={styles.factNote}>could not rule out {others.join(', ')}</span>
              )}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Duration</dt>
            <dd className={styles.factValue}>
              {ms(best.D)} ms
              <span className={styles.factNote}>band {ms(best.band[0])} to {ms(best.band[1])} ms</span>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Confidence</dt>
            <dd className={styles.factValue}>
              {segment.confidence}
              <span className={styles.factNote}>{CONFIDENCE_COPY[segment.confidence]}</span>
            </dd>
          </div>
          {truth && (
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Recorded at</dt>
              <dd className={styles.factValue}>
                {truth.durationFast}, <code className={styles.chip}>{truth.pressDown}</code>
                <span className={styles.factNote}>the tokens live when this sample was captured</span>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <p className={styles.small}>
        Free-form curve: [{segment.free.bezier.map(v => v.toFixed(2)).join(', ')}] at {ms(segment.free.D)} ms
        {segment.free.underdetermined
          ? `, underdetermined at ${segment.samples} samples. A hint, not a result.`
          : `, nearest to ${segment.free.nearest}.`}
        {' '}Symmetric null model: k {segment.kform.k.toFixed(2)}
        {kGap > 0.005 ? ', a worse fit than the library.' : ', as good as the library, so the shape is not resolved.'}
      </p>
      {index === 1 && (
        <p className={styles.small}>
          A release usually rides an overshoot, and an overshoot past rest on a
          small element is under a pixel. Read this one loosely.
        </p>
      )}
      {selectable && (
        <button type="button" className={styles.selectButton} onClick={onSelect} aria-pressed={selected}>
          {selected ? 'Selected for export' : 'Use this transition'}
        </button>
      )}
    </section>
  )
}

// Where the two measured values land in a token document. The proposal is the
// nearest slot by value and the fitted curve's own name; the user confirms or
// changes both. The file carries only these two keys.
function Assignment({ segment, index }) {
  const best = segment.named[0]
  const [durationSlot, setDurationSlot] = useState(() => proposeDurationSlot(ms(best.D)))
  const [curveSlot, setCurveSlot] = useState(() => proposeCurveSlot(best.name))
  const [curveSource, setCurveSource] = useState('library')
  useEffect(() => {
    setDurationSlot(proposeDurationSlot(ms(best.D)))
    setCurveSlot(proposeCurveSlot(best.name))
    setCurveSource('library')
  }, [best.D, best.name])

  const bezier = curveSource === 'free' ? segment.free.bezier : libraryBezier(best.name)
  const download = () => {
    downloadTextFile('cadence.measured.json', buildMeasuredTokens({
      durationSlot, durationMs: ms(best.D), curveSlot, bezier,
    }))
  }

  return (
    <section className={styles.assign} aria-label="Assign and export">
      <div className={styles.blockHead}>
        <span className={styles.blockTitle}>Export transition {index + 1}</span>
        <span className={styles.blockMeta}>two measured values, into a Cadence token file</span>
      </div>
      <div className={styles.assignRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>duration.</span>
          <select className={styles.select} value={durationSlot} onChange={e => setDurationSlot(e.target.value)}>
            {DURATION_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
          </select>
          <span className={styles.fieldValue}>= {ms(best.D)}ms</span>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>easing.</span>
          <select className={styles.select} value={curveSlot} onChange={e => setCurveSlot(e.target.value)}>
            {CURVE_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
          </select>
          <span className={styles.fieldValue}>
            = {curveSource === 'free' ? 'the free-form curve' : `${best.name} (${NAMED_CURVES[best.name].join(', ')})`}
          </span>
        </label>
        {!segment.free.underdetermined && (
          <label className={styles.checkField}>
            <input
              type="checkbox"
              checked={curveSource === 'free'}
              onChange={e => setCurveSource(e.target.checked ? 'free' : 'library')}
            />
            <span>Export the free-form curve instead of the library one</span>
          </label>
        )}
      </div>
      <button type="button" className={styles.download} onClick={download} data-testid="download">
        Download cadence.measured.json
      </button>
      <p className={styles.small}>
        Only these two keys are in the file. Importing it in Token Lab fills the
        rest from Standard and lists them as filled, so the document says what
        was measured and what was not.
      </p>
    </section>
  )
}
