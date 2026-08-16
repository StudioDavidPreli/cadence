import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  tokenizeLines,
  lineCharClasses,
  renderRuns,
  syntaxStyles,
} from '../../components/CodeBlock/highlight'
// Side effect only: registers the json and css grammars the scenes tokenize
// with. Must be imported before the first tokenizeLines('...', 'json') call;
// module order guarantees it.
import './highlightExtras'
import rigStyles from './CaptureRig.module.css'

// ─── ScrambleCode (V01 export scene, David's spec 2026-08-10) ────────────────
//
// A fixed-height code panel whose contents randomize per character and then
// snap into the new text. Rig-local: it is a camera effect for one clip, not
// shipped UI. What it does borrow is the shipped syntax palette — it renders
// spans with CodeBlock's own --color-syntax-* classes (see ./highlight.jsx),
// so the four export formats read in the tool's colors and not in an
// invented set.
//
// The row model. The panel shows a fixed number of rows and each row morphs
// independently from the old text at that index to the new text at that index.
// A row with no predecessor grows from empty and one with no successor sheds
// to empty, so CSS (28 lines) becoming DTCG (123 lines) is the same code path
// as any other change. Rows past visibleLines are never computed; the panel
// clips into a fade and the overflow is the point (DTCG is verbose because it
// is machine interchange).
//
// Color resolves in place. Prism runs once per text change, not per frame, and
// every character position carries its DESTINATION class from the moment it
// starts scrambling. So a value is already the right color while its glyphs
// are still noise, and the snap is a snap of shape, not of palette.

// Noise alphabet: the union of characters across the four real export outputs,
// minus the space (a space in the noise reads as a hole in the row, not as
// churn). Measured from the stringifiers, not invented, so scrambled text
// still looks like the thing it is turning into.
//
// The default, not the only one. A caller whose text is a different document
// passes its own measured set through the `charset` prop — the rive-embed
// scene does, because JSX carries angle brackets and camelCase that no export
// format contains, and noise drawn from the wrong alphabet reads as a
// different language churning into this one.
const DEFAULT_CHARSET = `"$'(),-./0123456789:;=BCEFGILMST[]abcdefghiklmnoprstuvwxyz{}`

// Deterministic 32-bit hash of small integers. Every random-looking number here
// comes from this, never from Math.random(): a per-frame random would re-roll
// each character's settle schedule on every frame and the effect would churn
// forever instead of resolving. Seeded on (row, col) it is stable for a whole
// transition, and adding a tick to the seed is what makes the glyph itself
// change over time while the schedule stays put.
function hash(a, b, c = 0) {
  let h = (a * 0x27d4eb2d) ^ (b * 0x165667b1) ^ (c * 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

const hash01 = (a, b, c = 0) => hash(a, b, c) / 0x100000000

// Ease on the row-length interpolation, so a row that grows or shrinks does not
// change width at a constant rate. easeInOutCubic, written out rather than read
// from a token: this is rig chrome for a camera, not app motion, and it drives
// a character count rather than a style property.
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

// What the panel is showing at the moment a transition is interrupted: each
// row's length is the interpolated length, its content the old target's text
// truncated or space-padded to that length. Settled positions were already
// showing target characters and unsettled ones are noise the next transition
// re-rolls anyway, so LENGTH is what must carry over — a from-text that
// snapped back to the old target's full width at an interrupt made every
// changing row visibly jump mid-take.
function synthesizeFrom(fromText, targetText, progress) {
  const fromLines = fromText.split('\n')
  const targetLines = targetText.split('\n')
  const p = ease(progress)
  const n = Math.max(fromLines.length, targetLines.length)
  const lines = []
  for (let i = 0; i < n; i++) {
    const f = fromLines[i] ?? ''
    const t = targetLines[i] ?? ''
    const len = Math.round(f.length + (t.length - f.length) * p)
    lines.push(t.length >= len ? t.slice(0, len) : t + ' '.repeat(len - t.length))
  }
  return lines.join('\n')
}

// Collapse a per-character array back into spans, merging neighbours that share
// a class. Without this a 34-row panel emits ~2500 spans per frame; with it the
// count is in the low hundreds, about what a normal highlight costs.
function groupRuns(chars, cls) {
  const out = []
  let start = 0
  for (let i = 1; i <= chars.length; i++) {
    if (i === chars.length || cls[i] !== cls[start]) {
      const text = chars.slice(start, i).join('')
      const c = cls[start]
      out.push(c ? <span key={start} className={syntaxStyles[c]}>{text}</span> : text)
      start = i
    }
  }
  return out
}

export function ScrambleCode({
  text,
  language,
  visibleLines,
  scrambleMs,
  settleSpan,
  scrambleFps,
  holdMatching,
  charset = DEFAULT_CHARSET,
}) {
  // Progress through the current transition, 0 to 1. 1 means settled, which is
  // also the resting state between steps.
  const [progress, setProgress] = useState(1)
  // The glyph clock. Incrementing re-rolls every unsettled character; it ticks
  // at scrambleFps, independent of the rAF rate, so the noise reads as digital
  // rather than as dropped frames.
  const [tick, setTick] = useState(0)
  // The text the panel is coming FROM. Refs, not state: updating them must not
  // itself cause a render. pendingFrom is what the NEXT transition will start
  // from, and it only becomes `from` when that next change arrives.
  const fromRef = useRef(text)
  const pendingFromRef = useRef(text)

  // Tokenized once per text change. `runs` is the settled render; `charClasses`
  // is one class per character position, which is what lets an unsettled glyph
  // already wear its destination color.
  const to = useMemo(() => ({
    lines: text.split('\n'),
    runs: tokenizeLines(text, language),
    charClasses: lineCharClasses(text, language),
  }), [text, language])

  // Render-phase mirror of `progress`, for the transition effect below: an
  // interrupt needs to know how far the previous transition got, without
  // `progress` joining the effect's deps (which would restart it every frame).
  const progressRef = useRef(1)
  progressRef.current = progress

  // Start a transition whenever the text changes. A LAYOUT effect, not a
  // passive one: a passive effect lets the browser paint one fully-settled
  // frame of the NEW text before progress resets to 0 — a single-frame flash
  // of the finished output ahead of the churn, on every step, in footage.
  // useLayoutEffect resets progress before that frame can paint.
  useLayoutEffect(() => {
    // If the previous transition was still running, come FROM what is on
    // screen (interpolated row lengths), not from the old target it never
    // fully reached.
    const interrupted = progressRef.current < 1
    const prevTarget = pendingFromRef.current
    fromRef.current = interrupted
      ? synthesizeFrom(fromRef.current, prevTarget, progressRef.current)
      : prevTarget
    pendingFromRef.current = text
    if (fromRef.current === text) return

    let raf = 0
    const t0 = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - t0) / scrambleMs)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    setProgress(0)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [text, scrambleMs])

  const settled = progress >= 1

  // The glyph clock runs only while something is unsettled. It depends on the
  // BOOLEAN, not on progress itself: keyed on progress the interval would be
  // torn down and rebuilt on every rAF frame and never live long enough to fire.
  useEffect(() => {
    if (settled) return
    const id = setInterval(() => setTick((t) => t + 1), 1000 / scrambleFps)
    return () => clearInterval(id)
  }, [settled, scrambleFps])

  const fromLines = fromRef.current.split('\n')

  // Settled rows render the tokenizer's runs directly, the same call CodeBlock
  // makes. Mid-transition rows are built character by character and regrouped.
  // A row with no content still emits a space so it keeps its height and the
  // rows below do not slide up.
  const rows = []
  for (let i = 0; i < visibleLines; i++) {
    if (settled) {
      const runs = to.runs[i]
      rows.push(
        <div className={rigStyles.codeLine} key={i}>
          {runs && runs.length ? renderRuns(runs) : ' '}
        </div>,
      )
      continue
    }

    const from = fromLines[i] ?? ''
    const target = to.lines[i] ?? ''
    const classes = to.charClasses[i] ?? []

    // Row width interpolates between the two lengths: this is how a row grows
    // characters it did not have, or sheds ones it no longer needs.
    const len = Math.round(from.length + (target.length - from.length) * ease(progress))

    const chars = []
    const cls = []
    for (let j = 0; j < len; j++) {
      // Characters the two texts share at the same position never scramble, so
      // the indentation, braces, and group keys the formats have in common hold
      // still while only the differing parts churn.
      const shared = holdMatching && from[j] !== undefined && from[j] === target[j]
      // Each position's settle moment is fixed for the whole transition, drawn
      // from the (row, col) hash. settleSpan is how long one character spends
      // scrambling, so thresholds are drawn from the range that leaves room for it.
      const threshold = shared ? 0 : hash01(i, j) * (1 - settleSpan) + settleSpan
      const done = progress >= threshold
      if (done && j < target.length) {
        chars.push(target[j])
      } else if (done) {
        // Past its settle moment but beyond the new text: this position is on
        // its way out, so it holds blank rather than flashing a final glyph.
        chars.push(' ')
      } else {
        chars.push(charset[hash(i, j, tick) % charset.length])
      }
      cls.push(classes[j] ?? null)
    }

    rows.push(
      <div className={rigStyles.codeLine} key={i}>
        {chars.length ? groupRuns(chars, cls) : ' '}
      </div>,
    )
  }

  // A bare wrapper: the rows carry all the styling, and the panel outside sets
  // the type. It exists so the rows have one stable parent to address.
  return <div>{rows}</div>
}
