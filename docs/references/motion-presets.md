# Motion Presets — Token Values

The three built-in presets and their token values. Standard is the baseline (its
state is `INITIAL_STATE`); Snappy and Cinematic are the two personality
contrasts. This document is a readable mirror of `src/data/motionPresets.js`,
which is the source of truth. When a preset value changes there, update the
matching cell here.

Standard was labeled Default until 2026-07-16. The rename aligns the preset
family with Motion Tiles' Snappy / Standard / Cinematic: the same three
personalities in both tools, each tool interpreting them in its own terms. The
scoping decision (shared names, deliberately separate control vocabularies) is
recorded in `docs/decisions/motion-tiles-integration-2026-07-13.md`.

Related: `docs/token-architecture.md` (what the tokens are, how to add one),
CLAUDE.md "Core Architecture Principle" (the read-at-runtime rule).

---

## Editable tokens per preset

These are the tokens the tool bar exposes a control for. A preset stores a value
for each.

| Token | Standard | Snappy | Cinematic |
|---|---|---|---|
| **Duration** (ms) | | | |
| `duration.fast` | 100 | 60 | 200 |
| `duration.base` | 200 | 120 | 500 |
| `duration.slow` | 400 | 200 | 900 |
| `duration.slower` | 600 | 350 | 1400 |
| **Easing** (editable slots) | | | |
| `ease.standard` | Standard `(0.4, 0, 0.2, 1)` | Overshoot `(0.34, 1.56, 0.64, 1)` | Enter `(0, 0, 0.2, 1)` |
| `ease.enter` | Enter `(0, 0, 0.2, 1)` | Enter `(0, 0, 0.2, 1)` | Enter `(0, 0, 0.2, 1)` |
| `ease.exit` | Exit `(0.4, 0, 1, 1)` | Exit `(0.4, 0, 1, 1)` | Exit `(0.4, 0, 1, 1)` |
| **Delay** (ms) | | | |
| `delay.short` | 50 | 20 | 100 |
| `delay.medium` | 100 | 40 | 200 |
| `delay.long` | 200 | 80 | 400 |
| **Scale** (unitless) | | | |
| `scale.subtle` | 0.98 | 0.97 | 0.99 |
| `scale.base` | 0.95 | 0.93 | 0.97 |
| `scale.expressive` | 0.90 | 0.87 | 0.94 |
| `scale.lift` | 1.02 | 1.04 | 1.01 |

## Spring (physics)

A real spring, added 2026-07-20. Unlike `ease.overshoot`, it is not time-based:
it has no duration. Stiffness, damping, and mass define it, and its settle time
emerges from those. Framer Motion consumes it as `{ type: 'spring', stiffness,
damping, mass }`. The three params are unitless numbers, so they read from the
`--motion-spring-*` custom properties at runtime like every other token.

| Param (unitless) | Standard | Snappy | Cinematic |
|---|---|---|---|
| `spring.stiffness` | 400 | 600 | 180 |
| `spring.damping` | 30 | 22 | 26 |
| `spring.mass` | 1 | 1 | 1.2 |

Standard settles cleanly with a hint of overshoot. Snappy is stiffer and lighter,
so it bounces harder and arrives faster. Cinematic is soft and heavy, a slow
arrival with almost no bounce. The values are tuned by feel against the live
SpringDemo, not by table.

Spring varies per preset, like duration, so it lives in each preset's state and
resolves per preset. It is an editable-class token (in `EDITABLE_TOKEN_SCHEMA`,
round-trips through import), but it has no slider yet: the spring editor UI and a
settle-curve visualizer are a deferred follow-up. Until then it is set only by
switching presets. The SpringDemo in Token Lab's Press & State group is the
consumer that reads it.

## Fixed constants

Not editable through the tool. Identical across every preset, resolved in
`stateToTokens`. They are real tokens in `motion.css` and are included in exports
so a Cadence token file is complete, but no slider reaches them.

| Token | Value |
|---|---|
| `ease.linear` | `cubic-bezier(0, 0, 1, 1)` |
| `delay.none` | 0 |

`ease.overshoot` was a fixed constant until 2026-07-08. It is now an editable
slot, unlocked in Explore mode (its `y = 1.56` handle needs the visualizer's
extended vertical range). In constrained mode it stays at the named overshoot
curve, so it reads as an anchor there; toggling Explore off resets it. It is in
`EDITABLE_TOKEN_SCHEMA`, not `FIXED_REFERENCE_PATHS`.

---

## Named easing curves

The five curves the easing slots resolve to (`EASING_CURVES` in
`motionPresets.js`). Each has a CSS `cubic-bezier()` form and a Framer Motion
four-number form.

| Curve | Bezier | Character |
|---|---|---|
| Linear | `(0, 0, 1, 1)` | Constant velocity, no acceleration. |
| Standard | `(0.4, 0, 0.2, 1)` | Symmetric ease-in-out, the neutral default. |
| Enter | `(0, 0, 0.2, 1)` | Decelerate into rest, for elements arriving. |
| Exit | `(0.4, 0, 1, 1)` | Accelerate away, for elements leaving. |
| Overshoot | `(0.34, 1.56, 0.64, 1)` | Overshoot past target then settle. A bezier approximation of a spring, not a real spring (renamed from `spring` 2026-07-08; a cubic-bezier has a fixed duration, a spring does not). |

---

## Reading the presets

- **Only `ease.standard` moves between presets.** `enter` and `exit` are pinned
  to their default curves in all three. Bending them per preset would dilute the
  contrast each personality is built on: Snappy swaps standard to Spring
  (confident overshoot), Cinematic swaps standard to Enter (general motion
  decelerates into rest).
- **The personalities read mainly through duration and delay**, with scale as a
  secondary amplifier. Snappy compresses harder and lifts higher; Cinematic
  barely moves.
- **Standard is the "ships unmodified in most design systems" baseline** (its
  tooltip): the 100 / 200 / 400 / 600 duration ladder and the standard / enter /
  exit easing triad. It is what loads on open, so it is the tool's first
  impression.
