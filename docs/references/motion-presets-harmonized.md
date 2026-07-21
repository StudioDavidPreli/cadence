# Motion Presets — Industry-Harmonized Token Values

An updated pass on the preset table, harmonized against Material (Google) and
Carbon (IBM). The goal is not to clone either system. It is to match their naming
and easing lineage where that reads more clearly, keep Cadence's four-step
simplifications where the reference systems are just more granular than a teaching
tool needs, and fix the one place Cadence was calling a thing what it is not: the
spring.

Four decisions carry judgment calls. They are listed at the end under **Decisions
and tradeoffs**. The rest is safe to adopt as-is.

Source of truth stays `src/data/motionPresets.js`. This file mirrors it.

---

## Editable tokens per preset

The tokens the tool bar exposes a control for. One change from the original: the
curve formerly called **Spring** is renamed **Overshoot**, because a cubic-bezier
is not a spring (see the Spring section below).

| Token | Default | Snappy | Cinematic |
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
| **Scale — press** (≤ 1, compression) | | | |
| `scale.press.subtle` | 0.98 | 0.97 | 0.99 |
| `scale.press.base` | 0.95 | 0.93 | 0.97 |
| `scale.press.expressive` | 0.90 | 0.87 | 0.94 |
| **Scale — lift** (≥ 1, elevation) | | | |
| `scale.lift` | 1.02 | 1.04 | 1.01 |

Duration values are unchanged. The Default ladder is a four-stop subset of Material
3's own scale: 100 / 200 / 400 / 600 map to M3's `short2`, `short4`, `medium4`, and
`long4`. Keeping four steps is deliberate. Material ships twelve for production
granularity; a tool teaching legibility wants few, distinct steps.

---

## Named easing curves

The curves the easing slots resolve to, now carrying their cross-system aliases and
their lineage. Cadence uses the widely-deployed Material 2-era values because they
read more clearly at a glance than Material 3's flatter revision. The M3 column is
the current-Material alternative if you decide to move to it (Decision 1).

The M3 column is Material 3's *standard* easing tier, the one expressible as a
single cubic-bezier and verified against Material's own component docs. M3's
flagship is *emphasized*, whose full form is a two-segment SVG path that no single
cubic-bezier can represent; its decelerate and accelerate halves are
`(0.05, 0.7, 0.1, 1)` and `(0.3, 0, 0.8, 0.15)`. Naming the column "M3 standard"
preempts the objection that this is not what M3 ships for hero transitions: it is
the standard tier, chosen deliberately because it maps one-to-one onto Cadence's
bezier slots.

| Curve | Cadence bezier (M2 lineage) | M3 standard | Cross-system role | Character |
|---|---|---|---|---|
| Linear | `(0, 0, 1, 1)` | same | — | Constant velocity, no acceleration. |
| Standard | `(0.4, 0, 0.2, 1)` | `(0.2, 0, 0, 1)` | Material standard, Carbon standard | Symmetric ease-in-out, the neutral default. |
| Enter | `(0, 0, 0.2, 1)` | `(0, 0, 0, 1)` | Material decelerate, Carbon entrance, CSS ease-out, AE arriving | Decelerate into rest, for elements arriving. |
| Exit | `(0.4, 0, 1, 1)` | `(0.3, 0, 1, 1)` | Material accelerate, Carbon exit, CSS ease-in, AE leaving | Accelerate away, for elements leaving. |
| Overshoot | `(0.34, 1.56, 0.64, 1)` | M3 uses a physics spring here | — | Bezier approximation of spring overshoot. Not a real spring. |

The Enter and Exit aliases matter for hiring-manager reading: a designer coming
from Material calls these decelerate and accelerate, a Carbon user calls them
entrance and exit, an After Effects user thinks in ease-out and ease-in. Same
*role*, four vocabularies: the exact bezier differs between systems (Carbon's
entrance is roughly `(0, 0, 0.38, 0.9)`, not Cadence's `(0, 0, 0.2, 1)`; CSS
`ease-out` is `(0, 0, 0.58, 1)`). The harmonization is on role and name, not on
identical control points. Claiming value-equality is the one thing a Carbon- or
CSS-literate reviewer would catch.

---

## Spring (physics): shipped 2026-07-20 (scope A)

> **Shipped, David, 2026-07-20.** The fixed spring family landed:
> `--motion-spring-stiffness / -damping / -mass` in `motion.css`, per-preset
> values in the three presets, all three exports (DTCG as `number` leaves under
> `motion.spring`, flat, CSS), import with per-key bounds and a positive-value
> validity gate, and one consumer (the SpringDemo in Token Lab's Press & State
> group). `ease.overshoot` stayed. The starting values below were the first pass;
> David tunes them by feel against the live demo. Standard was tuned to
> 170 / 20 / 1.5 (stiffness / damping / mass) on 2026-07-20; the table below keeps
> the first-pass numbers as the proposal record, and `motion-presets.md` mirrors
> the shipped values. The spring editor sliders and the settle-curve visualizer
> (once deferred to scope B) shipped the same day. Record:
> `docs/decisions/physics-spring-2026-07-20.md`.

The problem the rename exposes: a cubic-bezier cannot be a spring. A real spring is
not time-based. It has no fixed duration. It is defined by stiffness, damping, and
mass, and its settle time emerges from those. `(0.34, 1.56, 0.64, 1)` gives the
*look* of overshoot on a fixed timeline, which is why it is now honestly called
Overshoot.

Material 3 Expressive (2025) moved its expressive motion to a physics-spring system,
so a real spring is where the industry is heading. Cadence can follow it without
breaking the read-at-runtime rule, because spring parameters are just unitless
numbers and unitless numbers live fine in CSS custom properties.

```css
:root {
  --motion-spring-stiffness: 400;
  --motion-spring-damping: 30;
  --motion-spring-mass: 1;
}
```

```javascript
const stiffness = parseFloat(
  getComputedStyle(document.documentElement)
    .getPropertyValue('--motion-spring-stiffness')
);
// consumed by Framer Motion as { type: 'spring', stiffness, damping, mass }
```

The CSS is still the source of truth, still read on mount, still theme-aware. The
token-fidelity rule holds. What changes is that Framer Motion consumes a spring
config instead of a duration plus a bezier.

Per preset, as starting values. Springs are tuned by feel, not by table, so treat
these as the first pass to sit and adjust against the components:

| Param | Default | Snappy | Cinematic |
|---|---|---|---|
| `spring.stiffness` | 400 | 600 | 180 |
| `spring.damping` | 30 | 22 | 26 |
| `spring.mass` | 1 | 1 | 1.2 |

Default settles cleanly with a hint of overshoot. Snappy is stiffer and bounces
harder. Cinematic is soft and heavy, a slow arrival with almost no bounce.

This is the strongest case-study beat in the whole table. It is the difference
between a designer who copies a bezier labeled "spring" and one who knows why that
label lies. Requires JS-side work, so it is opt-in (Decision 2).

---

## Delay

Kept as-is. Worth knowing: neither Material nor Carbon ships a named delay scale.
Delay usually lives in choreography and stagger logic, not as a token. Cadence adds
it, and that addition earns its place in a tool teaching choreography, where naming
the stagger steps makes sequence systematizable the same way duration is.

One framing note for the tool copy: delay is a choreography primitive for staggering
siblings, not something to put in front of a single element's response to input.
There it just reads as lag.

---

## Fixed constants

Not editable through the tool. Identical across every preset, resolved in
`stateToTokens`. Real tokens in `motion.css`, included in exports so a Cadence token
file is complete, but no slider reaches them.

| Token | Value |
|---|---|
| `ease.linear` | `cubic-bezier(0, 0, 1, 1)` |
| `ease.overshoot` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `delay.none` | 0 |

`ease.overshoot` is the renamed `ease.spring`. If you add the physics spring family
above, this bezier constant stays anyway: it is the CSS-only fallback for anything
that cannot run a JS spring, and it is what the reduced-motion path can fall back to.

---

## Companion mechanism — duration scalar

> **Shipped, David, 2026-07-21.** `--motion-duration-scalar` landed as a single
> editable, exportable token (effective = base × scalar), consumed only by the
> distance-and-speed visualizer, which turned out to already exist as
> `DurationVisualizer` in Token Lab's Duration section. The session made that
> demo's hardcoded scaling a real token rather than building a second graphic.
> No shipped component multiplies by it. The pattern carries no source
> attribution (see the removed-attribution note below). Record:
> `docs/decisions/duration-scalar-2026-07-21.md`.

Not a preset value, but the natural home for your planned distance-and-speed
visualizer. Both Material and Carbon insist duration should scale with distance
travelled rather than stay fixed. Fixed tokens are the one place Cadence's model
simplifies away from both.

Several design systems solve this with a single duration-scalar custom property
that multiplies every duration at runtime. The same idea gives your visualizer a
real hook: a scalar the user scrubs, or one computed from a live distance
measurement, that modulates the duration tokens without touching their base values.
(Earlier drafts of this doc attributed the pattern to a specific system by name;
that attribution could not be verified and was removed. If you want to cite one,
confirm the system, its token prefix, and the exact property first.)

```css
:root { --motion-duration-scalar: 1; }
/* effective duration = base * scalar, read at runtime */
```

A scalar keeps token fidelity intact: the tokens stay the source of truth, the
scalar is a documented multiplier on top, not a hardcoded distance baked into a
component.

---

## Reading the presets

- **Only `ease.standard` moves between presets.** Enter and Exit stay pinned across
  all three. This diverges from Carbon, which swaps all three roles between its
  productive and expressive modes. The divergence is deliberate (Decision 4): Enter
  decelerating into rest and Exit accelerating away encode physical correctness that
  should not change with personality. Things that arrive settle. Things that leave
  speed off. Personality lives in duration, in the standard curve, and in scale.
  Pinning Enter and Exit keeps the "arrivals always decelerate" lesson legible,
  which a teaching tool wants and which Carbon, built for production, does not need
  to protect.
- **Personalities read mainly through duration and the standard curve**, with scale
  as a secondary amplifier. Snappy compresses harder, lifts higher, and overshoots.
  Cinematic barely moves and decelerates into everything.
- **Default is the "ships unmodified in most design systems" baseline.** The
  100 / 200 / 400 / 600 ladder and the standard / enter / exit triad. It loads on
  open, so it is the tool's first impression.

---

## Decisions and tradeoffs

Four calls in this pass. The first two want your confirmation. The last two are
lower stakes.

**1. Easing lineage: kept Material 2 values as the default.** Cadence's
`(0.4, 0, 0.2, 1)` standard triad is the M2-era set. M3 revised its standard curve
to `(0.2, 0, 0, 1)` and moved its flagship transitions to the path-based
*emphasized* set (not a single cubic-bezier). I kept M2 because it reads more
clearly for teaching and is still the most widely deployed easing on the production
web. The M3 standard values are in the curve table if you want to move current. The
trap to avoid is not the choice, it is not knowing there was one. Confirm M2, or
switch to M3.

> **Confirmed M2, David, 2026-07-16.** The reasoning above stands as written:
> the M2 triad is the clearer teaching curve and the production-web norm, and
> the tool's first job is teaching. The M3 values stay in the curve table as
> the documented alternative. Nothing retimes.

**2. Spring honesty: renamed the bezier to Overshoot, proposed a real spring
family.** The rename is safe and I would ship it regardless. The physics-spring
family is optional because it needs JS-side work (Framer Motion spring config, a new
read path for three params). It is the highest-value addition for the case study.
Confirm whether to build the physics family now or keep only the honest rename.

> **Built, David, 2026-07-20 (scope A).** The rename shipped 2026-07-08; the
> physics family shipped now, as a fixed family with one consumer. The spring
> editor UI and settle-curve visualizer are deferred to scope B. See the Spring
> section above and `docs/decisions/physics-spring-2026-07-20.md`.

**3. Scale split into press and lift.** The original mixed two directions in one
family: subtle, base, and expressive are compression below 1, while lift sits above
1. I grouped them as `scale.press.*` and `scale.lift` so direction is legible and
"base" no longer implies the neutral 1.0. Values are unchanged. If the rename churn
is not worth it right now, the fallback is to keep the flat names and just document
the two directions. Neither Material nor Carbon ships a scale token family, so there
is no external standard to match here. This is internal legibility only.

> **Shipped, David, 2026-07-21.** The rename landed as the flat, straight
> 1:1 mapping: `scale.subtle/base/expressive` became
> `scale.pressSubtle/pressBase/pressExpressive`; `scale.lift` was unchanged.
> CSS custom properties are kebab (`--motion-scale-press-subtle`); the JS /
> state / JSON keys are camelCase (`pressSubtle`), bridged by
> `tokenKeyToCssSuffix` at every dynamic `--motion-*` write. An old-named export
> imports through a key alias that preserves the tuned value and reports the
> rename (David's fork-2 call); saved presets migrate at Token Lab load through
> `migratePresetScale`. `motion-presets.md` mirrors the shipped keys. The nested
> spellings in this doc's tables (`scale.press.subtle`) are kept as the
> proposal's record, not the shipped spelling. Record:
> `docs/decisions/scale-rename-2026-07-21.md`.

**4. Preset enter/exit pinning: kept it, against Carbon's model.** Documented above.
I defended the current behavior rather than harmonizing to Carbon, because the
teaching context justifies the divergence. If you would rather vary all three curves
per preset the way Carbon does, that is a coherent alternative, at the cost of the
"arrivals always decelerate" lesson.
