# Background System Handoff: Glyph L-System Backgrounds
## Concept session findings, 2026-07-22

**For:** Claude Code (Opus 4.8), Cadence repo
**From:** Planning session, claude.ai
**Status:** Concept confirmed by David through interactive prototypes. Nothing exists in the repo. This brief is context, not ground truth. Recon the actual codebase before implementation and confirm any assumption this document makes about existing code (token names, motion.css structure, reducer channels).

**Sequencing:** Post-launch v1.x work. Not launch-blocking. Case study and deploy stay ahead of it.

---

## 1. What this system is

A background artwork system for section contrast and UI fill (first target: the nav column). One generation pipeline, two renderers:

1. An L-system armature is expanded and turtle-interpreted into world-space polylines. The armature is usually hidden.
2. The armature rasterizes through an analytic grid traversal into a density map. Hand-drawn SVG glyphs from a repo library are scattered by density weight, rotated to local flow, producing a composition of world-space glyph strokes.
3. **Vector face** renders the strokes as inline SVG paths, colors intact, for Principles-dialect surfaces.
4. **Pixel face** walks the same strokes through the committed cell aggregation and emits SVG rects, for Token Lab-dialect surfaces.

Output is static per state. It regenerates on seed, token, or theme change with a crossfade. Motion is a one-shot reveal plus a group-level ambient idle. No per-frame JavaScript, no canvas, no new GL contexts, no new dependencies.

Grammar recommendation, confirmed: glyph-forward compositions with the armature hidden are the default background. Visible L-system figures are reserved as deliberate accents. Identity comes from the hand-drawn marks, distribution from the system.

---

## 2. Committed decisions

All values below were confirmed by David by eye in session prototypes. Tag them [session-confirmed]. Nothing is [code] yet.

### Aggregation (pixel face)
- Analytic traversal, Amanatides and Woo grid walk. Exact crossing length and angle per cell. This is the production path. The WebGL shader route was evaluated and rejected because directional luminance is a requirement and the shader never sees stroke geometry.
- Presence: total crossing length >= **0.20 x cell size**. Crossing length, not area coverage, so stroke width is irrelevant.
- Cell size **12px**. Open question 8 covers per-surface sizing.
- Tone: **blended orientation**. Double-angle vector mean of axial crossing angles, quantized to **4 buckets**, **inverted tone map**, offset 0.
- Orientation is axial: theta in [0, PI), computed as angle mod PI. Bucket = round(theta / (PI/n)) % n.
- **Density** tone rule (total crossing length quantized to n levels) passed the same eye test at identical settings. It is held as a second named profile. Per-page tone rule switching in Token Lab costs nothing at runtime; whether the variation reads as dialect or inconsistency is an artboard call, still open.
- Full color mode: each cell accumulates crossing length per source color during the same traversal. Longest-crossing color wins the cell. Orientation tone becomes a luminance multiplier on that color, **0.35 to 1.0**. Cells with only colorless strokes fall back to the ramp.

### Rendering
- Both faces are inline SVG. No canvas. Vector strokes use source color or currentColor; pixel rects should use theme token colors (the labs hardcode a ramp; production reads custom properties).
- Pixel face **holds the grid**. No positional animation on cells, ever. Two reasons on record: sub-pixel offsets read as blur on pixel art (the wordmark crispEdges lesson), and Firefox does not composite SVG child transforms cleanly, so grid-hold is immune to its shimmer. Browser named so this does not get re-litigated.
- Glyph library: own SVG traces in the repo, imported at build time (import.meta.glob per the feasibility report). Authoring spec per file: explicit width and height, viewBox, stroke="currentColor", fill="none", consistent origin convention. Write this spec into the library README before the first mark is committed.
- Production flattening is owned code: Bezier flattener, transform math carrying each stamp's translate-rotate-scale into world space. The labs used getPointAtLength, which is browser numerics and ignores transform attributes. Do not ship it.

### Density and placement
- Density map from the armature at its own grid (labs used 14px, independent of the pixel cell size).
- Clearance ramp: smoothstep from zero at the protected baseline (nav items) to full at baseline + fade. Fade confirmed useful around **16% of surface height** for the nav column; treat as a starting value.
- **weight = (density x clearance)^gamma.** Gamma around **1.4** confirmed as the tracking-but-breathing middle. Budget (total glyph count) is independent, around **120** for the nav column.
- Weighted sampling with replacement over the cumulative distribution, jitter within the cell, seeded.
- Flow align: glyph rotation = cell's blended orientation + small jitter. Confirmed on. The alternative (random rotation) reads as confetti.

### Motion
Reveal (one-shot, on entry):
- Stagger window = **8 x delay.long**. The 8 is the one invented number in the system, see open question 1.
- Stamp and cell fade = duration.base, ease.enter. Path draw = duration.slow.
- Reveal order for the nav column: **top to bottom**, growth descends from the items.
- Crossfade on regenerate: outgoing layer fades over duration.base with ease.exit while the new composition reveals.

Ambient idle (after reveal completes):
- **One shared timing table** drives both faces, chunked into ~12 to 16 spatially coherent groups by draw order. Coupling is the point: the pixel shimmer moves with the glyph drift.
- Vector face: nested CSS sway groups. Outer translateX, inner translateY, keyframes pass through zero (0 / +A / -A / 0) so delayed starts do not jump. Periods per chunk: dx = period x (0.75 to 1.35), dy = period x (0.95 to 1.65). Quasi-periodic Lissajous wander, no rAF.
- period = **8 x duration.slower**. amplitude = **(1 - scale.subtle) x 150**, varied x0.6 to x1.4 per chunk.
- Pixel face: opacity breathe only, grid held. Duration = **chunk dx x 0.5** (two dips per sway cycle). Dip depth = **(1 - scale.subtle) x 12**, varied x0.8 to x1.2 per chunk, floored at 0.5 opacity. Depth is set per chunk through a --dim custom property read by the keyframe.
- CSS custom properties inside keyframes carry per-chunk amplitude and depth (--ampx, --ampy, --dim). This pattern works and keeps one keyframe definition serving all chunks.

Reduced motion:
- Reveal quantizes to **4 discrete steps** with durations of **0.01s**, not zero. Stop-motion arrival, transition events survive.
- **Ambient idle is disabled entirely under reduced motion.** Not quantized, off. Infinite drift is the vestibular trigger, and a background idle demonstrates nothing. This is a deliberate asymmetry with the reveal.

### Nav column case (first shipping surface)
- Tall thin column, items stacked at top, artwork descends beneath. Two roots near the top of the artwork region (the three-roots-under-three-items idea died with the horizontal layout).
- Glass (backdrop blur ~9px, translucent tint) engages **only on nav expand**, covering the expanded panel depth. Collapsed nav runs bare. Static artwork keeps backdrop-filter cheap.
- Rulesets suited to the format: Cadence stochastic branch, Weed, Vine. Vine's lean-and-curl production fits tall narrow spaces.

### Determinism
- mulberry32 everywhere, seeded streams with fixed consumption order. Never mix Math.random into a seeded path. Sort operations that feed rng-consuming loops must themselves be deterministic.
- Analytic traversal is pure arithmetic, reproducible across engines. This was a deciding factor over canvas readback.

---

## 3. Open decisions

Flag these for David rather than resolving silently.

1. **The 8x multipliers.** Stagger window (8 x delay.long) and idle period (8 x duration.slower) use an invented coefficient. Option: bind window to duration.slower directly, making the system fully token-native. David has not ruled.
2. **Pixel cell reveal: scale-in (0.55 to 1) vs pure opacity pop.** Scaling a cell reads slightly organic; a pop may be more honest to the quantized aesthetic. Possible split: vector keeps scale, pixel pops.
3. **Draw order as the only reveal order.** If it wins on all surfaces, the order option disappears and the L-system's chronology becomes the reveal. Nav column already commits to top-to-bottom.
4. **Dominant color per cell vs per stamp.** Per-cell can flicker at the boundary cells of two-color marks. Per-stamp resolves each glyph to one color before rasterization, trading fidelity for mark coherence. Judge with the real traced marks.
5. **Luminance step count in full color.** Four brightness steps per hue may read richer than the hero's flat authored pixel art. Compression options: factor range 0.6 to 1.0, or two steps.
6. **Breathe coupling rate.** dx x 0.5 makes the pixel face the busier idle, inverting the earlier calm-pixel hierarchy. dx x 1.0 restores one dip per sway. One multiplier either way.
7. **Ambient temperament scoping.** Snappy's idle (4.5px, 2.8s, deep dip) may be too lively for a background. Option: ambient always reads Default's scale.subtle regardless of active preset, so backgrounds keep one temperament while foreground motion changes personality. Hierarchy of Motion expressed as token scoping.
8. **Cell size as a per-surface token.** 12px cells across a 300px column is 25 columns, coarse. If marks dissolve at nav scale, this surface needs smaller cells, which makes cell size per-surface rather than global.
9. **Idle start coherence.** All chunks start their cycles together when the reveal ends, giving a faint communal lean for a few seconds before phases spread. Accept as an exhale, or add negative phase offsets and lose the clean starts-after-reveal gate.
10. **45-degree tie-breaks.** Crossings exactly on bucket boundaries round toward the higher bucket. Deterministic, visible on exact geometric rulesets. If direction ever matters aesthetically, name the tie-break rule in the committed set.
11. **Root spread.** If multiple root systems read as separate lonely plants rather than one field, widen spread until canopies merge.

---

## 4. Implementation gotchas

- **Firefox SVG transforms:** the reason pixel face never moves positionally. Verify vector-face sway in current Firefox during build; if it shimmers there too, the fallback is moving the ~16 group transforms to one trivial rAF loop, which is also the upgrade path to true value-noise wander if the Lissajous drift ever reads mechanical.
- **Safari verification:** run the idle on built output and check the main thread, per the standing verification rule. Sixteen animated groups should composite, but should is not verification.
- **Flattener determinism:** getPointAtLength is not guaranteed bit-identical across engines and ignores element transforms. The owned flattener plus explicit transform math is what makes same-seed-same-drawing true everywhere.
- **Backdrop-filter cost:** cheap over static content, expensive over per-frame repaints. The static-composition decision is what makes the glass affordable. If anyone proposes continuous repaint under the glass, that is a fork, not a dial.
- **Thin-stroke thresholds:** presence uses crossing length precisely because hand-drawn strokes are thin. Do not swap in area coverage; a hairline covers 5 to 10 percent of a cell and the composition vanishes at any sane area threshold.
- **Keyframe custom properties:** --ampx, --ampy, --dim in keyframes resolved per element. Keep keyframes passing through zero at 0% so animation-delay does not cause a jump on start.
- **Token integrity:** every timing and amplitude above is a formula over existing tokens (duration.base, duration.slow, duration.slower, delay.long, ease.enter, ease.exit, scale.subtle). The labs hardcode a copy of the preset table because they have no motion.css. Production reads the custom properties through the existing pipeline. A hardcoded millisecond in the shipped system is a bug by project rules.

---

## 5. Reference artifacts from this session

Prototypes, not production code. They demonstrate confirmed behavior and contain working reference implementations of the traversal, sampler, and choreography math.

- **cell-aggregation-lab.jsx** (v3): aggregation rules, ruleset library with auto-fit engine, SVG upload parsing with color capture, full color cell mode. Where the committed aggregation set was chosen.
- **reveal-motion-lab.html**: reveal choreography, presets, reveal orders, reduced motion quantization, crossfade, ambient sway and breathe. Where Lissajous drift and grid-hold were confirmed.
- **landscape-composition-lab.html** (final: Nav Composition Lab): the nav column at real proportions, both faces from one composition, density scatter with gamma, budget, clearance, flow align, full color, shared idle timing table. The closest thing to a product spec.
- **Feasibility report** (research artifact): glyph-stamping L-systems, prior art (Prusinkiewicz predefined surfaces, Houdini J/K/M inputs), Vite import strategy, SVG vs canvas trade-offs, browser rasterization gotchas, scope estimate. The inline-SVG recommendation and glyph authoring spec live there.

---

## 6. Suggested module boundaries

For the proposal phase, subject to recon:

- `lsystem/` : expand (rules, stochastic productions), interpret (turtle, stack, jitter, draw alphabets), profiles (ruleset + turtle constraints + glyph subset per surface).
- `raster/` : walkSegment traversal, density map with clearance, committed aggregation (presence, blend, buckets, color accumulation), shared by density sampling and pixel rendering.
- `glyphs/` : the SVG library, build-time import, owned flattener, normalization, README with the authoring spec.
- `compose/` : sampler (weights, gamma, budget, flow align), stamp transform, display-list output consumed by both renderers.
- `render/` : vector face (paths, drift groups), pixel face (rects, breathe groups), reveal choreography reading motion tokens, crossfade, reduced motion branches.

Atomic commits per concern, confirmation gate before build, per the standing four-phase workflow. Recon supersedes this brief wherever they disagree.

First build step when this work is scheduled: three to six real traced marks committed to the library with the authoring spec, loaded into the Nav Composition Lab, and the open decisions list walked with David's eyes on his own ink.
