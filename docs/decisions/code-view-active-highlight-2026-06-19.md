# Live code view: highlighting the value whose slider is being dragged

**Date:** 2026-06-19
**Status:** Implemented
**Context:** The Token Lab demo code view (`CodeBlock`) shows the real source behind a demo with each `tokens.<group>.<key>` read resolved to its live value as a trailing comment. Those comments already re-render as the user drags a slider. The remaining gap: with several values ticking, nothing said which one the slider in hand was driving. The goal was to emphasize the value tied to the active slider, then return it to normal the instant the drag ends.

---

## The signal already existed

`ActiveTokenContext` broadcasts which slider is being dragged. `SliderRow` sets it on `onPointerDown` and clears it on `onPointerUp`; `EasingSection` does the same through the visualizer's `onDragStart` / `onDragEnd`. The value is a token key string (`'duration.slow'`, `'easing.enter'`) or `null` when nothing is active.

So no new state was needed. `CodeBlock` reads `useActiveToken()`, and for each line it already parses the token path behind the resolved comment. When a line's path is the active token, that comment gets an emphasis class. The emphasis is purely derived from context: when the drag ends and `activeToken` goes `null`, the class drops on the next render. There is no per-line state that can strand a value in the highlighted form.

---

## The easing / ease boundary

Comparing the active token against a snippet's token path crossed a naming boundary for the first time, and it is worth recording why the boundary exists rather than treating it as a bug.

The codebase carries two consistent naming layers for the easing family:

- **`easing`** is the control / editing layer: the reducer state property (`rawState.easing.standard`), the `SET_EASING` action, the slider config, the active-token keys, and the `TOKEN_COMPONENT_MAP` keys (`'easing.standard'`).
- **`ease`** is the runtime layer: the parsed token object components actually read (`tokens.ease.standard`), the CSS variables (`--motion-ease-*`), and Framer Motion's input shape.

`duration`, `delay`, and `scale` use the same word on both sides. Only the easing family differs. A grep confirmed the split is clean: every occurrence falls into one of the two layers, with no third spelling.

The reason it never surfaced before is that `activeToken` (an `easing.*` key) had only ever been compared against `TOKEN_COMPONENT_MAP` (also `easing.*`). `CodeBlock` is the first place a control-layer key meets a runtime-layer token path.

**Decision: normalize at the boundary, do not refactor.** `tokenPathMatchesActive` in `resolveToken.js` maps the control-layer `easing.` prefix to the runtime `ease.` before comparing. Unifying the two names would touch the reducer, the action type, the slider config, `TOKEN_COMPONENT_MAP`, the preset shape, and the user presets persisted in `localStorage` (which would need a migration, like the existing `migratePresetEasing`). That is real risk for a cosmetic win. The boundary is documented in a comment on the matcher so the next reader sees the intent.

---

## The contrast decision: green in the background, not the text

The accent green means "currently affecting the system," which is what a live value tied to the slider in hand is. The instinct was to color the value green. The contrast audit (`contrast-audit-2026-04-16.md`) rules that out for one of the three themes:

| Mode | Green token | Ratio | Verified for |
|------|-------------|-------|--------------|
| Dark | `#76c17d` | 8.5:1 | text (AAA) |
| HC | `#006810` | 7.0:1 | text (AAA) |
| Light | `#4a9e52` | 3.3:1 | UI / outline only |

Green clears the 3:1 UI threshold in all three themes, but the comment is 12px mono, which is normal text and needs 4.5:1. Light-mode green sits at 3.3:1 and fails as text. Bolding does not lift 12px into the "large text" 3:1 bracket. So uniform green text was out, and theme-conditional green text would have needed a darker light-mode green the audit deliberately avoided.

**Decision: use the green highlight background, not green text.** The active value gets `--color-accent-subtle` (the highlight-background token) behind it, its text lifted from muted to `--color-text-base`, and the weight bumped to 700. The green lives in the background, so the text color stays compliant in every theme. This is the same "active" idiom already used by the selected nav item (`NavColumn.module.css`) and the selected `PrincipleCard`, so it reads as a familiar state rather than a new invention.

Weight-only emphasis was tried first and rejected as too quiet. Weight is kept as a second channel on top of the green chip.

---

## Extension: flashing values changed by presets and named easing curves

The sustained highlight above covers a gesture in progress, where `ActiveTokenContext` names the single token under the slider or curve. Discrete tool-bar actions have no such gesture: loading a preset, picking a named easing curve, reset, and import all change one or more values in a single event with nothing held down. Those values should flash in the same green chip so the user can see what the action moved.

**Decision: detect the change in `CodeBlock`, do not wire a second signal through the tool bar.** `CodeBlock` already re-renders whenever a token value changes, so it watches its own resolved values. It keeps the previous resolved display value for every path the snippet reads and, on change, flashes the paths whose value differs, holding the chip for `FLASH_HOLD_MS` (450ms) before a CSS transition on `.comment` fades it out.

This was chosen over threading a `flashTokens(keys)` setter out of the preset / easing handlers and through a context. That alternative would have meant computing a state diff at each call site, a new context, and a provider owned by `TokenLab`. Detecting the change where the values are already displayed is smaller and covers every source of a value change at once, including reset and import, with no per-source wiring.

**The one rule that keeps the two mechanisms from colliding.** A value under an in-progress drag is excluded from the flash. During a slider or curve drag the value changes on every tick while `activeToken` names it, so the flash path filters out any changed path that `tokenPathMatchesActive` says is the active token. The drag keeps its sustained highlight; only changes with no active drag flash. After a drag ends there is no further value change, so releasing a slider does not trigger a trailing flash.

The flash effect is keyed on a value fingerprint (`sig`), so it runs only when a displayed value actually changes, not on the re-render caused by clearing the flash. The first commit establishes the baseline without flashing, so opening a code view does not light everything up.

---

## Files touched

- `src/components/CodeBlock/resolveToken.js` — `tokenPathMatchesActive`, the single point where the `easing` / `ease` layers are reconciled.
- `src/components/CodeBlock/resolveToken.test.js` — matcher tests, including the `easing.enter` to `ease.enter` normalization.
- `src/components/CodeBlock/index.jsx` — reads `useActiveToken()`, applies the active class per line, separating space moved outside the comment span so the chip wraps only the comment text. Flash effect: tracks previous resolved values, flashes changed paths excluding the one under an active drag, clears on a timer.
- `src/components/CodeBlock/CodeBlock.module.css` — `.commentActive` (accent-subtle background, base text color, weight 700); `.comment` carries a background/color transition so the flash fades out.

## Left unchanged on purpose

The two naming layers (`easing` control / `ease` runtime) stay as they are. They are each internally consistent; only the one boundary point in `resolveToken.js` reconciles them.

Keyboard adjustment of a slider (arrow keys) changes the value but fires no pointer event, so it does not trigger the highlight. This is a property of how `activeToken` is wired across the whole tool, not specific to this feature, and was left as is.
