# The Principles

[Cadence: Case Study](index.md) · Chapter 2

---

## The Principles as UI Curriculum

<!-- V08: live Token Fidelity embed. The iframe serves ExpandedPrincipleBody's third frame
     from the app itself (?embed=token-fidelity&theme=dark); the route is live on production
     (PR #2, 2026-08-15). David's fallback SVG sits behind the iframe as its background:
     visible while the document loads and when it cannot. -->
<style>
  .v08-layout { display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap; }
  .v08-text { flex: 1 1 320px; min-width: 280px; }
  .v08-figure { flex: 0 0 auto; max-width: 100%; margin: 0; }
  .v08-figure iframe { border: 0; display: block; background: url(media/tokenFidelityFallback.svg) center / contain no-repeat; }
  .v08-caption { font-size: 12px; color: #909090; max-width: 462px; margin-top: 8px; }
</style>
<div class="v08-layout">
  <div class="v08-text">
    <p>Every principle is demonstrated twice: a Rive illustration on the animation side, and a real UI component driven by the live token system on the other. The pairing is the pedagogy. A motion designer already knows what anticipation looks like; what Cadence shows is where anticipation lives in an interface (a drawer that lifts before it leaves) and which tokens produce it (<code>ease.exit</code> at <code>duration.slow</code>, with keyframes carrying the countermotion).</p>
    <p>Real components were chosen over abstract shapes because abstraction is the problem being solved. A bouncing ball demonstrates easing; it does not demonstrate why a dropdown's chevron should share its menu's timing. The demos borrow Token Lab's own Button, Drawer, Modal, and Carousel, so a principle learned in one tool is recognizable in the other, and every demo responds when a token changes.</p>
    <p>The six extensions are the original contribution. The classic 12 teach how motion reads; the extensions teach how motion scales: Systematization, Hierarchy of Motion, Economy, Token Fidelity, Reduced Motion, and Shared Vocabulary. They are the principles I needed when I moved from animating one thing well to making motion consistent across a system.</p>
  </div>
  <figure class="v08-figure">
    <iframe src="https://cadence.davidpreli.com/?embed=token-fidelity&theme=dark" width="462" height="522" loading="lazy" title="Token Fidelity, live from Cadence"></iframe>
    <figcaption class="v08-caption">Live from the tool: Token Fidelity, principle 16. Everything in the panel runs here, the Motion/UI toggle, the deviant pill, the Harmonize repair.</figcaption>
  </figure>
</div>

---

## Build Notes

Each of the eighteen carries the same four fields: the component, the tokens driving it, the key decision, and what it demonstrates. Three are here because each argues something the others do not; the full set has [its own page](build-notes.md).

#### 05. Follow Through and Overlapping Action
**UI Component:** Carousel (compact, text-only) with its dot indicator
**Token values driving it:** `spring.stiffness`, `spring.damping`, `spring.mass`: the snap runs the real physics spring, with the flattened bezier branch as the reduced-motion fallback
**Key decision:** The dot's width animates on the same transition object as the slide, so the follow-through is a property of the system, not a choreographed lag. The dot spent months on a CSS transition to stay clear of the projection system; it returned to Framer Motion as direct value animation, which never touches projection, once the original hazard was named precisely enough to know what was safe. (See [Key Decisions](key-decisions.md).)
**What it demonstrates:** Settling as physics. The slide overshoots and rings down, the dot rides the same spring, and nothing here has a duration.

#### 09. Timing
**UI Component:** Two Toggles, each scoped to a different preset via `MotionTokensProvider`
**Token values driving it:** `duration.fast/base/slow` compared across presets
**Key decision:** The real presets differ by only 100ms on the token the Toggle animates, too small to read in one flip, so the demo slows the Cinematic slot by a fixed, demo-scoped factor. The amplification is honest and documented; the preset keeps its true values everywhere else.
**What it demonstrates:** Duration alone changes personality. No easing difference, no path difference, and one Toggle feels decisive while the other feels considered.

#### 16. Token Fidelity
**UI Component:** Three identical pills, one deviant
**Token values driving it:** `duration.base` and `ease.standard` on two pills; a hardcoded 600ms linear on the third, and a Harmonize toggle that repairs it
**Key decision:** Make the wrongness perceptual before it is explained. The deviant pill arrives late at constant velocity and reads as mechanical before the viewer knows why.
**What it demonstrates:** A hardcoded value is not a shortcut; it is visible damage.

---

[← The Token System](token-system.md) · [Fields and Canvases →](fields-and-canvases.md)
