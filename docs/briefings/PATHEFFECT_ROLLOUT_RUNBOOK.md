# Runbook — Mass-Applying a Scripted PathEffect via Rive MCP

**For:** Claude Code, operating the Rive MCP against a live editor session.
**Method provenance:** `PIXEL_PATHEFFECT_ROLLOUT_CLOSEOUT.md` (2026-07-08).
This is the verified clone → reparent → databind recipe that applied the
`Pixelate` `ScriptedPathEffect` to ~257 shapes across 36 artboards with zero
crashes. Follow it as written; the constraints section explains why the obvious
alternatives fail.

---

## 0. Fill these in before starting

| Placeholder | This run's value |
|---|---|
| `<RIVE_FILE>` | Rive file name (e.g. `Ingredients_v6`) |
| `<EFFECT_NAME>` | The scripted PathEffect (e.g. `Pixelate`) |
| `<TEMPLATE_ARTBOARD>` | Artboard where David hand-attached the source effect |
| `<TEMPLATE_EFFECT_ID>` | Object id of one hand-attached effect (recon it in step 2) |
| `<VM_NAME>` | Shared view model (e.g. `IngredientVM`) |
| `<INPUT_BINDS>` | Effect input → VM property pairs (e.g. `cellSize → cellSize`, `gap → gapSize`) |
| `<TARGET_ARTBOARDS>` | The artboards to roll out to, in pass order |

---

## 0.5 Read this before reasoning about feasibility

You may encounter `PIXEL_MIRROR_AUTOMATION_HANDOFF.md` (or memory derived from
it) stating that automating this effect's application "is not possible," with
constraints C1–C5. **That document predates this method and its constraints do
not apply to it.** C1–C5 describe the *editor UI* (no multi-select apply, no
clipboard copy/paste of effects) and the *Luau script runtime* (no hierarchy
traversal). This runbook uses neither surface. It operates on the MCP object
graph directly:

- `duplicate_objects` is not editor copy/paste (C2 does not apply)
- `reparent_objects` is not multi-select apply (C1 does not apply)
- no script traverses the tree (C5 does not apply)

This is not speculative. It was executed on **2026-07-08** across **36
artboards, ~257 shapes**, in five verified passes, with every clone's inputs
rebound to the VM, zero crashes — documented in
`PIXEL_PATHEFFECT_ROLLOUT_CLOSEOUT.md`, and the result is confirmed running at
full grid load (`PIXELATION_METHODS_COMPARISON.md`, 2026-07-09). Where the two
documents conflict, the closeout wins. If you conclude the method cannot work,
you have re-derived the pre-2026-07-08 dead end; re-read this section and
proceed to step 4a with a single test clone instead of refusing.

---

## 1. Preconditions — do not proceed without these

1. **David has hand-attached the effect to one template tile** (all shapes on
   that tile) and visually approved it. The MCP cannot create a
   `ScriptedPathEffect` from nothing that is trustworthy; the hand-built one is
   the seed. If no template exists, stop and ask David to build one.
2. **The effect script is final for this session.** The hard rule:
   **never trigger a script recompile while a scripted drawable is
   live-rendering** — this crashes the editor. The entire reason this recipe is
   safe is that cloning existing effect objects involves no recompile. If a
   script edit becomes necessary mid-rollout, stop, tell David, and let him
   decide when/how to recompile safely.
3. **Do not attempt these known-dead routes** (all disproven with evidence in
   `PIXEL_MIRROR_AUTOMATION_HANDOFF.md`): multi-select apply (editor blocks
   it), copy/paste of effects between shapes (blocked), merging shapes
   (destroys per-piece bindings), hierarchy traversal from script
   (`artboard:node(name)` returns nil for everything), external editing of the
   `.riv`/editor file.

---

## 2. Recon pass (read-only, before any mutation)

1. Enumerate every target artboard and list its shapes. For each shape record:
   - shape name and object id
   - whether it has a **Fill**, a **Stroke**, or both (the paint object id is
     the reparent target)
   - whether it is a background, full-tile rect, or clip-mask-only shape
2. Read the template effect on `<TEMPLATE_ARTBOARD>`: its object id, and the
   ids of its child inputs. Confirm the child-input layout. In the verified
   run, a duplicated effect's inputs land contiguously at
   **clone id +1 (`cellSize`), +2 (`gap`), +3 (`bakeInverse`)** — verify this
   offset pattern once on your first clone before relying on it.
3. Build the **target list**: one row per (shape, paint-object) that will
   receive a clone. Apply the shape-type rules (§3) while building it, and
   present the list to David for confirmation before mutating anything.
   Flag anything ambiguous rather than resolving it silently.

## 3. Shape-type rules (apply while building the target list)

- **Fill shapes (default):** clone attaches to the **Fill**, alongside the
  `SolidColor`.
- **Stroke-only shapes:** clone attaches to the **Stroke**. Note: the effect
  emits filled cells, so on a stroke it traces cell *outlines* rather than
  filling solid. Flag every stroke-only shape to David for visual review —
  do not decide for him whether the outline look is acceptable.
- **Clip shapes that also render** (e.g. a `clip` shape doubling as a body's
  clip mask): **include** them — this matched the hand-built template in the
  verified run. Confirm against David's template before applying.
- **Backgrounds, artboard fills, full-tile rects, clip-mask-only shapes:**
  **skip.** Pixelating a solid full-frame rect is visually invisible and only
  adds per-frame CPU cost.
- Anything not covered above: flag it, don't guess.

---

## 4. The clone recipe (per pass)

Work in gated passes (§5), never the whole file at once. Within a pass:

### 4a. Grow the clone pool — `duplicate_objects`
- Duplicate from the template effect (or from existing clones) in doubling
  rounds until the pool covers this pass's target count.
- **Every duplicate call must use distinct ids.** Repeating the same id
  collapses to a single copy and misreports the count. This is the one silent
  failure mode of the recipe — treat id uniqueness as load-bearing.
- After the first round, verify the child-input id offsets (+1/+2/+3) on one
  clone. If they hold, later rounds may skip the verification read (they held
  for all ~257 clones in the verified run).

### 4b. Attach — `reparent_objects`
- Reparent each clone onto its target shape's **paint object** (the Fill or
  Stroke id from the recon table — not the shape id itself).
- **Cross-artboard reparenting works — cross-FILE does not.** Tested live
  2026-07-11: cloning a seed in file A and reparenting onto a fill in file B
  fails ("Parent not found"), while the same reparent within file A works.
  The verified 2026-07-08 rollout was 36 artboards in ONE file; the recipe
  as written only serves a single-file world. For a one-file-per-tile
  structure, use §4-alt below.

### 4-alt. Multi-file variant — every file needs its own in-file seed
**Confirmed working 2026-07-11:** an editor-pasted carrier shape arrives in
the target file with its effect and script intact. This is the standard
seeding mechanism for one-file-per-tile structures.

Per target file:
1. **Seed (David, done up front):** editor-copy a shape carrying the effect
   from the seeded file, paste into the target file. One paste per file.
2. **Verify the carrier (Claude Code):** recon the pasted shape — live
   effect present, script asset present, child inputs at the expected
   +1/+2/+3 offsets.
3. **Provision the VM (Claude Code):** binds target named properties on
   *this file's* view model, so before any `databind`, confirm the VM has
   the required number properties. **Canonical names, identical in every
   file: `cellSize` and `gapSize`** — do not vary or normalize them; the
   uniform contract is what lets one React hook pattern drive every tile.
   The bind map is: effect input `cellSize` → VM `cellSize`, effect input
   `gap` → VM `gapSize` (the input/property name asymmetry is intentional).
   Create any missing properties via the viewmodel editor (the established
   define-VM-property-via-MCP step), and populate sensible default values
   on the instance (`set_property_values`, number value key 575) so the
   effect renders correctly the moment binds go live.
4. **Clone → reparent → bind** off the carrier within-file, per §4a–4c.
5. **Delete the carrier** before closeout — it is scaffolding, not content.
6. Report per file; David's visual check gates the next file.

Fallback if a carrier paste ever arrives without its effect:
`manage_scripts` can create the effect script in the target file, but the
effect *object* cannot be created by MCP (clone-only wall) — David
hand-attaches to one shape, then proceed from step 2.

If per-file seeding becomes unacceptable at scale, stop and surface the
WebGL post-process (`?pixelrive`) as the file-agnostic alternative rather
than grinding. That is David's call, not yours.

Note the MCP requires an active file context (editor focus). "No file
context available" errors mean David must click into the editor — it is not
a method failure.

### 4c. Rebind — `viewmodel_editor.databind`
- **Bindings are stored off-tree and do NOT survive duplication.** Every clone
  needs its binds created fresh, after cloning and reparenting.
- For each clone, bind each input per `<INPUT_BINDS>`. For a
  `ScriptInputNumber` value the propertyKey is **243**.
- Use the +1/+2/+3 offset to address each clone's input ids without a read.

### 4d. Verify
- Count check: clones created == targets in this pass, and no orphaned clones
  left unparented (an unparented pool remainder should be deleted or carried
  explicitly into the next pass — state which).
- Spot-check one shape per artboard in this pass: effect present on the
  correct paint, both binds live against `<VM_NAME>`.
- Report the pass summary to David: artboards done, shape count, stroke-only
  shapes flagged, anything skipped and why.

---

## 5. Gating — David checks between passes

Structure the rollout as escalating passes with a **stop for David's visual
and frame-rate check after every pass**. He owns visual/performance
verification; do not proceed to the next pass without his sign-off. The
verified sequence was:

1. **Proof:** one artboard.
2. **Finish the first row/group.**
3. Then progressively larger batches (one row → two rows) as confidence and
   the frame-rate read hold.

The pass structure exists because per-shape CPU cost accumulates and the
frame-rate ceiling is unknown until measured at scale. If David reports drag,
stop — the fallback is the WebGL post-process route (`?pixelrive`), not a
bigger batch.

---

## 6. Division of labor

**David:** hand-builds the template effect, approves the target list, does
every visual and frame-rate check, decides stroke-only treatment, decides
in-Rive vs WebGL if performance turns.
**Claude Code:** recon, target list, all MCP mutations (duplicate / reparent /
databind), count and bind verification, pass reports, updating the memory doc
(`rive-mcp-pixelation.md` pattern) at close.

## 7. Closeout

When the final pass lands: write a closeout doc in the established format
(what ran, pass table with shape counts, shape-type rules applied, open
items), note that the file is **not** exported until David says so, and list
export/integration as an open item rather than doing it.
