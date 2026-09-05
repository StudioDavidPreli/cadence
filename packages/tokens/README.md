# cadence-tokens

The Cadence motion token system as a package: three motion personalities (Snappy, Standard, Cinematic) with emitters for CSS custom properties, DTCG, flat JSON, Framer Motion, and Rive view-model defaults.

The values were tuned live in [Cadence](https://cadence.davidpreli.com), a motion design system explorer where the same tokens drive twenty UI components in real time. The site imports this package, so what you install is not a copy of the system; it is the system.

## Install

```
npm install cadence-tokens
```

The package version is the token system's version. A tuning change is a release.

## Use it from JavaScript

```js
import { presets } from 'cadence-tokens'

const { tokens } = presets.snappy

// Framer Motion, directly:
<motion.div animate={{ y: 0 }} transition={{ duration: tokens.duration.base, ease: tokens.ease.enter }} />

// Or the physics spring, which is not time-based: its settle emerges from
// stiffness, damping, and mass.
<motion.div animate={{ scale: 1 }} transition={{ type: 'spring', ...tokens.spring }} />
```

Durations arrive in seconds and easing as four-number bezier arrays: Framer Motion's own units, and the same resolved values the Cadence demos run. Each preset also carries `ambient`, the field vocabulary that drives the Motion Tiles grid.

## Use it from CSS

Each personality ships as a complete stylesheet of custom properties:

```css
@import 'cadence-tokens/dist/standard/cadence.css';

.panel {
  transition: transform var(--cadence-duration-base) var(--cadence-ease-enter);
}
```

## The files

| File | What it is |
| --- | --- |
| `src/index.js` | The data and every emitter, as pure functions. |
| `dist/cadence.tokens.json` | The canonical document: all three presets, both vocabularies. |
| `dist/cadence.rive.json` | Per-preset view-model defaults for Rive, with the clock math and binding-unit notes. |
| `dist/<preset>/cadence.css` | One personality as `--cadence-*` custom properties. |
| `dist/<preset>/cadence.motion.js` | One personality as a ready Framer Motion module. |
| `dist/<preset>/cadence.tokens.jsx` | One personality as a runnable After Effects script: creates or updates the `TOKENS Motion` control layer in the active comp. Re-running a different preset's file retimes the comp. |
| `dist/cadence.flow.txt` | The five named curves as an easing library for Flow, the After Effects plugin. One file, not per preset: presets re-point slots at the same curves. |
| `dist/cadence.figma.json` | The interaction tokens as one Figma variable collection with the three personalities as modes, on Figma's native motion types: TIMING durations and delays (seconds), one EASING variable per curve carrying a real cubic-bezier, FLOAT scale and spring parameters. Shaped on Figma's own collection/modes/valuesByMode vocabulary so plugins and scripts map it one to one. |

`cadence-tokens/tokens.json` and `cadence-tokens/rive.json` resolve as export paths if you prefer importing the documents to reading files.

## Two vocabularies, one preset

The interaction tokens (duration, easing, delay, scale, spring) describe event-driven motion: a press, an enter, an exit. The ambient values (speed, easing exponent, spread, cell, gap) set a clock over a field of tiles. The two keep different shapes on purpose; the named preset is the unit they share. A Snappy press and a Snappy field are the same personality in two grammars.

## Limitations

- DTCG has no delay or spring type. Delays serialize as `duration` (a delay is a duration measured from a trigger); the three spring parameters serialize as `number` leaves under a `spring` group. Both round-trip through Cadence's own importer.
- The ambient vocabulary is not DTCG at all. There is no token type for a period divisor or an ease exponent, and inventing `$types` would be costume, not compliance. Those values ship as plain numbers.
- The Framer Motion module omits the duration scalar: a transition takes a concrete duration, not a base times a multiplier.
- `cadence.rive.json` names the view-model contract of the shipped Cadence files (`PathEffectVM`, its properties, its instance names). It documents what your bindings should expect; it does not create them.
- The values themselves were tuned by ear against real components, not derived. Treat them as a working system, and retune where your components disagree.
