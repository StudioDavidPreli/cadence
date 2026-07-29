# Physics-Spring Family: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session builds the physics-spring token family, the last deferred proposal from the 2026-07-08 preset harmonization pass.

## Read first, in this order

1. `CLAUDE.md` (all of it, especially Core Architecture Principle and How I Prefer To Work With You)
2. `docs/references/motion-presets-harmonized.md`, the "Spring (physics)" section and the "Fixed constants" section
3. `docs/token-architecture.md` in full: the token list, the addition workflow, the export stringifiers, and the import validator rules
4. `tracker/TRACKER.md`, the "Future work — architecture" section, first checkbox
5. `src/data/motionPresets.js` and `src/tokens/motion.css`, the code the docs describe

## What this is

Cadence's `ease.overshoot` is a cubic-bezier that imitates a spring on a fixed timeline. A real spring is not time-based: it has stiffness, damping, and mass, and its settle time emerges from those. Material 3 Expressive moved to physics springs in 2025. This session adds a real spring family to Cadence without breaking the read-at-runtime rule, because spring parameters are unitless numbers and unitless numbers live fine in CSS custom properties:

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

Starting values per preset, from the harmonized doc. Note the preset is named **Standard** now, not Default (renamed 2026-07-16 so both tools carry Snappy / Standard / Cinematic). Springs are tuned by feel; treat these as a first pass David will sit and adjust against the components:

| Param | Standard | Snappy | Cinematic |
|---|---|---|---|
| `spring.stiffness` | 400 | 600 | 180 |
| `spring.damping` | 30 | 22 | 26 |
| `spring.mass` | 1 | 1 | 1.2 |

Standard settles cleanly with a hint of overshoot. Snappy is stiffer and bounces harder. Cinematic is soft and heavy, a slow arrival with almost no bounce.

`ease.overshoot` stays regardless: it is the CSS-only fallback for anything that cannot run a JS spring, and the documented reduced-motion fallback. Do not remove or rename it.

## Why this was deferred: the blast radius

The harmonized doc calls this the strongest case-study beat in the whole table, and it was deferred anyway because everything downstream assumes a token is a duration plus a bezier. Walk every one of these surfaces and account for it in your plan:

- `src/tokens/motion.css`: token definitions live here and nowhere else.
- `src/data/motionPresets.js`: `BASE`, the three presets, `stateToTokens`, `EDITABLE_TOKEN_SCHEMA`, `EXPLORE_BOUNDS`, `mapGroup`, the three stringifiers fed by `stateToExport` (flat JSON, DTCG, CSS), `importTokens` and its validator, `collectForeign`. The serialization all assumes flat maps per group; keep `spring` a flat map (`spring.stiffness`, not nested objects), matching the settled convention recorded in the scale press/lift bullet in the tracker.
- **DTCG has no spring type.** The export needs a decision: a `$type` extension, a vendor extension namespace, or exclusion with a recorded reason. Propose one with reasoning; do not silently pick.
- `importTokens`: spring params are a new scalar class. They need Explore bounds, clamp-and-report behavior consistent with the existing rule (scalars clamp to the nearest edge and get itemized in the report modal, curves never clamp), and rejection rules for structurally invalid values (zero or negative stiffness/mass, negative damping).
- `src/tokens/parse.js`: the format-robust parsers exist because the CSS minifier rewrites values (`400ms` became `.4s` and crashed production once). Unitless numbers should be safe, but "should be" is what crashed the Modal. Add parse coverage and verify on built output.
- Token Lab UI: the sliders, the code view (`src/components/CodeBlock/resolveToken.js` and `TOKEN_COMPONENT_MAP`), `DurationVisualizer`, `EasingVisualizer`. A spring has no fixed duration and is not a bezier, so neither visualizer can represent it. What the tool shows for a spring is a real design question; see Scope below.
- localStorage: persisted Token Lab state predates the spring keys. Follow the migration precedent set by the easing-slot split and the Overshoot rename (missing keys default from `BASE`, nothing throws).
- Reduced motion: any spring consumer must flatten under the app's reduced-motion architecture like every other demo. Read `docs/decisions/reduced-motion-completion-2026-07-18.md` before wiring a consumer.
- Tests: the unit suites (`motionPresets.test.js`, `parse.test.js`, `resolveToken.test.js`, `tokenIntegrity.test.js`) and the e2e suite (`npm run test:e2e`, the deploy gate). If spring becomes editable in the tool, the token-propagation thesis test pattern extends to it.
- Docs that mirror code: `docs/references/motion-presets.md` mirrors `motionPresets.js` and must be updated in the same session. `docs/token-architecture.md` gets the new family and its export/import rules.

## Scope: present this fork before writing code

Start in plan mode. There are two honest scopes; present both with a recommendation and wait for David's pick:

**A. Fixed family first.** Tokens land in `motion.css` and the presets, exports include them, at least one component consumes them, docs and case study can claim a real spring. No new Token Lab controls yet; the spring editor UI becomes its own follow-up pass.

**B. Full editable family.** Everything in A plus Token Lab controls (three sliders or a combined control) and an answer to the visualizer question (a settle-curve plot is the natural shape: plot displacement over time from the three params, updating live). Bigger session, bigger payoff, and the propagation test extends naturally.

Either way, the family ships with at least one real consumer or it is a token with no demonstration, which fails the project's own Token Fidelity principle.

## What needs David's explicit call

- The scope fork above.
- **Which component demonstrates the spring.** The obvious candidate is the Button release, but that motion was deliberately set to `ease.overshoot` on 2026-07-16, feel-checked by David, and recorded across five layers (card string, code view, `TOKEN_COMPONENT_MAP`, companion doc, case study). Changing shipped motion is David's decision, never yours. Propose candidates; do not rewire.
- The DTCG representation.
- Final spring values, by feel, against the live components.

## Process rules for this session

- David is learning React through this project. Explain non-obvious decisions briefly as you go; when two approaches are valid, name both and say why you chose one. Do not abstract away complexity he should understand.
- No hardcoded animation values in components, ever. The spring params are read from the custom properties at runtime like every other token.
- Main is production: deploys ride every push. `npm run test:e2e` (against built output, served by the real Worker) is the pre-push gate, not optional.
- Verify the changed surfaces on **built** output in a browser, not just the dev server, and not just curl. This is a standing rule with a production incident behind it.
- David runs the dev server himself and does his own visual checks; do not drive browser automation to confirm UI feel.
- The working tree may contain an uncommitted pixel-plant experiment (`src/App.jsx` gate changes, `src/components/IngredientGrid/`, `public/riveTiles/ingredients_v2.riv` and `testSequence/`, `public/rive/pixelplant.riv`, `public/bugs/`). Leave all of it alone. Stage files individually; never `git add -A`.
- Commit directly to main, no feature branch. Commit messages follow the repo's existing style (read `git log --oneline` first).
- Before writing any prose (docs, comments beyond code, decision records), read `archive/voice/voice-analysis.md`. Hard rule from CLAUDE.md that applies to everything you write here: no em-dashes, anywhere, in any form.

## Definition of done

- Tokens defined in `motion.css`, present in all three presets, flowing through `stateToTokens`.
- Export includes the family in all three formats (or DTCG exclusion recorded with reasoning); import round-trips it with validation.
- At least one component consumes the spring through the runtime-read pattern, gated correctly under reduced motion, with David's sign-off on which component and how it feels.
- All unit suites and `npm run test:e2e` pass; changed surfaces verified on built output.
- Docs updated: `token-architecture.md`, `references/motion-presets.md`, the harmonized doc's Spring section marked shipped, a decision record at `docs/decisions/physics-spring-<date>.md`.
- Tracker: the Future work checkbox ticked with a dated note; a session note in the current week.
- The case study's spring-honesty thread (`docs/case-study.md`) gets a pointer to the new state only if David asks; the case study is mid-edit and has its own reconciliation pass pending.
