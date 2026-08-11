// ─── cssColor ───────────────────────────────────────────────────────────────
//
// Read a CSS custom property and hand back the channel numbers a non-CSS
// consumer needs. Rive is the only such consumer today: its view model color
// properties take r/g/b integers through `instance.color(name).rgb(r, g, b)`,
// so a theme color that lives in `color.css` has to cross out of CSS to reach
// the canvas.
//
// The resolution goes through the browser rather than through a regex, and that
// is the whole point of this module. A custom property's computed value is the
// raw token stream the stylesheet authored, and the stylesheet that ships is
// the MINIFIED one: `#ffffff` may arrive as `#fff`, a hex may arrive as a
// color keyword, and a value authored as one syntax may arrive as another. A
// parser that assumes the authored spelling is exactly the 2026-07-15 crash
// (the CSS minifier rewrote `400ms` to `.4s` and a token parser produced NaN on
// the deployed site while the un-minified dev server stayed clean). Assigning
// the value to a style property and reading it back makes the engine do the
// normalizing, so every syntax it accepts now, or adds later, resolves for
// free.

// Resolved values are cached by their raw text. The four theme accents resolve
// once each for the life of the page: without this, an 18-icon grid would build
// and measure 18 probe elements on every theme switch.
const cache = new Map()

// Resolve any CSS color value to { r, g, b }, or null if it is not a color.
//
// The probe has to be in the document: getComputedStyle on a detached element
// returns an empty declaration. It is inserted, read, and removed inside one
// synchronous block, so it never paints and never lands in a layout the rest of
// the page can observe.
export function resolveCssColor(value) {
  if (!value || typeof document === 'undefined') return null
  if (cache.has(value)) return cache.get(value)

  const probe = document.createElement('span')
  // The CSSOM rejects an invalid value and leaves the property empty, which is
  // the validity gate: no separate "is this a color" check can drift from what
  // the engine actually accepts.
  probe.style.color = value
  if (!probe.style.color) {
    cache.set(value, null)
    return null
  }

  probe.style.display = 'none'
  document.documentElement.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()

  // Computed color serializes as rgb(r, g, b) or rgba(r, g, b, a) in every
  // engine. Newer color syntaxes can serialize as color(srgb ...), which this
  // deliberately does not try to handle: returning null and leaving the .riv's
  // authored color in place is a better failure than writing a wrong one.
  const m = computed.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  const rgb = m
    ? { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]) }
    : null
  cache.set(value, rgb)
  return rgb
}

// Read a custom property off an element (the document root by default) and
// resolve it. `scope` exists for surfaces that carry their own copy of a token:
// the capture rig scopes a theme to one panel because every theme selector in
// color.css is :root-anchored, so reading the root there would return the
// document's theme instead of the panel's.
export function readCssColor(name, scope) {
  if (typeof document === 'undefined') return null
  const el = scope ?? document.documentElement
  return resolveCssColor(getComputedStyle(el).getPropertyValue(name).trim())
}
