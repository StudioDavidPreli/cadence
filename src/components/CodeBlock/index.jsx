import { useState, useRef, useEffect, useMemo } from 'react'
import Prism from 'prismjs'
// The jsx grammar (markup tags + embedded JS expressions) — the core bundle
// carries markup/clike/javascript; jsx is an add-on component.
import 'prismjs/components/prism-jsx'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useActiveToken } from '../../context/ActiveTokenContext'
import { TOKEN_REF, resolveTokenDisplay, tokenPathMatchesActive, isEditableToken } from './resolveToken'
import styles from './CodeBlock.module.css'

// Prism ships an auto-highlight pass that scans the whole DOM on
// DOMContentLoaded. We use only its tokenizer (Prism.tokenize) and render the
// spans ourselves, so that pass has nothing to do — switch it off.
Prism.manual = true

// Prism token type → CSS-module class, grouped the way VS Code's TextMate
// scopes group (David's direction, 2026-07-19: an expansive, editor-grade
// scope map). Six visual roles:
//   keyword.* / constant.language  → tokKeyword   (const, return, true)
//   string / JSX attr values       → tokString
//   constant.numeric               → tokNumber
//   entity.name.function / .tag    → tokEntity    (useMotionTokens, motion.div)
//   variable.other.property /
//     entity.other.attribute-name  → tokProperty  (duration:, whileTap=)
//   comment                        → tokComment
// Identifiers, punctuation, and operators stay base — VS Code leaves them at
// the default foreground too — and member-access reads (tokens.duration.fast)
// classify as plain identifiers, so the token reads stay base and the accent
// chip under them stays the loudest signal in the block.
const SYNTAX_CLASS = {
  'keyword':          'tokKeyword',
  'boolean':          'tokKeyword',
  'string':           'tokString',
  'attr-value':       'tokString',
  'number':           'tokNumber',
  'comment':          'tokComment',
  'function':         'tokEntity',
  'class-name':       'tokEntity',
  'tag':              'tokEntity',
  'literal-property': 'tokProperty',
  'property':         'tokProperty',
  'attr-name':        'tokProperty',
  // variable.other.constant — SCREAMING_CASE names (WATER_SEQUENCE, WILT).
  // VS Code puts constants in the same ice-blue family as properties.
  'constant':         'tokProperty',
}

// Types that CONTAIN other tokens rather than being spans of one kind:
// Prism's 'tag' wraps the entire JSX tag (name, attrs, embedded scripts), so
// every leaf inside a tag carries it in its stack. Without this guard, any
// unclassified leaf inside a tag (a brace, an =, whitespace) would fall back
// up the stack to 'tag' and paint as an entity — the first build did exactly
// that, 193 teal spans in one snippet. A container classifies only when it IS
// the leaf's own type (the tag name itself).
const CONTAINER_TYPES = new Set(['tag', 'script'])

// Flatten Prism's nested token tree into per-line runs of { types, text }.
// The snippet tokenizes as ONE text (a JSX tag and its attributes span
// several lines, so per-line lexing can never classify them), and this walk
// re-splits the result at newlines while carrying each leaf's full type
// stack — the same normalization prism-react-renderer performs. A leaf's
// class resolves from the INNERMOST matching type (VS Code semantics: the
// most specific scope wins), so e.g. the quote punctuation nested inside a
// JSX attr-value falls back to base while the value text reads as a string.
function splitTokensIntoLines(tokens) {
  const lines = [[]]
  const push = (text, types) => {
    text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ types, text: part })
    })
  }
  const walk = (toks, stack) => {
    for (const tok of toks) {
      if (typeof tok === 'string') {
        push(tok, stack)
        continue
      }
      const aliases = tok.alias ? [].concat(tok.alias) : []
      const types = [...stack, tok.type, ...aliases]
      walk(Array.isArray(tok.content) ? tok.content : [tok.content], types)
    }
  }
  walk(tokens, [])
  return lines
}

function runClass(types) {
  for (let i = types.length - 1; i >= 0; i--) {
    if (CONTAINER_TYPES.has(types[i]) && i !== types.length - 1) continue
    const cls = SYNTAX_CLASS[types[i]]
    if (cls) return cls
  }
  return null
}

function renderRuns(runs) {
  return runs.map((run, i) => {
    const cls = runClass(run.types)
    return cls ? <span key={i} className={styles[cls]}>{run.text}</span> : run.text
  })
}

// How long the flash chip holds before the CSS transition on .comment fades it
// back out. Tool chrome, so a fixed timing (like the Copy button's transition
// and the section reveals), not a motion token Explore mode could collapse.
const FLASH_HOLD_MS = 450

// ─── CodeBlock ──────────────────────────────────────────────────────────────────
//
// Read-only view of the source behind a Token Lab demo. The point of the feature
// is the project's thesis made literal: the snippet shows the component reading a
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
export function CodeBlock({ code }) {
  const tokens = useMotionTokens()
  const activeToken = useActiveToken()
  const [copied, setCopied] = useState(false)

  // Tokenized once per snippet, not once per render — the component re-renders
  // on every slider tick (live values), but the source text never changes.
  // Whole-snippet jsx tokenization (then re-split into lines) is what lets the
  // multi-line JSX tags classify: <motion.div plus its attribute lines only
  // read as tag/attr-name scopes when the lexer sees the full tag. A construct
  // the grammar can't match degrades to plain JS tokens for that stretch,
  // never to a broken block.
  const lineRuns = useMemo(
    () => splitTokensIntoLines(Prism.tokenize(code, Prism.languages.jsx)),
    [code],
  )

  // Every token path this snippet reads, with its current resolved display value.
  // `sig` is the value fingerprint: it changes only when a displayed value
  // changes, so it is the right thing to drive the flash effect off of.
  const allPaths = [...code.matchAll(TOKEN_REF)].map(m => `${m[1]}.${m[2]}`)
  const displays = {}
  for (const p of allPaths) displays[p] = resolveTokenDisplay(p, tokens)
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
    // activeToken; exclude it so it does not also flash.
    const toFlash = changed.filter(p => !tokenPathMatchesActive(p, activeToken))
    if (toFlash.length === 0) return

    setFlashed(new Set(toFlash))
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashed(new Set()), FLASH_HOLD_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API is unavailable in insecure contexts; a failed copy is a
      // silent no-op, same as the export Copy button.
    }
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
    const sourceRow = (
      <div className={styles.line} key={`src-${i}`}>
        <span className={styles.source}>{renderRuns(lineRuns[i])}</span>
      </div>
    )
    if (paths.length === 0) return [sourceRow]

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
    // The source line's leading whitespace, reused so the comment row lines up
    // under the code it annotates. .line is white-space: pre, so it renders as-is.
    const indent = line.match(/^\s*/)[0]

    return [
      sourceRow,
      <div className={styles.line} key={`cmt-${i}`}>
        {indent}
        <span className={`${styles.comment} ${isActive ? styles.commentActive : ''}`}>{comment}</span>
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
