# Scale Press/Lift Rename: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

**Sequencing gate: do not run this while the duration-scalar or hygiene-pair sessions are open.** This session and the scalar session share `motionPresets.js`, the token schema, and the TokenLab migration chain (`migratePresetScalar` is already in it). Run after both have landed and pushed; read `git log --oneline` first and confirm.

**The deadline that gives this session its slot:** the public style guide (tracker, Future work) will publish token names. This rename must land before those names freeze publicly, or the guide ships names the project already intends to change. Before the style guide, after the in-flight sessions: that is the window.

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session renames the scale token family so direction is legible in the name.

## Read first, in this order

1. `CLAUDE.md` (all of it)
2. `tracker/TRACKER.md`, the "Scale press/lift legibility split" bullet under Future work: the settled decisions live there
3. `docs/references/motion-presets-harmonized.md`, the naming note recording that its nested spellings (`scale.press.subtle`) are the proposal's historical record and the settled format is flat
4. `docs/token-architecture.md`: the token list and addition workflow
5. `src/data/motionPresets.js` and the migration chain in `src/components/TokenLab/index.jsx` (the `migratePreset*` functions and where they compose at load)
6. `docs/decisions/physics-spring-2026-07-20.md`: the most recent precedent for walking a token change through every surface

## What this is

The scale family reads as four siblings: `scale.subtle`, `scale.base`, `scale.expressive`, `scale.lift`. Three are press compressions below 1; one is a lift above it. Nothing in the names says which direction is which, and `base` implies a neutral 1.0 when its value is 0.95. The rename makes direction part of the name: press keys carry "press," the lift keeps "lift," and no key implies neutrality it does not have.

## Already settled: do not reopen

- **Flat keys, not nested.** `scale.pressSubtle`, never `scale.press.subtle`. The serialization (`mapGroup`, flat JSON, DTCG paths, `EDITABLE_TOKEN_SCHEMA`, `EXPLORE_BOUNDS`, `collectForeign`) all assume `scale` is a flat map. The harmonized doc's nested spellings are the proposal's record, not the spec.
- **The migration pattern.** The easing-slot split, the spring, and the scalar all backfill saved presets through composed `migratePreset*` functions at TokenLab load. This rename adds one more to that chain, same shape.

## Forks for David: present with recommendations, then wait

Start in plan mode.

1. **The exact key set.** `pressSubtle / pressBase / pressExpressive / lift` is the straight mapping; `press / pressSubtle / pressExpressive` (dropping "base" entirely for the middle value) is the alternative the bullet's complaint about "base" invites. Propose one, with the CSS custom property spellings (`--motion-scale-press-subtle`) and the Token Lab slider labels alongside, so the whole naming surface is decided at once.
2. **Import handling of old-named files.** Precedent check first: a file exported before the overshoot rename still imports cleanly because easing canonicalizes by value, not name. Scale values are bare numbers, so no value-canonicalization exists: under current machinery an old `scale.subtle` lands in `collectForeign` as ignored and the new key fills from Standard, which silently swaps the user's tuned value for a default (reported, but still lost). Recommend aliasing old scale keys to their new names on import with a report line naming the rename, because dropping tuned values on a rename the user never asked for is the wrong kind of surprise. David rules.
3. **The card strings and the ceiling.** Principle cards and the token pills render token names in a fixed mono column with a hard character budget (the 80-char field ceiling; see `docs/principles/conventions.md`). `scale.pressExpressive` is eight characters longer than `scale.expressive`. Before committing to names, measure the longest affected card string against the layout; if a string breaks, the fix is David's call (a shorter key set, or a display abbreviation, which would itself need deciding).
4. **The case-study timing.** `docs/case-study.md` names scale tokens in the P01, P10, and P11 build notes and the Token Architecture section, and it is mid-edit (David's passes pending). Either this session sweeps the case study with everything else, or David's edit pass absorbs the rename afterward. Ask which, before the sweep.

## The sweep, surface by surface

Grep the repo for every old key and old CSS property spelling; the list below is the expected shape of the results, not a substitute for the grep.

- `src/tokens/motion.css`: four property names.
- `src/data/motionPresets.js`: state keys in all three presets, `EDITABLE_TOKEN_SCHEMA`, `EXPLORE_BOUNDS`, stringifier paths (DTCG, flat, CSS), `importTokens` plus the fork-2 aliasing, `collectForeign`.
- `src/hooks/useMotionTokens.js` and `src/tokens/parse.js`: reads and fallbacks.
- Consumers: Button, Card, Stepper, NotificationBadge, the WaterWilt scene scale (`--ww-scene-scale` and the times-100 write), Rive Clock's amplitude read, and any spring-mode branch that touches scale. Every consumer reads by name; every name changes.
- `TOKEN_COMPONENT_MAP` rows, `demoSnippets.js` code-view strings, principle-card token strings, Token Lab section labels.
- The migration: `migratePresetScale` appended to the compose chain at load.
- Tests: every suite that names a scale key, unit and e2e.
- Docs that make live claims: `token-architecture.md`, `references/motion-presets.md`, the companion principle docs that name scale tokens, CLAUDE.md if it names any. **Historical records keep their old names**: decision docs, closeouts, the audit, and tracker history describe what was true when written; do not rewrite them. When a historical doc's old name could mislead (a reader copying from it), add a dated rename note rather than editing the history.
- localStorage: verified by loading a pre-rename saved preset and watching it migrate.

## Process rules for this session

- David is learning React through this project. Explain non-obvious decisions briefly; when two approaches are valid, name both and say why you chose one.
- No hardcoded animation values in components; the rename changes names, never values or behavior. If a diff changes a value, something went wrong.
- Main is production: `npm run test:e2e` before every push; verify the renamed reads on built output in a browser (the minifier rule), including one press demo, the WaterWilt scene scale, and an export/import round trip.
- Stage files individually; never `git add -A`. Commit directly to main; match the log's message style.
- Before writing any prose, read `archive/voice/voice-analysis.md`. No em-dashes, anywhere, in any form.

## Definition of done

- Every live surface reads the new names; a repo-wide grep for the old keys hits only historical records (plus dated rename notes where a record needed one).
- Saved presets migrate; an old exported file imports per the fork-2 decision; a new export round-trips.
- All unit suites and `npm run test:e2e` pass; built-output verification done on the surfaces above.
- Docs updated, a decision record written at `docs/decisions/scale-rename-<date>.md`, the tracker bullet ticked with the date.
- The style guide inherits names nobody intends to change.
