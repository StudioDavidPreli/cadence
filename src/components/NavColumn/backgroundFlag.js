// The background artwork is post-launch v1.x work on a shipped site, so it is
// opt-in per page load and off by default.
//
//   ?bg=1   anywhere in the query string, e.g.
//           https://cadence.davidpreli.com/?bg=1#/token-lab
//
// A query flag rather than a build-time constant because the checks that matter
// are on the deployed site and on built output, where a rebuild to flip a
// constant is a poor trade. The app's own routing lives in the hash, so a query
// parameter sits beside it without colliding.
//
// Read once at module scope: it cannot change without a reload, and nothing
// should re-render on it.
//
// Its own module so the flag can be imported by a component file without
// tripping the fast-refresh rule about mixed exports.
export const BACKGROUND_ENABLED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('bg')
