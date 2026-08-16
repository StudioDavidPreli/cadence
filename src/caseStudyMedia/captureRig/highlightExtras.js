// Grammar registrations for the capture scenes, beyond production's jsx.
//
// Prism grammars register globally on import, and prism-css-extras REWRITES
// the shared css grammar (the number/unit split, a restructured selector,
// `variable` for custom properties). That rewrite is wanted here — the export
// scene shows CSS and JSON beside JSX in one palette, and without css-extras a
// value like 100ms reads as plain text while the same 100 in the JSON output
// reads as a number — and unwanted in the app bundle, where it would make css
// tokenization depend on whether this chunk has loaded. So the imports live in
// the rig: ScrambleCode pulls this module, which guarantees registration
// before any scene tokenizes json or css. The class mappings these grammars
// feed (`unit`, `selector`, `variable`) stay in CodeBlock/highlight.jsx, inert
// until the grammars exist.
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css-extras'
