# Duration Scalar: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session builds the duration scalar and the distance-and-speed visualizer it exists to serve. The item is on the tracker's pre-launch engineering queue, promoted 2026-07-21 on David's call: the lesson is valuable enough to be there on day one.

## Read first, in this order

1. `CLAUDE.md` (all of it, especially Core Architecture Principle and How I Prefer To Work With You)
2. `docs/references/motion-presets-harmonized.md`, the "Companion mechanism — duration scalar" section
3. `docs/token-architecture.md`: the token list, the editable-vs-fixed classes, the addition workflow, the export/import rules
4. `docs/decisions/physics-spring-2026-07-20.md`: the precedent for carrying a new token end to end through every surface (schema, bounds, export, import, code view, component map, tests). This session walks a smaller version of the same road.
5. `tracker/TRACKER.md`, the pre-launch queue entry and the Future work bullet it promotes
6. `src/data/motionPresets.js` and `src/components/DurationVisualizer/`, the code the visualizer will live beside

## What this is

Cadence's durations are fixed: `duration.base` is 200ms whether the element travels 40px or 400px. Both Material and Carbon insist duration should scale with distance travelled, and fixed tokens are the one place Cadence's model simplifies away from both. The consequence is perceptual: two elements on the same duration over different distances move at visibly different speeds, and the longer travel reads rushed.

The mechanism is one token:

```css
:root { --motion-duration-scalar: 1; }
/* effective duration = base * scalar, read at runtime */
```

The tokens stay the source of truth; the scalar is a documented multiplier on top, not a distance hardcoded into a component. The visualizer is the consumer that makes the lesson visible, and the two ship together: a scalar with no consumer is the thing the Token Fidelity principle argues against, which is why the token was deliberately not added ahead of this session.

**Attribution warning:** an early draft of the harmonized doc credited this pattern to a named design system. The attribution could not be verified and was removed. Do not cite a source for the pattern anywhere (docs, code comments, UI copy) unless you have confirmed the system, its token prefix, and the exact property first.

## The demonstration to build

The comparison is the lesson, so the visualizer shows it as a comparison. The shape to start from (refine in planning, not by fiat): two travels side by side, one short and one long, with a toggle between two modes. Fixed mode runs both on the same duration token, and the long travel visibly rushes. Scaled mode applies the scalar, and perceived speed steadies. The viewer should see the problem before reading why, the way the Token Fidelity demo makes the deviant pill perceptual before it is explained.

## Scoping: present these forks before writing code

Start in plan mode. Four decisions are David's; bring options and a recommendation for each, then wait.

1. **Where the visualizer lives.** Beside `DurationVisualizer` in Token Lab's duration section, as a demo in one of Token Lab's demo categories, or as principle material. The pre-launch framing (a day-one lesson) and the scalar being a duration-family concept both argue for Token Lab; say which surface and why.
2. **What class of token the scalar is.** The spring precedent offers the ladder: (a) a fixed reference at 1 with a demo-scoped scrub control, (b) a single editable token with one slider, (c) a full per-preset family member. Each step up widens the blast radius (state, schema, bounds, export, import, migration). Recommend the smallest scope that makes the lesson land; the harmonized doc's own framing ("a scalar the user scrubs") suggests the scrub matters more than preset variation.
3. **Whether any shipped component consumes the scalar.** Recommend no: the visualizer is the consumer, and rewiring shipped motion is never a side effect of a token pass (the spring session's rule, David's).
4. **The name.** `--motion-duration-scalar` is the recorded spelling; confirm it against the family naming in `token-architecture.md` before it lands in CSS.

## The blast radius, sized by the scoping decision

Walk these surfaces and account for each in the plan; how many activate depends on fork 2:

- `src/tokens/motion.css`: the token definition, whatever class it lands as.
- `src/data/motionPresets.js`: state, `EDITABLE_TOKEN_SCHEMA` or the fixed set (the drift guard partitions every runtime token; the scalar must land on exactly one side), Explore bounds, the three stringifiers, `importTokens` validation. A scalar of 0 or below makes every duration vanish or invert; decide clamp versus structural rejection against the spring's precedent (non-positive spring params reject).
- `src/tokens/parse.js` and `useMotionTokens`: a unitless read with a fallback; verify on built output (the minifier incident rule).
- The code view (`resolveToken.js`) and `TOKEN_COMPONENT_MAP` if the scalar is editable: a slider drag should highlight the visualizer.
- localStorage migration if the scalar enters saved state (the spring migration is the template).
- Reduced motion: effective duration is base times scalar and the base already flattens, so flattening passes through arithmetic unchanged. State this in the code comment rather than leaving it implicit.
- Tests: unit coverage for the new math and any import rules; an e2e propagation row if editable (the thesis-test pattern).
- Docs: `token-architecture.md`, `references/motion-presets.md` if presets are touched, a decision record at `docs/decisions/duration-scalar-<date>.md`, the tracker tick in both the queue and the Future work bullet.

## Process rules for this session

- David is learning React through this project. Explain non-obvious decisions briefly; when two approaches are valid, name both and say why you chose one.
- No hardcoded animation values in components. The scalar and every duration it multiplies are read from custom properties at runtime.
- Main is production: `npm run test:e2e` before every push, and verify the changed surfaces on built output in a browser, not just the dev server.
- David runs the dev server and does his own visual checks; do not drive browser automation to confirm UI feel. The scalar's feel (how far the scrub range goes, what the travels look like) is his to tune against the live tool.
- Stage files individually; never `git add -A`. Commit directly to main; read `git log --oneline` first and match the message style.
- Before writing any prose, read `archive/voice/voice-analysis.md`. No em-dashes, anywhere, in any form.

## Definition of done

- The scalar token exists in `motion.css` in its decided class, and the visualizer consumes it through the runtime-read pattern.
- The fixed-versus-scaled comparison is visible in the tool and responds to live token edits like every other demo.
- Export, import, schema, code view, and map all account for the scalar to the depth fork 2 chose; the drift-guard test still partitions cleanly.
- All unit suites and `npm run test:e2e` pass; changed surfaces verified on built output.
- Docs updated and the decision record written; the tracker's pre-launch queue and Future work bullet both tick with dates.
- David has signed off on the visualizer's read and the scrub range by eye.
