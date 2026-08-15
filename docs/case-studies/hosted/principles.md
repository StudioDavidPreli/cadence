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

### The Classic 12

#### 01. Squash and Stretch
**UI Component:** Button (the same one from Token Lab's Press & State demo)
**Token values driving it:** `scale.pressBase`, `duration.fast`, `ease.standard`, `ease.overshoot`
**Key decision:** One scale value carries both halves of the principle; the split lives in the easing, `ease.standard` down and `ease.overshoot` back. And reuse the component the user has already met rather than build a demo prop, so the principle attaches to something they have pressed before.
**What it demonstrates:** Weight. The press compresses, the release overshoots past rest before settling, and the travel is a few percent of scale doing the whole job.

#### 02. Anticipation
**UI Component:** Drawer (scoped, from Enter & Exit)
**Token values driving it:** `duration.slow`, `ease.enter`, `ease.exit`
**Key decision:** Enter and exit share one duration; the character splits in the easing and the keyframe spacing, and the countermotion lives on the exit, a lift in the first fifth of the clock before the drop.
**What it demonstrates:** An action that is caused rather than one that merely happens. The drawer states its intent before it leaves.

#### 03. Staging
**UI Component:** Modal with backdrop
**Token values driving it:** `duration.slow`, `ease.enter`
**Key decision:** The backdrop is the demonstration, not the panel. Staging is the darkening as much as the lighting.
**What it demonstrates:** Clearing the stage. The dim removes everywhere else the eye could land.

#### 04. Straight Ahead and Pose to Pose
**UI Component:** Compact Stepper above a ProgressBar, one shared `step` counter
**Token values driving it:** `duration.base`, `ease.standard`, `delay.short/medium/long`, `duration.slow`
**Key decision:** Drive both components from a single counter so "two approaches to the same motion" is literal: one advance, one discrete visualization, one continuous.
**What it demonstrates:** The designer controls the poses; the system controls the in-betweens. UI animation is pose to pose almost by definition.

#### 05. Follow Through and Overlapping Action
**UI Component:** Carousel (compact, text-only) with its dot indicator
**Token values driving it:** `spring.stiffness`, `spring.damping`, `spring.mass`: the snap runs the real physics spring, with the flattened bezier branch as the reduced-motion fallback
**Key decision:** The dot's width animates on the same transition object as the slide, so the follow-through is a property of the system, not a choreographed lag. The dot spent months on a CSS transition to stay clear of the projection system; it returned to Framer Motion as direct value animation, which never touches projection, once the original hazard was named precisely enough to know what was safe. (See [Key Decisions](key-decisions.md).)
**What it demonstrates:** Settling as physics. The slide overshoots and rings down, the dot rides the same spring, and nothing here has a duration.

#### 06. Slow In and Slow Out
**UI Component:** ProgressBar with a Tokens / Linear toggle
**Token values driving it:** `ease.standard` vs `ease.linear`, `duration.slow`
**Key decision:** Same duration on both settings, so the only variable is the curve. When the toggle returns to Tokens, the controls panel's title flashes once, drawing the thread to where the value lives.
**What it demonstrates:** Identical timing, different curve, categorically different character. Linear motion belongs to machines.

#### 07. Arc
**UI Component:** Tooltip
**Token values driving it:** `duration.base`, `ease.enter`
**Key decision:** Three keyframes, not two. Two keyframes ease the speed but leave the path a straight line; the third bends the trajectory, and the bend is the principle.
**What it demonstrates:** A tooltip that rises straight up reads as a notification. One that arcs in reads as an answer arriving from somewhere.

#### 08. Secondary Action
**UI Component:** Dropdown with rotating chevron
**Token values driving it:** `duration.fast`, `ease.standard`, shared by menu and chevron
**Key decision:** One timing for both motions so they read as a single gesture. The chevron carries no information the menu does not; confirmation is its entire job.
**What it demonstrates:** Subordination. The moment a secondary action pulls the eye from the thing it supports, it has become noise.

#### 09. Timing
**UI Component:** Two Toggles, each scoped to a different preset via `MotionTokensProvider`
**Token values driving it:** `duration.fast/base/slow` compared across presets
**Key decision:** The real presets differ by only 100ms on the token the Toggle animates, too small to read in one flip, so the demo slows the Cinematic slot by a fixed, demo-scoped factor. The amplification is honest and documented; the preset keeps its true values everywhere else.
**What it demonstrates:** Duration alone changes personality. No easing difference, no path difference, and one Toggle feels decisive while the other feels considered.

#### 10. Exaggeration
**UI Component:** NotificationBadge with New / Clear triggers
**Token values driving it:** `scale.pressExpressive`, `ease.overshoot`, `duration.slow`
**Key decision:** Re-key the badge on every increment so the enter animation fires each time; the compress comes from the initial scale and the overshoot from the bezier, two motion sources composing one alert.
**What it demonstrates:** A badge that scales to exactly 1.0 registers as a state change. The overshoot is what turns it into an alert.

#### 11. Solid Drawing
**UI Component:** Card, centered with room around it
**Token values driving it:** `scale.lift`, `duration.base`, `ease.standard`
**Key decision:** Sixteen pixels of margin on every side so the 2% lift reads against empty space instead of against neighbors.
**What it demonstrates:** The implied z-axis. The selected card is not highlighted; it has come forward, and the surface it was embedded in is now behind it.

#### 12. Appeal
**UI Component:** A 2x2 grid of compact Cards with ASCII faces
**Token values driving it:** All of them: `duration.slower` drives an ambient drift, `duration.base` the settle, `ease.standard` the neutral states, `ease.overshoot` the selection
**Key decision:** Per-card phase offsets on the idle drift so the four never sync. Selection freezes the drift, dims the siblings, lifts the chosen card.
**What it demonstrates:** Appeal is the other principles working in concert. Nothing here is remarkable alone; nothing is wrong.

### The Extended 6

#### 13. Systematization
**UI Component:** A Tempo slider over a Toggle, compact Card, and ProgressBar
**Token values driving it:** The whole duration family, scaled proportionally by the slider
**Key decision:** Scale durations only. Delays stay proportional and easing stays untouched, because the principle is temporal coherence, not curve shape.
**What it demonstrates:** One slider moves and every component responds at its own native speed. The system has one voice.

#### 14. Hierarchy of Motion
**UI Component:** A PARENT pill above three indented CHILD rows, drawn as a tree
**Token values driving it:** `duration.base`, `ease.standard`, `delay.short/medium/long`
**Key decision:** The children are not interactive. Only the parent can initiate motion, so the demo's interaction model enforces the principle it teaches.
**What it demonstrates:** Authority flows downward, and the cascading delays are the hierarchy made visible.

#### 15. Economy
**UI Component:** Three horizontal bars with a Pan trigger
**Token values driving it:** `duration.slow/base/fast`, `ease.standard`, one per bar
**Key decision:** Depth from three opacity levels and three speeds, no shadows, no stacking order. Three layers of parallax suggest a world; thirty just suggest thirty.
**What it demonstrates:** The smallest set of moves that produces the intended depth. Every motion element earns its place.

#### 16. Token Fidelity
**UI Component:** Three identical pills, one deviant
**Token values driving it:** `duration.base` and `ease.standard` on two pills; a hardcoded 600ms linear on the third, and a Harmonize toggle that repairs it
**Key decision:** Make the wrongness perceptual before it is explained. The deviant pill arrives late at constant velocity and reads as mechanical before the viewer knows why.
**What it demonstrates:** A hardcoded value is not a shortcut; it is visible damage.

#### 17. Reduced Motion
**UI Component:** A Reduce toggle over a Run button, ProgressBar, and Card
**Token values driving it:** All of them, conditionally: durations flatten to 0.01s, delays to zero; easing and scale stay, since they are not perceived at near-zero duration
**Key decision:** The demo's toggle is the single source of truth inside its scope, so both states are visible regardless of the viewer's OS setting. The support underneath is real: `prefers-reduced-motion` is wired through the entire codebase, not simulated in one card.
**What it demonstrates:** Reduced motion as a first-class state. The interface communicates the same information without requiring the user to process movement.

#### 18. Shared Vocabulary
**UI Component:** Two tracks, two dots, one curve
**Token values driving it:** The named presets themselves; the demo pins canonical curve values so the binding between name and numbers stays fixed
**Key decision:** Label one track "Snappy" and the other "0.34, 1.56, 0.64, 1" and let them run identically. The comparison is the whole demo.
**What it demonstrates:** Motion values that cannot be named cannot be systematized. The name carries the intention the numbers cannot, and a named preset is the minimum unit of design-engineering communication.

---

[← The Token System](token-system.md) · [Fields and Canvases →](fields-and-canvases.md)
