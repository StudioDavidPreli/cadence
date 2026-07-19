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

## The palette rule: off the accent wheel

Green means active, purple means easing, amber means warning. Syntax color
must not dilute those roles, so the palette avoids all three families and the
changing-value chip (`--color-accent-subtle` background) remains the only
accent inside a code block. Three hues, plus comments in the existing muted
annotation color:

| Role | Dark (on #141414) | Light (on #f5f5f5) |
|------|-------------------|--------------------|
| keyword | coral `#e5988a`, 7.8:1 | rust `#b3402e`, 5.2:1 |
| string | sky `#9ecbff`, 10.6:1 | blue `#1d5fbf`, 5.6:1 |
| number | orchid `#dda3d8`, 8.8:1 | plum `#8c2f73`, 6.9:1 |

All clear the 4.5:1 text bar on `--color-bg`, the CodeBlock surface.

Identifiers, punctuation, operators, and JSX tags stay in base text. That is
deliberate restraint twice over: it keeps the palette small, and it keeps the
token reads (`tokens.duration.fast`) uncolored so the live resolved comment
beneath them, and its chip, stay the strongest signal in the block.

High contrast resolves all three syntax tokens to text-base — monochrome, the
same reasoning as the category chips going monochrome in HC: the theme's rule
is pure black/white with no mid-tones, and hue adds nothing the chip does not
already mark. If HC highlighting is ever wanted, the tokens exist; give them
HC values and the audit a new row.

## Per-line tokenization

Lines tokenize independently with the JavaScript grammar, memoized per
snippet. The snippets' JSX opens tags across multiple lines, so a full-file
JSX parse buys nothing per-line; independent lines also mean a stray construct
can only ever leave its own line unstyled instead of bleeding state into the
rest of the block. This rides the existing row architecture: source rows and
live-comment rows interleave exactly as before, and the flash/drag emphasis
logic is untouched.

## Verification

Built output via wrangler dev, all four themes: colored spans carry the
expected computed colors per theme, HC renders monochrome, and a live slider
drag mid-inspection shows the chip (accent-subtle background, weight 700,
value ticking) rendering over the highlighted source. 106 unit tests and the
token-integrity gate pass; the gate has nothing to flag since the new CSS
carries no timing.
