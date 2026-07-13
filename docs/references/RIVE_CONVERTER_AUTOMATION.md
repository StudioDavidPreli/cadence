# Rive Converter Automation — Introspection & Reproduction Questions

**Date:** 2026-07-09
**Context:** the single-file ingredient grid drives each shape through a data-bind
converter whose formula embeds the VM reference literally
(`1.0 - {{PathEffectVM/progress}}*0.394`). A spatial cascade would require
rewriting that reference per position across ~257 converters. The question was
whether the Rive MCP could automate that the way it automated the `Pixelate`
effect rollout. This document answers what this session could answer and marks
the rest open.

**Why several answers are "open."** The project pivoted to the 36-file / React-clock
architecture (see `../briefings/INGREDIENT_GRID_CASCADE_CLOSEOUT.md`), which makes
converter editing unnecessary for the shipped grid. The investigation stopped once
that fork resolved, so the converter object itself was never dissected. These
answers matter only to a future effort that revisits in-Rive per-shape offset.

**Why the converter object was never read.** Data-binds and converters are stored
**off-tree**: `find_objects type:"converter"` on a bound artboard (r1c4) returned
empty, and `get_artboard_hierarchy` does not list them either (a documented MCP
behavior — see the `rive-mcp-pixelation` memory). There is, though, a read path
this session did not exercise: prior-session notes record that
`modifyDataBind(objectId, propertyKey)` called with **no changes** returns the
bind's `direction` and `converterId`. So the converterId is retrievable, and the
converter object could then be queried by id. The introspection questions below are
answerable; they were left once the 36-file pivot made converter editing
unnecessary, not because the tooling forbids it. (That `modifyDataBind` read
behavior is from an earlier session and was not re-verified here.)

---

## Introspection — how is a converted bind actually stored?

### Q1. Flat string, or operand tree? (the decisive one)
**Status: OPEN, but reachable.** No converter object was read this session. It is
retrievable: `modifyDataBind(objectId, propertyKey)` returns the `converterId`
(per prior-session notes), then `query_property_keys` / `query_property_values` on
that id would show whether the expression is a settable string or an operand tree.
This was left undone once the pivot made it moot, not blocked.

Lean, unverified: an **operand/expression with a bound operand**, not a flat
settable string. The editor shows `{{PathEffectVM/progress}}` inline in the
expression, and Rive's data-bind model resolves VM references as bound operands
rather than as substring text. If that holds, reproducing a converter is much
heavier than a string set, and that alone tips the fork toward the 36-file /
JS-clock route (which it did, on other grounds too). **Verify before trusting.**

### Q2. Single `converterId`, or `DataConverterGroup` + ordered `GroupItem` children?
**Status: PARTIAL.** The bind → converter attach point is a **single
`converterId`**: `viewmodel_editor.modifyDataBind` exposes one `converterId` field
(plus `direction`, `once`, `sourceToTargetRunsFirst`, `twoWay`). Whether the object
that id points to is a lone converter or a `DataConverterGroup` chaining ordered
`GroupItem`s was **not** determined — that requires reading the converter object
(blocked as in Q1).

### Q3. Converter type key + formula property key.
**Status: OPEN.** No converter object was read, so neither the concrete converter
type key (for any create op) nor the property key holding the expression is known.
The analog we would need is the `propertyKey 243` used for a `ScriptInputNumber`
value in the Pixelate rollout; the converter equivalents are unknown.

---

## Reproduction — can the MCP build what it just read?

### Q4. Create — does a creation op accept the converter type key and let you set its expression?
**Status: ANSWERED, no.** The MCP **cannot create data converters from scratch**;
they must be cloned from an existing instance (documented in the
`rive-mcp-pixelation` memory: "the MCP can CREATE data-binds but NOT data
converters, nor path-effect/scripted-drawable instances from scratch — those must
be cloned"). So reproduction is a clone-and-rewrite recipe, never a build-from-type
one, which makes Q1 (is the expression a rewritable string?) and Q6 (does the
clone keep its converter?) the load-bearing unknowns.

### Q5. Attach — one call, or two steps?
**Status: ANSWERED. Two steps.** `viewmodel_editor.databind` binds
`{objectId, propertyKey, viewModelPropertyId}` with **no converter argument**, so
the source bind and the converter are separate operations: `databind` first, then
`modifyDataBind` with a `converterId` to attach an existing converter. This mirrors
the rollout's "binds are stored off-tree and created after cloning" pattern. It is
moot without a converter to attach (Q4).

### Q6. Survival under duplication.
**Status: OPEN, untested.** Binds are known **not** to survive `duplicate_objects`
(established in the Pixelate rollout). Whether a converter object survives
duplication — attached, detached, or gone — was not tested. This is what would pick
the scale-out recipe (clone-then-rewrite-per-piece vs recreate-fresh-per-piece),
but it sits downstream of Q1 and Q4, which are unresolved.

---

## Addressing — does the name → object map hold?

### Q7. Target resolution + property keys.
**Status: ANSWERED.** The MCP addresses objects by **object id**, obtained from
`get_artboard_hierarchy` / `find_objects`, both of which return id, name, and type
together. `find_objects` also matches a **name substring**, so the MCP *can*
resolve name → id even though the Rive runtime cannot (constraint C5). An emitter
would **not** need a separate name → id map; the hierarchy is that map.

Property keys come from `query_property_keys`, which returns a name → key map per
object. Observed on the tile transform nodes:

| property | key |
|---|---|
| Position X | 13 |
| Position Y | 14 |
| Rotation | 15 |
| Scale X | 16 |
| Scale Y | 17 |
| Opacity | 18 |

So **Position X = 13, Opacity = 18** for these Node objects. Keys are per object
type; confirm against the target object with `query_property_keys` rather than
assuming.

### Q8. Formula dialect.
**Status: OPEN.** No formula was ever set through the MCP (no path to, per Q4), so
whether the expression parser accepts the editor's syntax when set programmatically
— `min(max(...))`, decimal literals, the parenthesized-negative rule, escaping — is
untested.

---

## Summary

| Question | Status |
|---|---|
| Q1 flat string vs operand tree | **OPEN** (decisive; lean: operand tree) |
| Q2 converterId vs group chain | PARTIAL (single `converterId` attach; internals unread) |
| Q3 type key + formula property key | OPEN (reachable via `modifyDataBind` → converterId) |
| Q4 create a converter | **ANSWERED** — cannot create, clone-only |
| Q5 attach one-call vs two-step | **ANSWERED** (two-step) |
| Q6 survival under duplication | OPEN (untested; decisive given clone-only) |
| Q7 target resolution + keys | **ANSWERED** (id-based; X=13, Opacity=18) |
| Q8 formula dialect | OPEN |

## To close the open ones (order matters)

1. **Get the converterId.** `modifyDataBind(objectId, propertyKey)` with no changes
   returns the bind's `converterId` (prior-session behavior; re-verify). That is the
   handle `find_objects` could not give, since converters are off-tree.
2. **Read the converter object.** `query_property_keys` then `query_property_values`
   on that id → answers Q1 (string vs tree), Q2 (group or not), Q3 (type + expression
   keys).
3. **Set its expression** with `set_property_values`, if Q1 shows a settable string
   → answers Q8 (dialect).
4. **Duplicate a bound shape** and inspect the clone's converter → answers Q6, the
   decisive one now that Q4 is settled clone-only.
