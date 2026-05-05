// Motion-token preset data. Lives in its own leaf module so it can be imported
// by TokenLab (which authored these presets) and by PrincipleCard (the Timing
// principle demo) without forming a circular dependency. TokenLab imports
// PrinciplesLibrary, which imports PrincipleCard, so PrincipleCard cannot
// import from TokenLab without a cycle. A separate leaf module breaks the loop.

// ─── Easing curves ────────────────────────────────────────────────────────────
// Each curve has a `css` form (cubic-bezier string, for setProperty calls) and
// an `fm` form (four-number array, for Framer Motion's transition.ease).
export const EASING_CURVES = {
  linear:   { label: 'Linear',   css: 'cubic-bezier(0, 0, 1, 1)',           fm: [0, 0, 1, 1] },
  standard: { label: 'Standard', css: 'cubic-bezier(0.4, 0, 0.2, 1)',       fm: [0.4, 0, 0.2, 1] },
  enter:    { label: 'Enter',    css: 'cubic-bezier(0, 0, 0.2, 1)',         fm: [0, 0, 0.2, 1] },
  exit:     { label: 'Exit',     css: 'cubic-bezier(0.4, 0, 1, 1)',         fm: [0.4, 0, 1, 1] },
  spring:   { label: 'Spring',   css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fm: [0.34, 1.56, 0.64, 1] },
}

// ─── Initial state ────────────────────────────────────────────────────────────
// The "Default" preset's state. Defined separately so the Default entry in
// BUILT_IN_PRESETS can reference it without duplicating values.
export const INITIAL_STATE = {
  duration: { fast: 100, base: 200, slow: 400, slower: 600 },
  easing:   'standard',
  delay:    { short: 50, medium: 100, long: 200 },
  scale:    { subtle: 0.98, base: 0.95, expressive: 0.9, lift: 1.02 },
}

// ─── Built-in presets ─────────────────────────────────────────────────────────
// Three presets that demonstrate meaningfully different motion personalities.
// isBuiltIn: true prevents these from being deleted by the user.
export const BUILT_IN_PRESETS = [
  {
    id: 'default',
    label: 'Default',
    isBuiltIn: true,
    tooltip: 'These values ship in most design systems without modification. Start here.',
    state: INITIAL_STATE,
  },
  {
    id: 'snappy',
    label: 'Snappy',
    isBuiltIn: true,
    tooltip: 'Short durations, spring easing, tight delays. High energy, confident.',
    state: {
      duration: { fast: 60, base: 120, slow: 200, slower: 350 },
      easing:   'spring',
      delay:    { short: 20, medium: 40, long: 80 },
      scale:    { subtle: 0.97, base: 0.93, expressive: 0.87, lift: 1.04 },
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    isBuiltIn: true,
    tooltip: 'Long durations, decelerating easing, generous delays. Considered, editorial.',
    state: {
      duration: { fast: 200, base: 500, slow: 900, slower: 1400 },
      easing:   'enter',
      delay:    { short: 100, medium: 200, long: 400 },
      scale:    { subtle: 0.99, base: 0.97, expressive: 0.94, lift: 1.01 },
    },
  },
]

// ─── stateToTokens ────────────────────────────────────────────────────────────
// Converts a preset's `state` object (CSS-side units: ms, named easing key,
// unitless scale) into the React-side token shape that MotionTokensProvider
// expects (seconds for duration/delay, four-number arrays for easing).
export function stateToTokens(state) {
  const activeCurve = Array.isArray(state.easing)
    ? state.easing
    : EASING_CURVES[state.easing].fm

  return {
    duration: {
      fast:   state.duration.fast   / 1000,
      base:   state.duration.base   / 1000,
      slow:   state.duration.slow   / 1000,
      slower: state.duration.slower / 1000,
    },
    ease: {
      linear:   EASING_CURVES.linear.fm,
      standard: activeCurve,
      enter:    EASING_CURVES.enter.fm,
      exit:     EASING_CURVES.exit.fm,
      spring:   EASING_CURVES.spring.fm,
    },
    delay: {
      none:   0,
      short:  state.delay.short  / 1000,
      medium: state.delay.medium / 1000,
      long:   state.delay.long   / 1000,
    },
    scale: { ...state.scale },
  }
}
