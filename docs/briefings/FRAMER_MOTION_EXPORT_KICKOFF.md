# Framer Motion Export: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

**Sequencing gate: run after the duration-scalar session has landed and pushed** (it touches `stateToExport` and the stringifiers this session extends), and never concurrently with the scale-rename session (same file, and exporting names that are about to change would be wasted work; if the rename has not happened yet, ask David whether to wait for it). Read `git log --oneline` first and confirm the state of both. This is a post-launch item; there is no calendar pressure, only ordering.

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session builds the fourth export format: the token set as ready-to-use Framer Motion configuration. It was named in a 2026-06-18 handoff and never built; the 2026-07-16 audit carries it as the untracked feature gap this brief closes.

## Read first, in this order

1. `CLAUDE.md` (all of it)
2. `docs/token-architecture.md`: the export section (three stringifiers off one `stateToExport` object, the no-drift rule, `downloadTextFile`, the extension and mime conventions) and the import section (CSS is export-only, a recorded scoping decision this session's fork 3 mirrors)
3. `src/data/motionPresets.js`: `stateToExport`, the three existing stringifiers, and `stateToTokens` (the ms-to-seconds and named-curve-to-array conversions the new format reuses)
4. `docs/decisions/physics-spring-2026-07-20.md`: the spring's serialization story; the spring is this export's best argument
5. `src/components/TokenLab/index.jsx`, the `PresetsSection` export row: where the fourth button lands

## What this is

Token Lab's live code view already shows real Framer Motion calls with current values ticking in the comments; the case study's claim is that a tuned token set leaves the tool as the artifact an engineer's pipeline consumes. The three existing formats serve the token pipeline (DTCG, flat JSON, CSS). None serves the engineer who works in Framer Motion directly, and none can express the spring as what it is: DTCG, flat, and CSS all carry the three spring numbers as parameters, but only a Framer Motion config can say `{ type: 'spring', stiffness, damping, mass }` and be finished. The tool that teaches how tokens become motion should export the motion-side artifact, not only the token-side ones.

## Forks for David: present with recommendations, then wait

Start in plan mode.

1. **The artifact's shape.** Three candidates: (a) a JSON file of Framer-Motion-unit values (seconds, four-number easing arrays) mirroring the token families; (b) a JavaScript module exporting named objects an engineer imports and spreads into `transition` props, e.g. durations and eases by token name plus a ready `spring` config; (c) both. Recommend (b): a module that drops into an engineer's project is the pitch made literal, and (a) is nearly the flat JSON that already exists with different units. Whatever wins, derive every value through the same conversions `stateToTokens` already performs, so the export cannot drift from what the demos actually run.
2. **What the module's names are.** Token-mirroring names (`duration.fast` becomes `durations.fast`) versus semantic transition pairs (a composed `transitions.enter` carrying duration plus ease together). The composed form is more useful and more opinionated; the mirrored form is more honest to the token layer. Propose one, or a small module that offers the mirrored values and two or three composed examples, and let David pick the register.
3. **Export-only, recorded.** Recommend that `importTokens` does not learn to read this format, the same scoping decision CSS export took, recorded the same way. A Framer Motion module is a destination, not an interchange format. David confirms.
4. **File name, extension, mime, and button label.** `.js` with `text/javascript` fits the artifact; the button label is voice-governed copy in a row that already holds three buttons. Check the export row's layout at the 720px rail collapse before adding the fourth button, and propose the label with the layout evidence in hand.

## The work, surface by surface

- `src/data/motionPresets.js`: one new stringifier off `stateToExport`, beside the existing three, converting through the same helpers `stateToTokens` uses. The no-drift rule is structural: all four outputs serialize from the one normalized object.
- The spring: emitted as a complete `{ type: 'spring', ... }` config. Note in the emitted file's header comment that `ease.overshoot` is the bezier fallback for contexts that cannot run a spring, because that pairing is the system's own documented posture.
- `PresetsSection`: the fourth button, the download wiring, the label.
- Tests: mirror the existing stringifiers' unit-test pattern (round-trip is out per fork 3, so the tests pin shape, units, and the spring config; add one no-drift assertion against `stateToTokens` output).
- The emitted artifact is generated text, not component code, so the token-integrity gate does not apply to its contents; confirm the gate's scan paths stay untouched rather than assuming.
- Docs: the export section of `token-architecture.md` gains the fourth format and the fork-3 decision; a decision record at `docs/decisions/framer-motion-export-<date>.md`; the tracker bullet ticks; the audit's CSS-import-asymmetry bullet gets its closing annotation for the export half (the CSS-import half stays a stated non-goal unless David reopens it).
- If the case study absorbs the feature, that is David's edit-pass call, not this session's; leave it a note, not an edit.

## Process rules for this session

- David is learning React through this project. Explain non-obvious decisions briefly; when two approaches are valid, name both and say why you chose one.
- No hardcoded animation values in components. The stringifier reads state; the components stay untouched.
- Main is production: `npm run test:e2e` before every push; verify on built output in a browser that the button downloads the artifact and the file's values match the live token state (edit a token, re-export, diff).
- Stage files individually; never `git add -A`. Commit directly to main; match the log's message style.
- Before writing any prose (including the emitted file's header comment and the button label), read `docs/voice/voice-analysis.md`. No em-dashes, anywhere, in any form.

## Definition of done

- The fourth export downloads from Presets in the decided shape, every value derived through the shared conversions, spring included as a native config.
- Unit tests pin shape, units, spring, and no-drift; all suites and `npm run test:e2e` pass; the download verified on built output against live state.
- Docs and the decision record written; the tracker bullet and the audit annotation closed with dates.
- An engineer who has never seen Cadence could drop the file into a Framer Motion project and use it without asking a question.
