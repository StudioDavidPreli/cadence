# Token Architecture

The token layer is CSS custom properties. Components do not hardcode animation values. They read tokens at runtime via `getComputedStyle`. This is the same pattern used by Material, Primer, and other production design systems, and it is what allows Token Lab to update component behavior in real time when a token value changes.

For the rule itself and the canonical read pattern, see CLAUDE.md, "Core Architecture Principle." This document covers what the tokens are and how to add a new one.

---

## Token Structure

Defined in `src/tokens/motion.css`.

```css
:root {
  /* Duration */
  --motion-duration-fast: 100ms;
  --motion-duration-base: 200ms;
  --motion-duration-slow: 400ms;
  --motion-duration-slower: 600ms;

  /* Easing */
  --motion-ease-linear: cubic-bezier(0, 0, 1, 1);
  --motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --motion-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --motion-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Delay */
  --motion-delay-none: 0ms;
  --motion-delay-short: 50ms;
  --motion-delay-medium: 100ms;
  --motion-delay-long: 200ms;

  /* Scale */
  --motion-scale-subtle: 0.98;
  --motion-scale-base: 0.95;
  --motion-scale-expressive: 0.9;
}
```

---

## Standard token addition workflow

When adding any new token to the project, follow this sequence:

1. Define it in `src/tokens/motion.css`. Single source of truth.
2. Add the fallback value and `getPropertyValue` read to `useMotionTokens`. This makes it available to all components without each one repeating the read.
3. Replace any hardcoded value in the component with the new token reference. The component now reads from the system.

The order matters. Defining the token first means step 2 has something to point at; doing step 2 before step 3 means the component swap is a one-line change rather than a coordinated edit.
