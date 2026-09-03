# V2 Build Order — for David's review

Drafted 2026-09-03 from the post-launch ideation sessions. Status: proposal,
nothing started. The ordering principle: the tokens package is the substrate
the spec generator, the linter, and the measurement tool all stand on, so it
goes early; the one item with no dependency on anything (the .riv contract
check) goes first because it protects the site today.

Launch content items (LinkedIn Featured, remaining post drafts, the Figma
design-system file) are tracked in the capture doc and stay out of this order.

---

## Decisions to settle before Item 2 (recommendations inline)

- **D1 — Direction of truth.** The package becomes the source; the site becomes
  its first consumer. Recommended over mirror-plus-parity-test: it is the real
  design-system topology, and the migration is mechanical because everything
  already flows through `src/data/motionPresets.js`.
- **D2 — Canonical format.** JS-authored, JSON-emitted. `motionPresets.js`
  moves into the package as the authored source (its tuning comments survive,
  which the learning ethos requires); `cadence.tokens.json` is a generated,
  published artifact, alongside the CSS, FM, and other targets. David's sketch
  named the JSON as the source; this inverts that one level for the comments'
  sake. Open for his call.
- **D3 — npm name.** Checked 2026-09-03: `cadence` and `cadence-motion` are
  taken; **`cadence-tokens`** and `cadence-motion-tokens` are available. The
  `@cadence` scope has zero packages but the org page is not anonymously
  verifiable and the bare name being taken means the scope is likely
  unclaimable. Recommended: `cadence-tokens`, so the import reads
  `import { presets } from 'cadence-tokens'`.
- **D4 — CSS prefix.** The CSS emitter takes a prefix argument. The site build
  keeps `--motion-` (zero churn, no minified-CSS risk); the published file
  defaults to `--cadence-` (namespaced for a stranger's codebase). One emitter,
  two calls.
- **D5 — Ambient vocabulary.** Ships in v1 as its own namespace beside the
  interaction tokens. Each personality carries both: `duration / ease / delay /
  scale / spring` and `speed / easing / spread / cell / gap`. The named preset
  stays the shared unit; the package makes the sharing a data structure.
- **D6 — AE emitter form.** A `.jsx` that builds or updates the
  `TOKENS Motion` control layer per the CadenceButtonRig mapping, not
  plain-text snippets. Keeps the tokens-in-one-place rule intact inside AE.
- **D7 — Figma route.** A DTCG-shaped variables file with the three presets as
  variable modes in one collection, imported via the common variables-import
  plugins (the Variables REST write API is Enterprise-only). The official
  Figma MCP is connected in Claude Code sessions and could push variables
  directly as an alternative; decide when the item starts.

---

## The order

### 1. .riv contract check in CI

Promote the runtime unbound-tile diagnostic to a build-time gate: an e2e pass
over `public/rive/` (and the tile directories) asserting each file's class
contract — the ViewModel1 three-instance convention with its color properties
for principle art, VM property completeness and named instances for tiles, the
expected state machines. The r4c1 failure class (a binding silently not
surviving export) fails CI instead of shipping a blank canvas.

- Depends on: nothing. Independent of every other item.
- Size: 1 session.
- Risk: low. Extends the existing e2e suite; the web runtime enumerates
  artboards, state machines, and VM properties without the Rive MCP.
- Exit: deleting a VM instance from a copy of any tile file fails the suite;
  full suite green on built output.
- David's gate: none (no UI change, no visual pass needed).

### 2. Tokens package extraction

Create `packages/tokens/`: move `motionPresets.js` (interaction vocabulary),
lift the Motion Tiles `PRESETS` table (ambient vocabulary) in beside it, move
`stateToExport` and the four stringifiers, add the prefix-argument CSS emitter
and the `cadence.tokens.json` generator. The site imports from the package.

- Depends on: D1–D5.
- Size: 2 sessions. Session one is the move and the imports; session two is
  the emitters and the generated-artifact tests.
- Risk: medium, and it is the build pipeline, not the code: introducing npm
  workspaces changes the install, and deploys auto-ride pushes to main. The
  first commit after the workspace change is a probe commit verified against
  a green Workers Build before anything else lands on top. A Vite alias /
  `file:` dependency is the fallback if workspaces fight the Cloudflare build.
- Exit: all unit suites and e2e green on built output; the site's runtime
  behavior byte-identical (no token value changes anywhere); a drift test
  asserting the generated CSS matches what `motion.css` declares today.
- David's gate: sign-off on D1–D5 before it starts.

### 3. Rive VM defaults emitter + grid import

Emit per-preset VM defaults JSON (`speed`, `easing`, `cellSize`, `gapSize`)
from the package, and point `MotionTilesGrid`'s `PRESETS` numbers at the
package import. The duplication between the JS table and the VM instances
retires; "same k and speed inside and outside the site" becomes an import,
not a discipline.

- Depends on: Item 2.
- Size: 1 session.
- Risk: low.
- Exit: grid values provably unchanged (the table's numbers and the package's
  are one source); e2e green; the emitted JSON documented for outside
  consumers (what a VM property expects, per the unit lessons: radians on
  rotation binds, 0–100 opacity, factor scale).
- David's gate: visual pass on the grid (all three presets retime and read
  identically to today) before commit.

### 4. npm publish

`cadence-tokens@1.0.0`: the JS API, the generated `cadence.tokens.json`, the
CSS file at the `--cadence-` prefix, the FM module, the Rive defaults JSON.
README written against the voice doc. Package version becomes the token
system's version; tuning changes get changelog entries.

- Depends on: Items 2–3 stable.
- Size: half a session plus David's README pass.
- Risk: low. Publishing is reversible in the sense that follow-up versions
  are cheap; the name is not, hence D3 first.
- David's gate: the README and the name are his before anything goes public.

### 5. Spec generator (the public style guide, generated)

The rendering layer of the package. Per token family and per component, a
generated handoff page: which tokens the component reads (the consumption map
the code-view drift guard already knows), the values per preset, and a
provenance column ([measured] / [proposed] / [tuned]) sourced from a curated
provenance table authored into the package — not from the archive briefings,
which stay private. This converts the tracker's "public style guide" item
from hand-written to generated.

- Depends on: Item 2 (data source). Item 4 helps but does not block.
- Size: 3–4 sessions: data model + provenance table, renderer + route, copy.
- Risk: medium. The renderer is a new public surface, so it takes the full
  treatment: four themes, contrast bar, chrome timing, reduced motion.
- Exit: every editable token appears on a generated page; a token addition in
  the package shows up in the guide with no hand edit; e2e rows for the route.
- David's gates: scope of the provenance table (what gets a [measured] tag and
  what the public record can cite for it); voice pass on all copy; visual pass
  before commit.

### 6. AE emitter

The package emits a `.jsx` that creates or updates the `TOKENS Motion` layer
in any comp, per the CadenceButtonRig mapping (durations and delays as
sliders, curves as paired Point Controls, spring riding along). Re-running the
script retimes the comp.

- Depends on: Item 2. D6.
- Size: 1–2 sessions of writing; verification is David's, in AE, since
  nothing here can run After Effects.
- Risk: low on the emitter, real on the edge cases only David can adjudicate
  (existing-layer update semantics, expression recovery after a re-run).
- Exit: David runs it against the existing rig comp and a fresh comp; both
  read tokens correctly across at least two presets.
- David's gate: he specs the update-vs-rebuild behavior before writing starts.

### 7. Figma variables target

The DTCG-shaped variables file with presets as modes, per D7. Durations as
FLOAT ms, curve handles as four FLOATs, spring as FLOATs; the type
constraints documented in the file itself. Pairs with the day-21 Figma
design-system file if that ships.

- Depends on: Item 2. D7.
- Size: 1 session plus David's Figma-side import verification.
- Risk: low; the constraint is Figma's type system, already scoped.
- Exit: the file imports clean through the chosen route; switching modes in
  Figma flips a mock through all three personalities.

### 8. Measurement tool MVP (the reverse-engineering page)

Constrained contract, not "any GIF": one screen recording of one transition,
processed entirely client-side. Motion-energy trace (per-frame pixel change,
integrated and normalized into a progress curve), fitted against both curve
families (nearest cubic-bezier and k-form), hold windows detected, confidence
stated, ambiguity flagged when the fit is underdetermined. Output is a
Cadence token file the import already validates.

Gate session first: prove the fit on ground truth by recording the site's own
Button at known tokens and requiring the tool to recover them. If the spike
cannot recover known tokens from a clean recording, the item stops there and
the order continues without it.

- Depends on: Item 2 (output format). Nothing else.
- Size: 1 spike session, then 2–3 build sessions if the spike passes.
- Risk: highest in the order, which is why the spike gates it. Also the
  highest ceiling: it inverts the system story, and the pipeline discipline
  it productizes (confidence, holds, nulls) is what separates it from the
  toy easing tools.
- Exit: the ground-truth self-test passes on at least two presets; a
  recording never leaves the browser (verifiable in the network log).
- David's gates: spike verdict is his call; visual pass on the page.

### 9. Public .riv linter page

Drop a `.riv`, get a report: VM contract completeness, named instances,
binding presence, naming conventions — the Item 1 rule set behind a public
surface, running on the web runtime with no MCP dependency. The rules that
need editor-graph access (converter formulas, so "negative literals
parenthesized") stay out of scope until Rive opens the graph, and the page
says so rather than implying coverage it lacks.

- Depends on: Item 1 (rule set). Independent of the package.
- Size: 1–2 sessions.
- Risk: low-medium; the open question is how much of a stranger's file the
  runtime enumerates cleanly, probed in the first hour.
- Exit: our own tile files pass; a doctored copy fails with a specific
  report; e2e row for the route.

---

## Parked (from the earlier ideation, still candidates)

Shareable Token Lab state URLs, embeddable demos, the guided path, the
reduced-motion preview toggle. None blocks or is blocked by this order.
The URL-state item pairs naturally with Item 2's serialization work if a slot
opens.

## Standing constraints that shape every item

Main is production and pushes deploy, so each item lands green on built
output before push; David's visual pass precedes any commit of UI changes;
no new runtime dependencies (emitters are hand-rolled pure functions, same
as the existing stringifiers); protected local files stay untouched.
