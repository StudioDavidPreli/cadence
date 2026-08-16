import Prism from 'prismjs'
// The jsx grammar (markup tags + embedded JS expressions) — the core bundle
// carries markup/clike/javascript/css; jsx and json are add-on components.
// Production registers ONLY jsx: the app's one tokenizing surface is
// CodeBlock's snippet view. The capture rig's export scene also tokenizes
// json and css (with css-extras' number/unit split); those grammars register
// rig-side in src/caseStudyMedia/captureRig/highlightExtras.js, so the app
// bundle never carries them — and prism-css-extras REWRITES the shared css
// grammar on import, so keeping it out of this module also keeps production
// css tokenization from depending on whether a rig chunk has loaded.
import 'prismjs/components/prism-jsx'
import styles from './CodeBlock.module.css'

// ─── Syntax highlighting ────────────────────────────────────────────────────────
//
// The pure half of the code view, extracted from CodeBlock/index.jsx (2026-08-10)
// so the case-study capture rig can render the same palette over its own text.
// CodeBlock keeps the live-token-value behavior; everything here is a pure
// function of (code, language). Nothing in this module holds state.

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
  // css-extras splits a dimension into number + unit; both are the numeric role.
  'unit':             'tokNumber',
  'comment':          'tokComment',
  'function':         'tokEntity',
  'class-name':       'tokEntity',
  'tag':              'tokEntity',
  // A CSS selector (:root) is the closest thing that grammar has to a tag name,
  // so it takes the same role a JSX tag takes.
  'selector':         'tokEntity',
  'literal-property': 'tokProperty',
  'property':         'tokProperty',
  'attr-name':        'tokProperty',
  // css-extras types a CSS custom property (--motion-duration-fast) as
  // `variable`, not `property`. In a token document that name IS the property,
  // and it is the same thing the JSON exports spell as an object key, so it
  // takes the property role and the four export panels agree. No grammar this
  // bundle loads emits `variable` for JS or JSX, so CodeBlock is unaffected.
  'variable':         'tokProperty',
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
export function splitTokensIntoLines(tokens) {
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

export function runClass(types) {
  for (let i = types.length - 1; i >= 0; i--) {
    if (CONTAINER_TYPES.has(types[i]) && i !== types.length - 1) continue
    const cls = SYNTAX_CLASS[types[i]]
    if (cls) return cls
  }
  return null
}

// Tokenize a whole source string and return it as per-line runs. The single
// entry point: callers never touch Prism directly, so the grammar imports and
// the manual-mode switch stay in this module. An unregistered language falls
// back to jsx rather than handing Prism an undefined grammar (which silently
// returns the whole input as one unclassified string); languages beyond jsx
// exist only where their registration module has run — see the capture rig's
// highlightExtras.js.
export function tokenizeLines(code, language = 'jsx') {
  const grammar = Prism.languages[language] ?? Prism.languages.jsx
  return splitTokensIntoLines(Prism.tokenize(code, grammar))
}

export function renderRuns(runs) {
  return runs.map((run, i) => {
    const cls = runClass(run.types)
    return cls ? <span key={i} className={styles[cls]}>{run.text}</span> : run.text
  })
}

// Per-line arrays of one CSS class (or null) PER CHARACTER, rather than per run.
//
// The capture rig's scramble effect replaces characters with noise glyphs while
// keeping each position's destination color, so a value's syntax role is already
// correct while its glyphs are still churning. That needs the class indexed by
// character position, which run boundaries do not give. Runs concatenate to
// exactly the line text, so repeating each run's class across its length yields
// an array the same length as the line.
//
// Tokenizing is the expensive step and this shares it with nothing, so callers
// should memoize on (code, language) — it runs once per source change, never
// per frame.
export function lineCharClasses(code, language = 'jsx') {
  return tokenizeLines(code, language).map((runs) => {
    const classes = []
    for (const run of runs) {
      const cls = runClass(run.types)
      for (let i = 0; i < run.text.length; i++) classes.push(cls)
    }
    return classes
  })
}

// The style map, re-exported so a caller rendering its own spans (the rig's
// scramble panel) paints with the same per-theme --color-syntax-* tokens the
// shipped code view uses, instead of duplicating the palette.
export { styles as syntaxStyles }
