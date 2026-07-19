# Code-view syntax highlighting — 2026-07-19

The Token Lab code views shipped monotone on purpose: base text, muted
value-comments, no highlighter. David's review call: a wall of same-color
source is hard to read, and the only visual event in the block was the
changing-value chip. This session adds syntax highlighting without
surrendering that chip's priority.

## The standard, and what was chosen

Static highlighting has two current standards. Prism.js is the lightweight
one: a tokenizer that emits typed spans, styled entirely by the host's CSS.
Shiki is the VS Code-grade one: real TextMate grammars, editor-identical
output, at hundreds of kilobytes of grammar data. Highlight.js is the older
auto-detecting third. (Monaco and CodeMirror are full editors, out of scope
for read-only snippets.)

Cadence uses Prism core, tokenizer only. `Prism.tokenize` lexes each line and
`CodeBlock` renders the spans itself (no `innerHTML`, no Prism CSS, no
autoloader; `Prism.manual = true` disables its DOM scan). Shiki's baked themes
would fight the four-theme token system; with Prism, every color routes
through `--color-syntax-*` custom properties in `color.css`, the same way all
other color in the app resolves. Bundle cost measured on the built output:
+7.6 kB gzip on the index chunk.

## The scope map: VS Code's system, Cadence's constraints

Expanded the same day on David's direction to an editor-grade scope system
modeled on VS Code's TextMate scopes
(code.visualstudio.com/api/language-extensions/syntax-highlight-guide). The
first pass colored three types; the scope map now groups Prism's types the
way VS Code's standard scopes group, six visual roles total:

| Scope group | Covers |
|-------------|--------|
| keyword (`keyword.*`, `constant.language`) | `const`, `return`, booleans |
| string (incl. JSX attr values) | `'rainFallProgress'`, `'100%'` |
| number (`constant.numeric`) | `0.7`, `[0, 0.2, 1]` |
| entity (`entity.name.function`, `entity.name.tag`) | `useMotionTokens`, `motion.div` |
| property (`variable.other.property`, `entity.other.attribute-name`) | `duration:`, `whileTap=` |
| comment | both snippet comments and the live-value rows' register |

Identifiers, punctuation, and operators stay base, as VS Code leaves them at
the default foreground. Member access classifies as plain identifiers, so the
token reads (`tokens.duration.fast`) stay base and the live resolved comment
beneath them, with its chip, stays the strongest signal in the block.

## The palette rule: off the role wheel, VS Code's distribution

Green means active, purple means easing, amber means warning; syntax must not
dilute those roles, and the changing-value chip (`--color-accent-subtle`
background) remains the only accent inside a code block. Within that
constraint the hues follow VS Code's familiar distribution — blue keywords,
warm strings, ice-blue properties, teal entities — which is why numbers are
orchid/plum where VS Code uses green (green is the dark theme's accent):

| Role | Dark (on #141414) | Light (on #f5f5f5) |
|------|-------------------|--------------------|
| keyword | blue `#6cb6f5`, 8.2:1 | azure `#1d5fbf`, 5.6:1 |
| string | salmon `#e5988a`, 7.8:1 | rust `#b3402e`, 5.2:1 |
| number | orchid `#dda3d8`, 8.8:1 | plum `#8c2f73`, 6.9:1 |
| entity | teal `#66d1c3`, 9.6:1 | teal `#0f766e`, 5.0:1 |
| property | ice `#a8d3f0`, 11.2:1 | navy `#34558b`, 6.8:1 |

All clear the 4.5:1 text bar on `--color-bg`, the CodeBlock surface.

## High contrast: colored after all

The first pass resolved the HC syntax tokens to text-base — monochrome, by
analogy with the category chips. David reversed it the same day: high
contrast modes in real editors color code, and "ugly and legible is better
than pretty and illegible." Function defeats form here.

The HC values follow the same off-the-role-wheel rule, applied to each HC
theme's own roles, which differ from dark/light. HC-light's roles hold amber
(accent, accent3) and blue-violet (accent2), so it keeps VS Code Light's
keyword-blue/string-red distribution at AAA depth: keyword navy `#16437e`
(9.8:1), string rust `#8a2a1c` (8.6:1), number plum `#7a2260` (9.5:1), entity
teal `#0b5e56` (7.6:1) on white. HC-dark is the one theme that cannot follow
the keyword-blue convention — blue IS its accent, with blue-violet and amber
also taken — so keywords hold salmon `#f4a99a` (11.0:1), strings mint
`#8fdf9b` (13.2:1), numbers orchid `#eeafe6` (11.9:1), entities cyan
`#7adfe8` (13.5:1, vivid against the accent's pale `#aaccf6`) on black.
Everything clears AAA, in keeping with a theme whose premise is maximum
contrast.

Two HC reductions, both deliberate: properties resolve to text-base (VS
Code's own HC themes shrink the palette, and the highest-frequency scope
carries maximum contrast rather than a hue), and comments stay text-base by
the no-grays rule, which predates highlighting.

## Whole-snippet tokenization, split back into lines

The first pass tokenized per line with the JavaScript grammar, which could
never classify JSX: the snippets open tags across multiple lines, and a tag
only reads as `entity.name.tag` when the lexer sees it whole. The snippet now
tokenizes once with the jsx grammar and the token tree is re-split at
newlines into per-line runs, each carrying its full type stack (the
normalization prism-react-renderer performs). A run's class resolves from the
innermost matching type, VS Code's most-specific-scope-wins semantics — so
the quote punctuation inside a JSX attr value falls back to base while the
value reads as a string. A construct the grammar cannot match degrades to
plain JS tokens for that stretch, never a broken block. The row architecture
is untouched: source rows and live-comment rows interleave exactly as before,
and the flash/drag emphasis logic is unchanged.

## Verification

Built output via wrangler dev, all four themes: colored spans carry the
expected computed colors per theme, HC renders monochrome, and a live slider
drag mid-inspection shows the chip (accent-subtle background, weight 700,
value ticking) rendering over the highlighted source. 106 unit tests and the
token-integrity gate pass; the gate has nothing to flag since the new CSS
carries no timing.
