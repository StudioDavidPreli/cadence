# pixelPlant Embed: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session folds the pixelPlant shader lab into Token Lab as the second Embeds demo, wired to the live motion tokens.

## Read first, in this order

1. `CLAUDE.md` (all of it, especially Core Architecture Principle, the demonstration-vs-chrome section, and How I Prefer To Work With You)
2. `src/components/IngredientGrid/PixelPlantLab.jsx`, the working lab this session promotes. Its header comments record the architecture; treat them as decisions, not suggestions
3. `src/components/WaterWilt/index.jsx` and `docs/references/rive-for-react.md`: the first Embeds demo and its session record. The new embed follows its patterns (live token reads, driver-side easing, reduced-motion flattening)
4. `src/hooks/useMotionTokens.js`: the canonical live-token read path, reduced motion included
5. `src/components/TokenLab/index.jsx`: the `'embeds'` entry in the demo map (~line 1624), `DemoWrapper` (~line 832), `SliderRow` (~line 760), and `TOKEN_COMPONENT_MAP` (~line 108)
6. `src/tokens/parse.js` and `docs/decisions/motion-token-nan-crash-2026-07-15.md`: why token parsing is format-robust and verified on built output

## What this is

`?pixelplant` (a temporary gate in `src/App.jsx`) mounts a working experiment: an interactive Rive state machine rendered invisibly, with a WebGL shader stacked on top that displays a pixelated copy of it. The user hovers and clicks the pixels; the events fall through to the live machine underneath. On top of the mosaic runs mouse-driven chromatic aberration: three color plates translate toward the cursor at rates blue 1, green 2/3, red 1/3, scaled by the cursor's distance from the stage center.

The experiment works. What it lacks is the reason to exist inside Token Lab: its motion is self-contained. The lerp constant is a magic number, the strength is a local slider, and no token reaches the shader. This session gives each motion token family one legible job inside the effect, so a preset switch changes the effect's personality and a slider drag retimes it live.

The asset: `public/rive/pixelplant.riv` (untracked; this session commits it). Artboard `pixelPlant`, state machine `pixelPlantSM`, view model `PixelPlantVM`, four baked theme instances `darkMode`, `lightMode`, `contrastDark`, `contrastLight`. Binding follows the BugReportButton convention, with one recorded divergence explained under Constraints.

## The name: Rive Clock

Decided by David 2026-07-20; not open for redesign. The demo's display name is **Rive Clock**, in `componentName` and in every `TOKEN_COMPONENT_MAP` row.

The Embeds category names demos by who holds time. In React Clock (the Water & Wilt demo, already renamed in the codebase), React's rAF loop holds time and Rive holds poses. Here it inverts: Rive's own state machine holds time and React paints a shader over it. "React Clock" and "Rive Clock" state that ownership in two words each, they are exactly parallel the way Button and Toggle are, and they borrow no authority they don't have: nobody reads "React Clock" as Rive's runtime being React's property, or the reverse.

The shader half of this demo is real content but it is not the ownership fact; it lives in the instruction copy. David's seed line for that copy: "Rive owns the motion; a React WebGL shader paints over it." Work from it when drafting the instruction (voice rules apply).

## The token mapping

Agreed with David 2026-07-20. Each family gets one job:

| Token family | Job in the effect |
|---|---|
| `duration` | The follow clock. The plates chase the cursor with a lag derived from the token, computed frame-rate independently from delta time (replaces the hardcoded 0.12 per-frame lerp, which is both a magic number and frame-rate dependent) |
| `easing` | The homecoming. Continuous following stays on the duration-derived time constant; when the pointer leaves the stage, the plates glide back to zero as a real tween on the token's curve over the token's duration. That is where a bezier is perceivable as a bezier |
| `delay` | The plate stagger. Blue tracks immediately, green starts after one delay step, red after two. While the system moves, the plates disagree and the fringe blooms; at rest all three converge and the image resolves clean |
| `scale` | The amplitude. Max plate travel maps to the scale token; the local strength slider leaves the panel |

Which slot within each family (`duration.fast` vs `base`, `delay.short` vs `medium`, and so on) is David's call. Propose an assignment with reasoning before wiring; the WaterWilt map (`docs/briefings/waterwilt-token-vm-map.md`) is the precedent for how an embed's reads get recorded.

Two boundaries hold deliberately:

- Blocks and gap are spatial grid vocabulary, not motion. They stay as embed-local controls, the same scoping call recorded for Motion Tiles (one control vocabulary per tool, the named preset is the shared unit). Do not map them to motion tokens.
- The easing bezier is never reinterpreted as a spatial falloff curve. Time-domain tokens keep time-domain jobs (Token Fidelity).

## Where it lands, and how it must look

The demo renders in the `'embeds'` entry of the demo map in `src/components/TokenLab/index.jsx`, BELOW the React Clock (`WaterWilt`) `DemoWrapper`, inside the same `demoContent` div. Use `DemoWrapper` with the embed classes (`instructionClass={styles.demoInstructionEmbed}`, `mainClass={styles.demoMainEmbed}`) and a real `code` snippet in `src/components/TokenLab/demoSnippets.js` (follow the WaterWilt snippet's register: it shows the token reads, not the GL boilerplate).

**The embed-local controls must match Token Lab's control style.** The lab's current sliders are bare test-harness `<input type="range">` elements; they do not ship. Token Lab's sliders are `SliderRow` (label left, value right, the `.sliderRow` / `.sliderLabel` / `.sliderName` / `.sliderValue` / `.slider` classes in `TokenLab.module.css`, with the accent-colored thumb and focus ring). The embed's surviving local controls (blocks, gap, the snap and gap-mask toggles if they survive the panel-clutter conversation) render in that same visual language. Decide deliberately whether to export and reuse `SliderRow` or to mirror its classes in the embed's own CSS module, and say why; do not invent a third slider look. Checkboxes match the tool's existing checkbox rows. All control chrome reads `--feedback-*` timing, never `--motion-*`.

## Surfaces this touches

- New component folder per convention: `src/components/PixelPlant/index.jsx` (named export, CSS module). The lab file in `IngredientGrid/` is the source to promote, not the shipping location. It must not import `IngredientGrid.module.css`.
- `src/components/TokenLab/index.jsx`: the `'embeds'` demo map entry; `TOKEN_COMPONENT_MAP` gains the new demo's rows, exactly matching what the driver actually reads (the map was rebuilt once because it drifted; do not let it drift on day one).
- `src/components/TokenLab/demoSnippets.js`: the code-view snippet.
- `src/App.jsx`: the `?pixelplant` gate comes out once the embed ships (David confirms timing). The `?pixelrive` and `?pixeltest` gates and the rest of `IngredientGrid/` are a separate experiment; leave them alone.
- `public/rive/pixelplant.riv`: committed.
- Token reads: through `useMotionTokens()` (it subscribes to the token channel and flattens under reduced motion) or through the `parse.js` helpers if a lower-level read is needed. Never a raw `getPropertyValue` with format assumptions; the minifier incident is why.
- Tests: the unit suites (`tokenIntegrity.test.js` scans `components/` for inline animation literals; the promoted component is inside the gate's territory, and the current lab carries literals that must become token reads or `--feedback-*` reads), plus `npm run test:e2e` (the deploy gate, against built output). If the token-propagation thesis test pattern extends to embeds, extend it.
- Docs: a decision record at `docs/decisions/pixelplant-embed-<date>.md`; a token map at `docs/briefings/pixelplant-token-map.md` following the WaterWilt precedent; `tracker/TRACKER.md` session note.

## Constraints that are load-bearing (violating any of these reintroduces a fixed bug)

1. **Never rebind a view model instance into a running state machine.** Rebinding fires the machine's click reaction (traced 2026-07-19: the runtime forwards `bindViewModelInstance` into the live WASM machine, which re-applies every data bind, and `pixelPlantSM` reads one as a click). The lab's fix is a keyed remount per theme (`key={instanceName}`); each mount binds its instance once, before play. Keep it, or improve on it only with David's sign-off.
2. **The pointer overlay is exact.** Rive canvas below at `opacity: 0` (opacity keeps hit-testing; `visibility` or `display` kills it), shader canvas above with `pointer-events: none`, both filling a stage whose aspect ratio comes from `rive.bounds`. This alignment is what makes hovering the pixels feel like touching the plant.
3. **The premultiplied recombine in the fragment shader** (each channel keeps its own plate's alpha, output alpha is the strongest plate's) is what lets a blue fringe ghost past the silhouette without halos. The out-of-range guard is what prevents `CLAMP_TO_EDGE` edge streaks. Both are documented at the `FRAG` constant.
4. **Per-frame `texImage2D` of `rive.canvas` is the proven sampling path** (the G1 probe, 2026-07-08, Safari). Do not move to an offscreen or two-pass pipeline without a reason David accepts.
5. **Theme coverage is four for four.** The demo must hold up in `light`, `dark`, `high-contrast-light`, `high-contrast-dark`; the .riv carries a baked instance per theme, no runtime color flip.
6. **Reduced motion.** Under `prefers-reduced-motion` the plates pin to zero separation (a clean image). `useMotionTokens` flattens the timing tokens automatically, but the mouse-driven offset is input-driven motion the hook does not know about; pin it explicitly. What the Rive plant itself does under reduced motion (paused machine, poster, or gated mount) follows the app-wide architecture in `docs/decisions/reduced-motion-completion-2026-07-18.md` and needs David's call, because a poster asset for pixelPlant does not exist yet.

## What needs David's explicit call

- Token slot assignment within each family (propose, then wait).
- Which embed-local controls survive into the shipped panel, and the final instruction copy (the name and its seed line are settled; see The name: Rive Clock).
- The reduced-motion presentation of the Rive layer.
- When the `?pixelplant` gate retires.
- Final feel: the duration-to-lag mapping and the stagger multiples are tuned by hand against the live tool, by David.

## Process rules for this session

- Start in plan mode. Present the token-slot proposal and the control-survival question before writing code.
- David is learning React through this project. Explain non-obvious decisions briefly as you go; when two approaches are valid, name both and say why you chose one.
- No hardcoded animation values in components. The shader may keep geometry constants (plate rate ratios, cell math); anything that is timing, easing, delay, or amplitude reads tokens at runtime.
- Main is production: deploys ride every push. `npm run test:e2e` is the pre-push gate.
- Verify the changed surfaces on **built** output in a browser, not just the dev server, and not just curl.
- David runs the dev server himself and does his own visual checks; do not drive browser automation to confirm UI feel.
- The working tree carries uncommitted experiment files (`src/App.jsx` gate block, `src/components/IngredientGrid/`, `public/bugs/`, `public/riveTiles/ingredients_v2.riv` and `testSequence/`). This session promotes ONLY the pixelPlant thread; stage files individually, never `git add -A`.
- Commit directly to main, no feature branch. Read `git log --oneline` first and match the message style.
- Before writing any prose (docs, decision records, UI copy), read `docs/voice/voice-analysis.md` in full. No em-dashes, anywhere, in any form.

## Definition of done

- The embed renders in Embeds below React Clock, named Rive Clock in `DemoWrapper` and every `TOKEN_COMPONENT_MAP` row, through `DemoWrapper`, with a code-view snippet, in all four themes.
- All four token families drive the effect per the mapping table; a preset switch audibly changes its personality; slider drags retime it live without a remount.
- Embed-local controls match Token Lab's control style; no bare test-harness inputs ship.
- The six load-bearing constraints hold; the phantom-click regression is checked by hand (switch themes while watching the plant).
- `TOKEN_COMPONENT_MAP` rows match the driver's actual reads; unit suites and `npm run test:e2e` pass; surfaces verified on built output.
- Docs: decision record, token map, tracker note. The lab file and its gate retired or explicitly left, per David's call, with the archive copy noted.
