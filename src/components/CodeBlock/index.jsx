import { useState, useRef, useEffect, useMemo } from 'react'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useActiveToken } from '../../context/ActiveTokenContext'
import { useDemoOverrides } from '../../context/DemoOverridesContext'
import { TOKEN_REF, resolveTokenDisplay, tokenPathMatchesActive, isEditableToken } from './resolveToken'
// The tokenizer, the scope map, and the span renderer live in ./highlight.jsx
// (extracted 2026-08-10) so the case-study capture rig can paint its own text
// with this same palette. Everything left in this file is the live-token-value
// behavior, which is CodeBlock's alone.
import { tokenizeLines, runClass } from './highlight'
import { formatLiteral, formatDisplay, parseLiteral, offSystemComment, nearestToken } from './offSystem'
import styles from './CodeBlock.module.css'

// How long the flash chip holds before the CSS transition on .comment fades it
// back out. Tool chrome, so a fixed timing (like the Copy button's transition
// and the section reveals), not a motion token Explore mode could collapse.
const FLASH_HOLD_MS = 450

// ─── CodeBlock ──────────────────────────────────────────────────────────────────
//
// View of the source behind a Token Lab demo. The point of the feature is the
// project's thesis made literal: the snippet shows the component reading a
// token (transition={{ duration: tokens.duration.slow }}) right next to the live
// demo and the slider that drives it.
//
// Live values: the snippet is plain source text. For display, each line is
// scanned for `tokens.<group>.<key>` reads and the current resolved value is
// appended as a trailing comment. Those comments re-render whenever the token
// state changes, so dragging a slider retimes the demo AND ticks the numbers
// here. The comments are display only. Copy emits the raw snippet (the token
// reads, no resolved values), which is the artifact an engineer pastes.
//
// useMotionTokens() here returns the same live values the demos read: inside
// Token Lab a MotionTokensProvider supplies the edited state, so this reflects
// exactly what the user is editing.
//
// Emphasis: a value lights up with the green chip (see .commentActive) in two
// cases. While a slider or easing curve is being dragged, useActiveToken() names
// that token and its value stays lit for the whole gesture. For a discrete change
// with no drag (loading a preset, picking a named easing curve, reset, import),
// the value cannot lean on activeToken, so CodeBlock watches its own resolved
// values and flashes any that change, holding the chip briefly then letting it
// fade. The token under an active drag is excluded from the flash path, so the
// sustained highlight and the flash never double up on the same value.
//
// ── Off-system edits (2026-09-09) ────────────────────────────────────────────
// Inside Token Lab the snippet is also an input. With a `demoKey` and the
// DemoOverridesContext in scope, every editable token read is clickable: click
// it, type a literal, press Enter, and THIS demo runs the literal in place of
// the token (DemoWrapper patches the demo's provider). The read renders as the
// literal, its comment row says what the system sees ("off-system: 0.25s,
// nearest duration.fast (0.2s)"), and two text actions follow the comment:
// [RECONNECT] restores the token read, [ADOPT] moves the token to the literal
// so every consumer follows. The chip never lights for a literal, because
// nothing connected changed; that absence is part of the signal. The override
// is per demo and per path, so a token the snippet reads twice shows the
// literal at both reads (see offSystem.js for why). Copy emits the snippet as
// the reader made it, literals included: a copy that quietly repaired the code
// would be a lie about what the demo is running.
//
// Without a demoKey (the principle cards' QuoteBlock) nothing here changes and
// the block is the read-only view it was.
export function CodeBlock({ code, demoKey }) {
  const tokens = useMotionTokens()
  const activeToken = useActiveToken()
  const overridesCtx = useDemoOverrides()
  const [copied, setCopied] = useState(false)

  // Editing is on only where both the context and a demo key exist.
  const editable = Boolean(overridesCtx && demoKey)
  const overrides = (editable && overridesCtx.overrides[demoKey]) || {}
  const isOverridden = path => overrides[path] !== undefined

  // The inline editor: which read is open ({ line, path }), what has been typed,
  // and why the draft is not yet a value (null while it is).
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(null)
  const inputRef = useRef(null)
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  // Tokenized once per snippet, not once per render — the component re-renders
  // on every slider tick (live values), but the source text never changes.
  // Whole-snippet jsx tokenization (then re-split into lines) is what lets the
  // multi-line JSX tags classify: <motion.div plus its attribute lines only
  // read as tag/attr-name scopes when the lexer sees the full tag. A construct
  // the grammar can't match degrades to plain JS tokens for that stretch,
  // never to a broken block.
  const lineRuns = useMemo(() => tokenizeLines(code, 'jsx'), [code])

  // Every token path this snippet reads, with its current resolved display value.
  // An overridden path displays its literal instead, so a change to the override
  // registers in `sig` (and re-renders the row) without ever flashing: the flash
  // filter below skips overridden paths.
  // `sig` is the value fingerprint: it changes only when a displayed value
  // changes, so it is the right thing to drive the flash effect off of.
  const allPaths = [...code.matchAll(TOKEN_REF)].map(m => `${m[1]}.${m[2]}`)
  const displays = {}
  for (const p of allPaths) {
    displays[p] = isOverridden(p) ? `literal:${formatLiteral(p, overrides[p])}` : resolveTokenDisplay(p, tokens)
  }
  const sig = allPaths.map(p => `${p}=${displays[p]}`).join('|')

  // Paths currently flashing from a discrete change. A Set so membership is O(1)
  // in the render below.
  const [flashed, setFlashed] = useState(() => new Set())
  const prevDisplaysRef = useRef(displays)
  const baselineSetRef = useRef(false)
  const flashTimer = useRef(null)

  // Detect which displayed values changed and flash them. Keyed on `sig` so it
  // runs only when a value actually changes, not on every re-render (e.g. when
  // setFlashed itself re-renders). activeToken is read from the current closure;
  // it is correct for the render that produced this sig.
  useEffect(() => {
    const prev = prevDisplaysRef.current
    prevDisplaysRef.current = displays

    // First commit establishes the baseline without flashing (opening the code
    // view should not light everything up).
    if (!baselineSetRef.current) {
      baselineSetRef.current = true
      return
    }

    const changed = allPaths.filter(p => prev[p] !== displays[p])
    // The value under an in-progress drag already has the sustained highlight via
    // activeToken; exclude it so it does not also flash. A literal never flashes.
    const toFlash = changed.filter(p => !tokenPathMatchesActive(p, activeToken) && !isOverridden(p))
    if (toFlash.length === 0) return

    setFlashed(new Set(toFlash))
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashed(new Set()), FLASH_HOLD_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  // The snippet as the reader made it: token reads, except where this demo
  // runs a literal, which prints as the literal. With no overrides this is
  // `code` unchanged.
  const effectiveCode = code.replace(TOKEN_REF, (match, group, key) => {
    const path = `${group}.${key}`
    return isOverridden(path) ? formatLiteral(path, overrides[path]) : match
  })

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(effectiveCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API is unavailable in insecure contexts; a failed copy is a
      // silent no-op, same as the export Copy button.
    }
  }

  // ── The inline editor ────────────────────────────────────────────────────────
  function openEditor(lineIndex, path) {
    const current = isOverridden(path) ? overrides[path] : tokens[path.split('.')[0]]?.[path.split('.')[1]]
    setDraft(current === undefined ? '' : formatLiteral(path, current))
    setInvalid(null)
    setEditing({ line: lineIndex, path })
  }

  function closeEditor() {
    setEditing(null)
    setInvalid(null)
  }

  // Enter commits a valid draft; an invalid one stays open with its reason on
  // the comment row. Blur commits if valid and cancels otherwise, so clicking
  // away never lands a half-typed value.
  function commitDraft({ onInvalid }) {
    if (!editing) return
    const parsed = parseLiteral(editing.path, draft)
    if (parsed.ok) {
      overridesCtx.setOverride(demoKey, editing.path, parsed.value)
      closeEditor()
    } else {
      onInvalid(parsed.reason)
    }
  }

  function handleEditorKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitDraft({ onInvalid: setInvalid })
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeEditor()
    }
  }

  // ── Rendering a line with its reads spliced in ───────────────────────────────
  // Prism's runs are spans of text with scope classes. A token read
  // (tokens.duration.fast) spans several runs (identifiers and punctuation, all
  // base-colored). To replace a read with the literal or the editor, walk the
  // runs with a character cursor and, inside a read's range, emit one element
  // at the range's first character and skip the rest. Text outside ranges is
  // rendered exactly as renderRuns would.
  function renderLine(lineIndex, line) {
    const runs = lineRuns[lineIndex]
    const ranges = [...line.matchAll(TOKEN_REF)].map(m => ({
      start: m.index,
      end: m.index + m[0].length,
      path: `${m[1]}.${m[2]}`,
    }))
    if (!editable || ranges.length === 0) {
      return runs.map((run, i) => {
        const cls = runClass(run.types)
        return cls ? <span key={i} className={styles[cls]}>{run.text}</span> : run.text
      })
    }

    const out = []
    let cursor = 0
    let key = 0
    const emitText = (text, cls) => {
      if (!text) return
      out.push(cls ? <span key={key++} className={styles[cls]}>{text}</span> : <span key={key++}>{text}</span>)
    }
    for (const run of runs) {
      const cls = runClass(run.types)
      const runStart = cursor
      const runEnd = cursor + run.text.length
      let pos = runStart
      for (const range of ranges) {
        if (range.end <= pos || range.start >= runEnd) continue
        // Text in this run before the range.
        if (range.start > pos) emitText(run.text.slice(pos - runStart, range.start - runStart), cls)
        // The range itself, once, at its first character.
        if (range.start >= runStart && range.start < runEnd) {
          out.push(renderRead(lineIndex, range, key++))
        }
        pos = Math.min(range.end, runEnd)
      }
      if (pos < runEnd) emitText(run.text.slice(pos - runStart), cls)
      cursor = runEnd
    }
    return out
  }

  // One token read: the open editor, the literal, or the clickable read.
  function renderRead(lineIndex, { path }, key) {
    const readText = `tokens.${path}`
    if (editing && editing.line === lineIndex && editing.path === path) {
      return (
        <input
          key={key}
          ref={inputRef}
          className={styles.literalInput}
          value={draft}
          size={Math.max(draft.length, 4)}
          onChange={e => { setDraft(e.target.value); setInvalid(null) }}
          onKeyDown={handleEditorKeyDown}
          onBlur={() => commitDraft({ onInvalid: closeEditor })}
          aria-label={`Value for ${readText}`}
          aria-invalid={invalid !== null}
          spellCheck={false}
        />
      )
    }
    if (isOverridden(path)) {
      return (
        <span
          key={key}
          role="button"
          tabIndex={0}
          className={`${styles.tokNumber} ${styles.literal}`}
          title={`Literal in place of ${readText}. Click to change it.`}
          onClick={() => openEditor(lineIndex, path)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(lineIndex, path) } }}
        >
          {formatLiteral(path, overrides[path])}
        </span>
      )
    }
    // Fixed references (ease.linear, delay.none) have no slider and take no
    // literal either: they are the constants the system is built on.
    if (!isEditableToken(path)) return <span key={key}>{readText}</span>
    return (
      <span
        key={key}
        role="button"
        tabIndex={0}
        className={styles.read}
        title="Click to type a value in place of this token"
        onClick={() => openEditor(lineIndex, path)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(lineIndex, path) } }}
      >
        {readText}
      </span>
    )
  }

  // The [RECONNECT] / [ADOPT] pair after an off-system comment. Plain text at
  // the comment's size, red and green in every theme (--color-reconnect,
  // --color-adopt), brackets included; the pointer is the only affordance
  // (David's spec, 2026-09-09). Real buttons for the keyboard, styled to
  // nothing.
  function renderActions(path) {
    const value = overrides[path]
    const [group, k] = path.split('.')
    const tokenValue = tokens?.[group]?.[k]
    const nearest = nearestToken(path, value, tokens)
    const consumers = 'every component that reads it follows'
    return (
      <span key={`act-${path}`} className={styles.actions}>
        <button
          type="button"
          className={styles.reconnect}
          title={`Restore tokens.${path} (${tokenValue === undefined ? '' : formatDisplay(path, tokenValue)}) in this demo.`}
          onClick={() => overridesCtx.clearOverride(demoKey, path)}
        >
          [RECONNECT]
        </button>
        <button
          type="button"
          className={styles.adopt}
          title={`Set ${path} to ${formatDisplay(path, value)}: ${consumers}.${nearest?.matches ? '' : ` Nearest today: ${nearest?.key}.`}`}
          onClick={() => overridesCtx.adoptOverride(demoKey, path)}
        >
          [ADOPT]
        </button>
      </span>
    )
  }

  // Each source line renders as its own row. When a line reads a token, the live
  // resolved value renders on a SEPARATE row directly beneath it, indented to sit
  // under the code it annotates. Keeping the comment off the source line means the
  // source keeps its real width, so a value ticking up as the user drags a slider
  // never pushes the code line past the block's right edge. flatMap because a line
  // with a token read emits two rows (source + comment), one without emits one.
  const lines = code.split('\n').flatMap((line, i) => {
    // Resolve every token read on this line to its current value. filter(Boolean)
    // drops any unresolved path defensively; the guard test prevents that case.
    const paths = [...line.matchAll(TOKEN_REF)].map(m => `${m[1]}.${m[2]}`)
    // A row that carries an off-system read, or the editor, sits on a plate
    // (.linePlated: the second surface, a rule down the left) with its comment
    // row, so the edited stretch reads as one segment of the block even when
    // the comment wraps (David's spec, 2026-09-09). Consecutive plated rows
    // merge into one plate.
    const plated = paths.some(isOverridden) || (editing !== null && editing.line === i)
    const lineClass = plated ? `${styles.line} ${styles.linePlated}` : styles.line
    const sourceRow = (
      <div className={lineClass} key={`src-${i}`}>
        <span className={styles.source}>{renderLine(i, line)}</span>
      </div>
    )
    if (paths.length === 0) return [sourceRow]

    // The source line's leading whitespace, reused so the comment row lines up
    // under the code it annotates. .line is white-space: pre, so it renders as-is.
    const indent = line.match(/^\s*/)[0]

    // While the editor on this line holds a draft it cannot read, the comment
    // row says why, in place of the value.
    if (editing && editing.line === i && invalid) {
      return [
        sourceRow,
        <div className={lineClass} key={`cmt-${i}`}>
          {indent}
          <span className={styles.comment}>{`// ${invalid}`}</span>
        </div>,
      ]
    }

    // A line with no off-system read renders exactly as it always has: one
    // comment span, the values joined, the chip covering the whole comment.
    if (!paths.some(isOverridden)) {
      const comment = '// ' + paths
        .map(p => {
          const value = resolveTokenDisplay(p, tokens)
          if (!value) return null // filter(Boolean) below; guard test prevents this
          // Tokens no slider can reach (ease.linear, ease.overshoot, delay.none)
          // are tagged so their never-changing value reads as a fixed reference,
          // not a dead live comment. Per-token, not per-line, because one line
          // can mix the two (Notification Badge: ease.overshoot fixed, ease.standard
          // editable). See isEditableToken.
          return isEditableToken(p) ? value : `${value} (fixed)`
        })
        .filter(Boolean)
        .join(' · ')
      // Lit if its token is under an active drag (sustained) or mid-flash (transient).
      const isActive = paths.some(
        p => tokenPathMatchesActive(p, activeToken) || flashed.has(p)
      )
      return [
        sourceRow,
        <div className={lineClass} key={`cmt-${i}`}>
          {indent}
          <span className={`${styles.comment} ${isActive ? styles.commentActive : ''}`}>{comment}</span>
        </div>,
      ]
    }

    // At least one read on this line is off-system: one segment per read, the
    // live value (chip-able) or the off-system text with its two actions.
    const segments = paths.map((p, j) => {
      if (isOverridden(p)) {
        return (
          <span key={`seg-${p}-${j}`}>
            {j > 0 && ' · '}
            <span className={styles.comment}>{offSystemComment(p, overrides[p], tokens)}</span>
            {renderActions(p)}
          </span>
        )
      }
      const value = resolveTokenDisplay(p, tokens)
      if (!value) return null // guard test prevents this
      const text = isEditableToken(p) ? value : `${value} (fixed)`
      const isActive = tokenPathMatchesActive(p, activeToken) || flashed.has(p)
      return (
        <span key={`seg-${p}-${j}`}>
          {j > 0 && ' · '}
          <span className={`${styles.comment} ${isActive ? styles.commentActive : ''}`}>{text}</span>
        </span>
      )
    }).filter(Boolean)

    return [
      sourceRow,
      <div className={lineClass} key={`cmt-${i}`}>
        {indent}
        <span className={styles.comment}>{'// '}</span>
        {segments}
      </div>,
    ]
  })

  return (
    <div className={styles.block}>
      <button
        type="button"
        className={styles.copy}
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className={styles.pre}>{lines}</pre>
    </div>
  )
}
