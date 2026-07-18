# Reduced motion architecture (2026-05-06)

This document captures the design choice made when wiring `prefers-reduced-motion` into Cadence as part of building Principle 17 (Reduced Motion). Read it before changing anything in `src/context/MotionTokensContext.jsx`, `src/hooks/useMotionTokens.js`, or any `MotionTokensProvider` call site.

---

## What changed

Before this change, Cadence had no reduced-motion handling. Every component animated at full token speed regardless of the user's OS-level `prefers-reduced-motion` setting. Principle 17 was a placeholder — the demo card had no way to honor the principle it was teaching.

After this change:

1. The `MotionTokensProvider` accepts a `respectReducedMotion` prop (default `true`). When the prop is `true` and the user has OS-level `prefers-reduced-motion` enabled, the provider flattens its `tokens` prop via `reduceMotion()` before exposing it through context.

2. The `useMotionTokens()` hook accepts an options object `{ respectReducedMotion?: boolean }` (default `true`). On the no-provider path (most of the app), the hook applies `reduceMotion()` to the CSS-read tokens when the OS pref is reduce. When a provider is in scope, the hook trusts the provider — the provider has already decided whether to apply `reduceMotion`.

3. `reduceMotion(tokens)` flattens every duration to `0.01 s` and every delay to `0`. Easing curves and scale values stay unchanged; at 10 ms total duration they are not perceived.

The combined effect: every component reading `useMotionTokens()` automatically honors the user's OS preference, with no per-component code changes.

---

## Why duration `0.01 s` and not `0`

`duration: 0` has edge cases in Framer Motion. `onAnimationComplete` callbacks don't always fire, and some interruption logic short-circuits. `0.01 s` is indistinguishable from instant to the eye but keeps the animation pipeline well-formed. State-machine-style components (`Stepper`, `Carousel`) that depend on the animation lifecycle continue to work without modification.

## Why `ease` and `scale` are not flattened

At 10 ms total duration, the curve shape and the start scale factor are imperceptible. Flattening them adds code without changing user-visible behavior. Spring overshoot is the special case worth flagging — at 10 ms it resolves before the eye can register, so users who explicitly prefer no bounce still get effectively no bounce.

---

## Opt-outs

Four scopes opt out of OS-level reduce-motion by passing `respectReducedMotion={false}` to their `MotionTokensProvider`:

1. **TokenLab live demo** (`src/components/TokenLab/index.jsx`). TokenLab is a motion-exploration tool. The user is here specifically to perceive motion. Honoring OS-level reduce-motion would flatten every preview to instant and defeat the tool's purpose.

2. **P9 Timing's `TogglePresetSlot`** (`src/components/PrincipleCard/index.jsx`). The slot exists to demonstrate a preset's motion personality. Flattening it under OS reduce would erase the distinction between Default and Cinematic. *(Revoked 2026-07-17: see the addendum. The slot now derives the prop from the card's gate.)*

3. **P13 Systematization's demo** (`src/components/PrincipleCard/index.jsx`). The Tempo slider needs to drive visible change across three demo components. Flattening would freeze the demo and obscure the principle. *(Revoked 2026-07-17: see the addendum. The demo now derives the prop from the card's gate.)*

4. **P17 Reduced Motion's demo** (`src/components/PrincipleCard/index.jsx`). The demo's own local toggle is the source of truth for whether motion is reduced inside its scope. The user can see both "before" and "after" states regardless of OS setting.

The general rule: **scopes whose explicit purpose is to demonstrate motion opt out**. Other scopes inherit the default and respect the OS preference.

---

## What still respects OS reduce-motion

Everything not inside one of the four opt-out scopes. This includes:

- The principle grid card hover lift (`Card` component used in `PrinciplesLibrary`)
- The principle expanded card scale animation (the FLIP between collapsed and expanded)
- The principle icon Rive canvas inside collapsed cards
- The drawer / modal entrance animations when opened from a principle demo
- Every `Toggle`, `Button`, `Stepper`, `NotificationBadge`, and other component reading `useMotionTokens()` outside an opt-out provider

These are interaction motions, not exploratory. A user who has enabled reduce-motion at the OS level expects them to flatten, and they do.

---

## How the P17 demo override works

The P17 demo card calls `useMotionTokens({ respectReducedMotion: false })` to read raw tokens. It then computes either the raw tokens or `reduceMotion(rawTokens)` based on its own `reduced` state. The result is passed to a `MotionTokensProvider` with `respectReducedMotion={false}` so the provider doesn't re-flatten.

Components inside the demo (`Card`, `ProgressBar`) read `useMotionTokens()` (default opts), find the demo's provider, and trust whatever's in context. The demo's local toggle is the single knob that controls motion within its scope.

This pattern — read-raw, transform-locally, provide-with-opt-out — is the canonical way to scope a custom motion override anywhere in the app.

---

## Trade-offs accepted

- **TokenLab opting out** means a reduce-motion user opening TokenLab will see motion regardless of their preference. This is a deliberate choice: TokenLab is a workshop, not a destination. The user has navigated into it specifically to manipulate motion. Respecting reduce-motion here would prevent them from doing that work.

- **Principle demo opt-outs are per-provider, not per-card.** P14 (Hierarchy of Motion), P15 (Economy), P16 (Token Fidelity), and others read `useMotionTokens()` directly without their own provider, so they currently respect OS reduce-motion. A user with reduce-motion enabled visiting those demos sees them snap. If we later decide every principle demo should opt out (because the user has explicitly opened the demo to see motion), the simplest change is to wrap the entire `.animationHalf` content in a `MotionTokensProvider` with `respectReducedMotion={false}`. This is documented as a possible future change but not made now — the snap-version of those demos still teaches the principle's structure (see the cascade in P14, the layer separation in P15) even at near-zero duration.

- **`reduceMotion()` lives in `MotionTokensContext.jsx`.** It could live in a separate utility module, but it is tightly coupled to the token shape that the context defines. Co-locating keeps the dependency graph simple — `useMotionTokens.js` already imports from this file, and adding a third file for one helper would be over-modularization.

---

## Addendum (2026-07-17): library demos respect the OS preference; a per-card gate provides explicit playback

David's decision, closing the open question the 2026-07-16 audit carried as "Reduced-motion pedagogy for P14, P15, P16": the principle library's demos are real UI wired to the token system, so they follow the machine's reduced-motion setting like any other UI. The pedagogical escape hatch is explicit, per-instance playback, not a blanket opt-out. The "wrap `.animationHalf` in an opt-out provider" alternative sketched in the trade-offs section above was considered and rejected: opening a card is not consent to motion.

What changed (revised same day: David's first reduce-motion sweep found the original single-layer version undiscoverable, since the control only rendered in the UI view while the Rive layer, the first thing an expanded card shows, kept playing; the control now sits at card level and governs both layers):

- **One per-card boolean governs both demo layers.** `PrincipleCard` holds `showDemoMotion` and resets it on collapse: consent is per-instance, never remembered. Under `prefers-reduced-motion` the card renders `DemoMotionControl` (the "View motion" button, `src/components/DemoMotionGate/`) below the Motion/UI crossfade wrapper, so it is reachable in both views. The boolean drives the Rive animation layer via a new `paused` prop on `PrincipleAnimation` (same `rive.pause()`/`rive.play()` pattern as `PrincipleIcon`'s universal pause; the animation draws its first frame and holds), and drives the UI demo layer via `DemoMotionGate`, the controlled token scope: with no OS preference it renders children untouched, otherwise it provides flattened tokens while off and raw tokens while on. The scope's mechanism is the canonical P17 pattern: read raw via `useMotionTokens({ respectReducedMotion: false })`, flatten or not locally, provide with `respectReducedMotion={false}` so the provider does not re-flatten.

- **The P9 and P13 opt-outs are revoked.** `TogglePresetSlot` (Timing) and the Systematization demo now pass `respectReducedMotion={!motionAllowed}`, where `motionAllowed` comes from `useDemoMotionAllowed()` (`src/components/DemoMotionGate/motionGateContext.js`): true when there is no OS preference, otherwise the enclosing gate's on state. Under OS reduce with the gate off they flatten like every other demo; the gate restores their real timing.

- **The collapsed grid starts still.** The library's universal icon pause defaults on under the OS preference; the existing header Pause/Play button is the explicit-playback affordance and a user press overrides in either direction (`pausedChoice ?? prefersReduced` in `PrinciplesLibrary`).

- **P17 is exempt from the token scope only.** Its own Reduce toggle owns its demo, and wrapping it would put a provider above its raw-token read (`useMotionTokens` ignores the `respectReducedMotion` option when a provider is in scope), breaking its Full state. The card's View motion control still renders on P17 and still governs its Rive layer.

- **Token Lab's opt-out is unchanged.** The whole tool is a motion-exploration surface; this decision's scope was the principles library.

The general rule replaces the one stated in the Opt-outs section: **library demos respect the OS preference, and per-card user-initiated playback is the demonstration path.** Rule for future principles: never pass a literal `respectReducedMotion={false}` in a principle demo; a demo that builds its own scoped provider derives the prop from `useDemoMotionAllowed()`.

Known remaining gap, scoped as its own pass: the rest of the Rive surface (hero rest states, the bug-report buttons, the Motion Tiles field and its chrome). The policy for that pass: chrome Rive freezes at a designed rest state; demonstration Rive starts paused behind an explicit play affordance.

Verified on built output via the Tier 1 suite: under `page.emulateMedia({ reducedMotion: 'reduce' })` the control renders in the first (Motion) view off by default and toggles `aria-pressed`, P17 carries the control too, the grid's header button reads Play with `aria-pressed` true and flips on press, and without the emulation the control never renders (`e2e/themes.spec.js`).
