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

2. **P9 Timing's `TogglePresetSlot`** (`src/components/PrincipleCard/index.jsx`). The slot exists to demonstrate a preset's motion personality. Flattening it under OS reduce would erase the distinction between Default and Cinematic.

3. **P13 Systematization's demo** (`src/components/PrincipleCard/index.jsx`). The Tempo slider needs to drive visible change across three demo components. Flattening would freeze the demo and obscure the principle.

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
