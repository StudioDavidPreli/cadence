// ─── Per-theme ink transforms ────────────────────────────────────────────────
//
// The mark libraries are authored art, and each one was drawn for one polarity.
// The Token Lab library was re-cut for DARK on 2026-07-27, so light is now the
// theme it has to be carried into rather than the other way round.
//
// That is a tone problem, not a legibility one. This is decorative art behind
// nav items, in the same class as `--color-demo-field`, so the WCAG 3:1 bar for
// graphical strokes does not apply to it and "under 3:1" reads as "quiet".
//
// The library is two populations and the measurement separates them cleanly:
//
//   rats     98.8% of stroke length under 3:1 on light, 1.2% on dark. Authored
//            pale, so they are invisible on light. Transforming lands them at
//            1.2% on light, an exact mirror of what they already do on dark.
//   runners  two inks each, one that reads on light and one that reads on dark.
//            Already self-theming, so a transform would only swap which half of
//            the mark recedes. The per-ink ratios are in NavBackgroundArt.
//
// So the transform is scoped to the rats' inks rather than applied to the
// library. That scoping lives in NavBackgroundArt, which is the only place that
// knows which marks are which; this module still transforms one ink at a time
// and has no idea a rat exists.
//
// Two modes are wired because the choice between them is a look decision:
//
//   invert     per-channel 255-x. Cheapest, and correct for a pale near-grey
//              palette, where a hue rotation has almost nothing to rotate.
//
//   lightness  flip L in OKLab, keep hue, fit chroma back into sRGB. Costs ~35
//              lines of colour math and earns them on chromatic art.
//
// ── Why the rats take `invert` ────────────────────────────────────────────────
//
// Both modes hit the same tonal number on this palette (1.2% under 3:1 on
// light), so tone does not decide it. What decides it is that the rats live in a
// narrow pale band, roughly L 0.88 to 0.94. Flipping L maps that band against
// zero, where sRGB has no room left to separate it:
//
//   #dcdbde  13.0%   invert -> #232421    lightness -> #040405
//   #e8e8eb  11.5%   invert -> #171714    lightness -> #010101
//   #e9e9eb   9.7%   invert -> #161614    lightness -> #010101
//   #efeeee   0.5%   invert -> #101111    lightness -> #000000
//
// Four of the heaviest inks collapse onto the same black and the fur loses its
// shading. Invert holds them apart and keeps their ordering. The one price is
// `#b89a98`, a warm pink-grey at 3.5% of rat stroke length, arriving as the
// teal `#476567`.
//
// The general rule this is an instance of: `invert` for a pale near-achromatic
// palette, `lightness` for a chromatic one. An earlier version of this file
// argued the opposite default, correctly, for a library whose heaviest inks
// were a saturated red and green.
//
// Neither is applied to a token-bound ink or under the high-contrast blanket.
// That is enforced by ordering in `inkFromKey`, not here: both of those branches
// return before this module is reached. A `currentColor` stroke already flips
// per theme through `--color-text-base`, and transforming it a second time would
// drive the dark theme's `#e1e1e1` back down to `#1e1e1e`.

// ── Ink identity ─────────────────────────────────────────────────────────────
//
// The sentinel and the key function live HERE rather than in BackgroundArt
// because three places now need to agree on what identifies an ink: the
// renderer resolving one to a colour, the census counting stroke length per
// ink, and the lab keying its overrides. Two copies of this rule would drift,
// and the drift would be invisible until an override silently missed a stroke.
export const TOKEN_INK_KEY = 'currentColor'

export function inkKeyOf(stroke) {
  return stroke.tokenBound ? TOKEN_INK_KEY : (stroke.color || null)
}

// Non-hex in, same value out. A palette entry is a token read and could come
// back as `rgb()`, `oklch()`, or a `color-mix()`, and the honest response to a
// colour space this module cannot parse is to leave it alone. `shade()` in
// BackgroundArt takes the same posture for the same reason.
function parseHex(color) {
  if (typeof color !== 'string' || color[0] !== '#') return null
  const body = color.slice(1)
  const full = body.length === 3 ? body.split('').map((c) => c + c).join('') : body
  if (full.length !== 6 || !/^[0-9a-f]{6}$/i.test(full)) return null
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

const toHex = (rgb) =>
  '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')

// sRGB transfer function, both directions. OKLab is defined on linear light, so
// every conversion has to pass through these rather than operating on the 0-255
// values directly.
const toLinear = (v) => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4 }
const toGamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255

function rgbToOklab([r, g, b]) {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}

function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ]
}

// Half a unit of slack, because the round-trip is lossy at the ends and an exact
// 0/255 boundary test would reject colours that quantize to a valid byte.
const inGamut = (rgb) => rgb.every((v) => v >= -0.5 && v <= 255.5)

// Flipping lightness while holding a and b fixed pushes saturated colours out of
// sRGB, where they clip to something much darker than asked for: an early test
// of the naive version drove `#ddaa3c` to `#3b0d00`, worse than leaving it. So
// chroma is the variable that gives. Binary search the largest chroma that still
// lands in gamut at the target lightness, holding hue exactly.
function fitChroma(L, C, H, steps = 16) {
  const at = (c) => oklabToRgb([L, c * Math.cos(H), c * Math.sin(H)])
  if (inGamut(at(C))) return at(C)
  let lo = 0, hi = C
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(at(mid))) lo = mid
    else hi = mid
  }
  return at(lo)
}

// Small and bounded: the three libraries hold 73 distinct authored inks between
// them, so this tops out around 219 entries across all modes and is never
// invalidated. It exists because `inkFromKey` runs unmemoized on every render,
// once per stroke run, and the vector face emits over a thousand runs (1,627 on
// the Token Lab library at seed 4242). Without the cache the OKLab path would
// run that many times per frame; with it, once per ink per mode for the session.
//
// Nothing shipped takes the OKLab path today: the rats are on `invert`, which is
// six arithmetic operations. The cache still earns its place on the mode the lab
// can switch to, and it is what makes that switch free rather than a per-frame
// colour-space conversion over every stroke run.
const cache = new Map()

/**
 * Resolve an authored ink for the current theme.
 *
 * @param {string} color  the authored hex, as written in the .svg
 * @param {'authored'|'invert'|'lightness'} [mode]
 * @returns {string} the ink to paint with
 */
export function transformInk(color, mode = 'authored') {
  if (mode === 'authored' || !mode) return color

  // Ink keys are compared as raw strings everywhere else in this system, and the
  // libraries are not consistent about case (mantis.svg authors `#4CA069` while
  // the rest of Token Lab is lowercase). Normalizing here keeps one cache entry
  // per colour rather than one per spelling.
  const key = mode + '|' + color.toLowerCase()
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const rgb = parseHex(color)
  let out = color
  if (rgb) {
    if (mode === 'invert') {
      out = toHex(rgb.map((v) => 255 - v))
    } else if (mode === 'lightness') {
      const [L, a, b] = rgbToOklab(rgb)
      out = toHex(fitChroma(1 - L, Math.hypot(a, b), Math.atan2(b, a)))
    }
  }

  cache.set(key, out)
  return out
}

export const INK_MODES = ['authored', 'invert', 'lightness']
