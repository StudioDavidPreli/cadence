// Static SVG posters for Rive chrome under prefers-reduced-motion
// (2026-07-18). David exports one file per surface per display mode from the
// source art into /public/fallBacks, flat naming: <surface><Theme>.svg.
//
// Why a poster instead of a paused canvas: some files draw nothing until
// their state machine advances (the hero's first frame is clock-driven), so a
// held frame 0 is not a designed still. The poster is composed deliberately,
// and rendering an <img> instead of mounting the canvas also skips the .riv
// fetch, the WebGL surface, and (when no other canvas mounts) the WASM binary
// entirely for users who will never see the animation.
//
// Decision record: docs/decisions/reduced-motion-2026-05-06.md (2026-07-17
// addendum and its poster update).
const THEME_SUFFIX = {
  dark: 'DarkMode',
  light: 'LightMode',
  'high-contrast-light': 'ContrastLight',
  'high-contrast-dark': 'ContrastDark',
}

// surface: 'hero3' | 'hero3Mobile' | 'tokenLab' | 'motionTilesOverview' |
// 'enter' | 'problems' — must match the exported filenames in /public/fallBacks.
export function riveFallbackSrc(surface, theme) {
  return `/fallBacks/${surface}${THEME_SUFFIX[theme] ?? 'DarkMode'}.svg`
}
