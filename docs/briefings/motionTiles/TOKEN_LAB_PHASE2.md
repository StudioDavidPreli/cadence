# Token Lab Ingredients — Phase 2 Handoff: Multi-Master & the Cascade Feature

The suite (phase 1) shipped: 16 originals + 20 colorway instances, one composition, one driver, tokens `speed`/`easing`, palettes on VM instances — see `TOKEN_LAB_CLOSEOUT.md` and `TOKEN_LAB_WORKFLOW.md`. Phase 2 extends it along two axes established in the closing design sessions: **multiple master artboards** and **time as a token** — per-cell phase offsets making boards sync, ramp, or ripple, driven from React.

---

## 1. Facts & rules established (multi-master)

- **The driver is portable and multi-instance safe.** Each compDriver node resolves the VM of *its own host artboard's* data context and keeps its own clock. Drive any artboard by linking it to its **own VM instance** and adding a node. (Header of `composition_driver.lua` documents this.)
- **The one hard rule: never point two driver instances at the same VM instance.** Both write `progress` with independent clocks — last-writer-wins with a phase offset; stutter or silent domination.
- **One VM can drive any number of artboards** (the fan-out, proven at 36). For two masters sharing one beat *in one runtime*: nest both under a parent, **one** driver, fan `progress` into both — option 3 stacks hierarchically.
- **Deployment fact:** one Rive runtime renders one artboard. Two canvases = two runtimes = *separate copies* of "the same" VM instance. Per-canvas drivers give approximate parallel timing that never re-converges after load stagger or throttling.
- **True cross-canvas harmony = promote the clock to React**: one rAF loop running the driver's math in JS, writing `progress` into every runtime's VM via the same hooks that write `speed`/`easing`. Those boards then carry **no driver at all** — pure fan-out artboards. One clock in the universe; tokens unchanged.

Decision table: same canvas → one driver, parent fan-out · two canvases, approximate sync OK → one driver each, separate instances, matched tokens · two canvases, guaranteed harmony → React clock, no Lua drivers.

## 2. The cascade feature — design

Per-cell offsets of the shared beat, weighted by position, scaled by one React-driven number.

- **`spread`** (number, on the composition VM): the single token. 0 = perfect sync (feature off; degrades to phase-1 behavior). 0.5 = half-cycle cascade across the grid. Per-cell offset = `spread × w_cell`.
- **Weight tables** (spatial distribution eased with the house family, k = 1.70 — the wave lingers at its origin, whips through the middle, settles at the far end):

**Diagonal ramp** — corner-to-corner, **11 distinct classes** (class = row+col):

| | c1 | c2 | c3 | c4 | c5 | c6 |
|---|---|---|---|---|---|---|
| r1 | 0.000 | 0.023 | 0.087 | 0.191 | 0.334 | 0.500 |
| r2 | 0.023 | 0.087 | 0.191 | 0.334 | 0.500 | 0.666 |
| r3 | 0.087 | 0.191 | 0.334 | 0.500 | 0.666 | 0.809 |
| r4 | 0.191 | 0.334 | 0.500 | 0.666 | 0.809 | 0.913 |
| r5 | 0.334 | 0.500 | 0.666 | 0.809 | 0.913 | 0.977 |
| r6 | 0.500 | 0.666 | 0.809 | 0.913 | 0.977 | 1.000 |

**Radial ripple** — from grid center, **6 distinct rings**:

| | c1 | c2 | c3 | c4 | c5 | c6 |
|---|---|---|---|---|---|---|
| r1 | 1.000 | 0.933 | 0.834 | 0.834 | 0.933 | 1.000 |
| r2 | 0.933 | 0.666 | 0.411 | 0.411 | 0.666 | 0.933 |
| r3 | 0.834 | 0.411 | 0.087 | 0.087 | 0.411 | 0.834 |
| r4 | 0.834 | 0.411 | 0.087 | 0.087 | 0.411 | 0.834 |
| r5 | 0.933 | 0.666 | 0.411 | 0.411 | 0.666 | 0.933 |
| r6 | 1.000 | 0.933 | 0.834 | 0.834 | 0.933 | 1.000 |

Ring order (ripple, center-out): 0.087 → 0.411 → 0.666 → 0.834 → 0.933 → 1.000. A per-effect spatial-k is a candidate future token; regenerating the tables is one function call.

## 3. The correction that shapes the implementation — READ BEFORE BUILDING

**Do not implement offsets as `fmod(progress + offset, 1)` converters.** `progress` is the eased *output wave, holds included*; shifting the output maps the master's holds onto **frozen mid-transition poses** (an offset-0.5 cell sits locked halfway through its swap for the entire hold) plus two hard snaps per cycle. This superseded an earlier suggestion in conversation — the record is here so it isn't rediscovered. A cascade delays the **clock**, not the wave: offsets live in phase domain, before `cycleProgress`.

## 4. Driver v4 — the class-based publisher

The distinct-class structure (6 or 11 values, not 36) makes the phase-domain implementation cheap and keeps it entirely inside verified machinery (VM number writes + fan-out). The driver grows one loop:

```lua
-- constants: WEIGHTS = { 0.0, 0.023, 0.087, ... }  (one entry per class; class 1 = w 0)
-- VM gains: spread (number, React-driven), progress_1 .. progress_N (numbers, driver-written)
local spread = vmi:getNumber('spread').value
for k, w in WEIGHTS do
    local phk = (ph - spread * w) % 1.0
    vmi:getNumber('progress_' .. k).value = cycleProgress(phk, easing)
end
```

- Each cell's **fan-out binding retargets once** to its class's `progress_k`. Sync boards (and class-1 cells) bind `progress_1` (w = 0 ≡ today's `progress`).
- `spread` = 0 makes every class identical — bit-exact degradation to phase 1.
- Holds, easing, and the reverse leg are exact per cell (each class runs the true cycle function on its own shifted phase).
- v4 breaks the "driver never changes again" promise for the honorable reason: a new feature, not an analysis outcome. The invariance test still holds in spirit — no *ingredient* work ever touches it.

**v4 pilot (cheapest-first, before retargeting 36 bindings):** (1) two published numbers, two cells bound to different classes, spread hand-scrubbed — verify offset cells **hold at poses** (the §3 regression) and the wave reads; (2) N-writes-per-frame load check (same verified write form ×11 — low risk, confirm anyway); (3) spread live from React; (4) reverse leg at an offset cell.

Note: `progress_' .. k` string concatenation in the getNumber lookup is the one micro-unknown (per-frame string building in Luau — trivially avoidable by pre-building the name list in init if it matters).

## 5. React contract additions

- `spread` joins `speed`/`easing` on the composition VM — same `useViewModelInstanceNumber` write path; clamp to [0, 1]; animate it for "wave in/out" moments (a MotionValue sweeping spread 0 → 0.4 → 0 makes the grid ripple once and re-synchronize).
- Per-board character: each master's own VM instance carries its own `spread` (and weight-table choice is baked per board via which classes its bindings target) — "some boards synced, others cascade" is just per-board spread values.
- Cross-canvas React-clock variant (§1) composes with cascade: the JS clock computes the per-class values and writes them into each runtime.

## 6. Inherited open items

- **Preset-switch mechanism at composition level** — RESOLVED (2026-07-08). Each `IngredientVM` instance bakes its own palette and its own speed/easing; binding one instance at the `Parametric` composition fans out to all 36 cells and recolors + retimes in one move. Proven in React (`TOKEN_LAB_INGREDIENTS.md` §6). `spread` joins the same instances as a per-preset number, per §5.
- **snappy / cinematic values** remain [proposed] — tune against the live grid; cascade adds a third number to each preset's personality.
- **r2c6 vertex-bindability outcome** — record which mechanism shipped (vertex binding vs timeline fallback) in `TOKEN_LAB_WORKFLOW.md` §7; it's the toolkit's one unrecorded verdict.

## 7. Session kickoff prompts

**Driver v4 build:**
> Token Lab phase 2: write composition_driver v4 per the cascade handoff — class-based progress publisher, WEIGHTS table [diagonal|ripple], spread from the VM. Then walk the v4 pilot.

**New master board:**
> Adding a master artboard [synced to X / independent / cascaded]. Per the handoff decision table: which clock arrangement, and the setup steps.

**Cross-canvas:**
> Two canvases need guaranteed harmony — port the clock to React per §1/§5: the cycleProgress JS, the rAF loop, and the per-runtime write wiring.
