// ─── glyphs ───────────────────────────────────────────────────────────────────
//
// The mark library: SVG text in, flattened polylines in local mark space out.
//
// This module exists to replace `getPointAtLength`. The labs used it and it must
// not ship, for two reasons the rulings record. It is browser numerics, so it is
// not guaranteed bit-identical across engines, which breaks the claim that the
// same seed draws the same picture everywhere. And it ignores element transform
// attributes, so a mark authored with a transform on its path would flatten to
// the wrong geometry with no error. Owning the arithmetic fixes both.
//
// Three layers, each testable on its own:
//   parsePathData   the `d` string -> absolute commands
//   flattenPath     absolute commands -> polylines
//   parseMarkSvg    an SVG file's text -> a mark definition with per-path paint
//
// Paint resolution mirrors archive/backgroundSystem/build-marks.cjs exactly, so
// the offline generator and the runtime loader can never disagree about what
// color a mark is. It reads the ATTRIBUTE rather than computed style, which is
// load-bearing: `currentColor` resolves against the inherited color, so reading
// computed style would erase the very distinction the currentColor ruling
// depends on (rulings 2b and 9).

export const GLYPHS = {
  // Every mark normalizes so its longest viewBox side maps to this many units,
  // centered on the viewBox center. The attachment point is the viewBox center
  // by ruling (section 2, origin convention: author-set), so normalization
  // scales but never re-centers on the ink's bounding box.
  span: 84,
}

// `tolerance` and `maxSegments` used to live here, alongside `span`. They were
// the flattener's two knobs: how close a polyline had to sit to the true curve,
// and the ceiling on segments per curve. The native face hands the authored `d`
// string to the browser, so nothing subdivides a curve any more and both are
// gone with the flattener (2026-07-28). `span` stays because normalization
// stays: it is what maps a mark's longest viewBox side onto a shared size.

// ── SVG paint and structure ───────────────────────────────────────────────────

// `.cls-1{fill:#b49bc4;}` -> { 'cls-1': { fill: '#b49bc4' } }
function styleRules(text) {
  const map = {}
  const blocks = text.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []
  const body = blocks.map((b) => b.replace(/<\/?style[^>]*>/g, '')).join('\n')
  for (const rule of body.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const decl = {}
    for (const part of rule[2].split(';')) {
      const [k, v] = part.split(':')
      if (k && v) decl[k.trim()] = v.trim()
    }
    map[rule[1]] = decl
  }
  return map
}

// What one tag declares for a property: inline style, then presentation
// attribute, then a class rule. Nothing above the tag itself.
function declaredValue(tag, rules, prop) {
  const attr = (name) => {
    const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`))
    return m ? m[1] : undefined
  }
  const inline = {}
  for (const part of (attr('style') || '').split(';')) {
    const [k, v] = part.split(':')
    if (k && v) inline[k.trim()] = v.trim()
  }
  if (inline[prop]) return inline[prop]
  const a = attr(prop)
  if (a) return a
  for (const c of (attr('class') || '').split(/\s+/).filter(Boolean)) {
    if (rules[c] && rules[c][prop]) return rules[c][prop]
  }
  return undefined
}

// Resolve a tag's paint in the order the browser would: inline style, then
// presentation attribute, then a class rule. Stroke wins over fill when both
// are present, because a stroked mark's ink is its stroke; the fill fallback is
// what lets a fill-authored library (all of testSVGS) work under the silhouette
// ruling, where fills enter the pipeline as outlines.
//
// `ancestors` is the open element chain, NEAREST FIRST, and it is what makes a
// group fill reach the shapes inside it. `fill` and `stroke` are inherited
// properties in SVG, so a file may declare its ink once on a wrapper and leave
// every shape bare:
//
//   <g fill="#282828"><rect .../><rect .../></g>
//
// Reading the shape tag alone returns no paint for those rects. They are not
// dropped when that happens, which is what made the gap expensive: a stroke with
// no ink key resolves to the theme's own ink at paint time, so a whole library
// can silently repaint itself as --color-text-base and still draw. Measured on
// the Token Lab library the day the pixel exports landed, 62.9% of total stroke
// length resolved to nothing and only the rats' palette reached the census.
//
// Per PROPERTY, not per resolved paint. The chain is walked for `stroke` and for
// `fill` separately, and only then does stroke-over-fill apply. Resolving the
// pair at each level instead would let a group's fill lose to a shape's own
// `fill="none"` in the wrong order, and would make an ancestor's stroke outrank
// a child's explicit fill.
//
// `fill="none"` on the shape still means none. It is a declared value, so it
// wins the walk and then fails the none test, which is the behaviour the format
// asks for: none is a choice, absence is a question for the parent.
// ── An undeclared fill is black, not a gap ────────────────────────────────────
//
// SVG's initial value for `fill` is black, so a `<path d="..."/>` with no paint
// anywhere up its chain is a BLACK path, and every renderer draws it that way.
// This used to return no paint for that case, which mattered on real art:
// exporters legitimately omit `fill` when a shape is black, and
// `tokenLab/contrastLight` does exactly that for 69 paths of runner3 and 67 of
// runner4. Those came through unpainted and fell back to --color-text-base at
// paint time, which is a coincidence away from correct and not the same thing.
//
// `fill="none"` is still nothing. That is a declaration, and the difference
// between "no fill" and "fill: none" is the whole reason the walk tracks
// declared values rather than resolved ones.
const DEFAULT_FILL = '#000000'

export function resolvePaint(tag, rules = {}, ancestors = []) {
  const lookup = (prop) => {
    for (const el of [tag, ...ancestors]) {
      const value = declaredValue(el, rules, prop)
      if (value) return value
    }
    return undefined
  }
  const stroke = lookup('stroke')
  const fill = lookup('fill')

  let paint
  if (stroke && stroke !== 'none') paint = stroke
  else if (fill && fill !== 'none') paint = fill
  else if (fill === undefined) paint = DEFAULT_FILL  // nothing declared: SVG says black
  else paint = null                                  // fill="none" with no stroke: paints nothing

  return {
    color: paint === 'currentColor' ? null : paint,
    tokenBound: paint === 'currentColor',
  }
}

// ── `transform` on a path ─────────────────────────────────────────────────────
//
// The flattener works in the path's own coordinate system and knew nothing about
// transforms, which was fine while every mark authored its ink at absolute
// coordinates. It stops being fine the moment a library centres its geometry on
// the origin and pushes it into place with `translate(60 60)`: the ink is then
// half a mark up and to the left of where the author put it, on every mark in
// the file, and the composition still looks plausible enough not to announce it.
//
// So the transform is parsed here and applied in buildMark, before the viewBox
// centring. Four functions, which is the whole of what SVG's transform-list
// grammar offers short of skew: translate, scale, rotate, matrix. Anything else
// is named in a warning rather than silently dropped, because a mark that lands
// in the wrong place is exactly the failure this is fixing.
//
// The matrix is the usual SVG 2x3, [a b c d e f], applied as
//   x' = a*x + c*y + e
//   y' = b*x + d*y + f
const IDENTITY = [1, 0, 0, 1, 0, 0]

function multiply(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}


// A transform-list string -> { matrix, unsupported: [names] }.
//
// Functions compose left to right, which is SVG's order: the leftmost is the
// outermost, so it multiplies on the left of everything after it.
export function parseTransform(raw) {
  const unsupported = []
  let matrix = IDENTITY
  if (!raw) return { matrix, unsupported }

  for (const fn of String(raw).matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
    const name = fn[1]
    const args = fn[2].trim().split(/[\s,]+/).map(Number).filter(Number.isFinite)
    let next
    if (name === 'translate') {
      next = [1, 0, 0, 1, args[0] || 0, args.length > 1 ? args[1] : 0]
    } else if (name === 'scale') {
      const sx = args.length ? args[0] : 1
      next = [sx, 0, 0, args.length > 1 ? args[1] : sx, 0, 0]
    } else if (name === 'rotate') {
      const rad = ((args[0] || 0) * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const rotation = [cos, sin, -sin, cos, 0, 0]
      // rotate(a cx cy) is translate(cx cy) rotate(a) translate(-cx -cy).
      next = args.length > 2
        ? multiply(multiply([1, 0, 0, 1, args[1], args[2]], rotation), [1, 0, 0, 1, -args[1], -args[2]])
        : rotation
    } else if (name === 'matrix' && args.length === 6) {
      next = args
    } else {
      unsupported.push(name)
      continue
    }
    matrix = multiply(matrix, next)
  }
  return { matrix, unsupported }
}

// ── `<rect>` as geometry, not as a skipped shape ──────────────────────────────
//
// The parser used to count every non-path shape and warn. That is the right
// default for a shape it cannot represent, and the wrong one for a rectangle,
// which is four line segments and converts exactly. It matters because a
// pixel-authored library is made of nothing else: measured on the Token Lab
// library as it stands, 1311 rects against zero paths, and not one of its 13
// marks carries a `<path>` at all, so under the old behaviour they were not
// degraded, they were dropped (`no paths, skipped`) and the library was empty.
//
// The 2026-07-27 re-cut moved it further this way, not less. The marks were
// mixed rect-and-path exports at 1550 rects against 12 paths, and are now one
// rect per pixel throughout, every mark on an 11px box.
//
// Rounded corners are not converted. rx/ry would need arcs and no library here
// uses them, so a rounded rect converts as a sharp one and says so.
function rectToPath(attrs) {
  const num = (name) => {
    const m = attrs.match(new RegExp(`\\s${name}="([^"]*)"`))
    const v = m ? Number.parseFloat(m[1]) : 0
    return Number.isFinite(v) ? v : 0
  }
  const w = num('width')
  const h = num('height')
  if (!(w > 0 && h > 0)) return null
  const x = num('x')
  const y = num('y')
  return `M${x} ${y}H${x + w}V${y + h}H${x}Z`
}

// An SVG file's text -> { name, viewBox, paths: [{ d, color, tokenBound }] }.
//
// Returns `warnings` rather than throwing, and rather than failing silently.
// A library is authored art: the useful behavior when a mark is odd is to load
// what is there and say what was skipped, so the gap is visible in a loader UI
// instead of showing up later as a hole in the composition.
export function parseMarkSvg(text, name) {
  const warnings = []
  const viewBoxRaw = (text.match(/viewBox="([^"]*)"/) || [])[1]
  if (!viewBoxRaw) warnings.push(`${name}: no viewBox, cannot place the attachment point`)

  const rules = styleRules(text)
  const paths = []
  const unsupportedTransforms = new Set()
  let roundedRects = 0

  // One pass over both shape kinds rather than two, so the collected order is
  // document order. Draw order is not decorative here: the pixel face resolves a
  // cell's ink by which stroke crosses it furthest, and document order is the
  // tie-break the browser would apply to the same art.
  //
  // The pass carries an OPEN ELEMENT STACK rather than matching shapes alone,
  // because two of the things a shape needs are routinely declared above it:
  // its paint (see resolvePaint) and its placement. A stack costs one push and
  // one pop per group and answers both, where a flat shape match can answer
  // neither. `<svg>` seeds the stack because it is an element like any other and
  // may carry a document-wide `fill`.
  //
  // The regex reads an opening tag, a closing tag, and a self-closing tag with
  // the same match, which is what keeps `<g/>` from unbalancing the stack. It is
  // not an XML parser and does not try to be: it holds for the export shapes
  // this library is authored in, and anything it cannot represent still leaves a
  // warning rather than a silent hole.
  // Every frame holds the tag's ATTRIBUTE text, never the tag itself, so the
  // root and a group are the same kind of thing to resolvePaint.
  const stack = []
  const svgAttrs = (text.match(/<svg\b([^>]*)>/) || [])[1]
  if (svgAttrs) stack.push({ tag: svgAttrs, matrix: null })

  for (const tag of text.matchAll(/<(\/?)(svg|g|path|rect)\b([^>]*?)(\/?)>/g)) {
    const [, closing, kind, attrs, selfClosing] = tag

    if (kind === 'svg') continue // seeded above; never pushed or popped again

    if (kind === 'g') {
      if (closing) stack.pop()
      else if (!selfClosing) {
        const raw = (attrs.match(/\stransform="([^"]*)"/) || [])[1]
        const { matrix, unsupported } = parseTransform(raw)
        unsupported.forEach((fn) => unsupportedTransforms.add(fn))
        stack.push({ tag: attrs, matrix: raw ? matrix : null })
      }
      continue
    }

    const d = kind === 'rect' ? rectToPath(attrs) : (attrs.match(/\sd="([^"]*)"/) || [])[1]
    if (!d) continue
    if (kind === 'rect' && /\sr[xy]="/.test(attrs)) roundedRects += 1

    const transformRaw = (attrs.match(/\stransform="([^"]*)"/) || [])[1]
    const { matrix, unsupported } = parseTransform(transformRaw)
    unsupported.forEach((fn) => unsupportedTransforms.add(fn))

    // Ancestor transforms compose OUTERMOST FIRST, then the shape's own last,
    // which is the same left-to-right order parseTransform uses within a single
    // attribute and for the same reason: the outer transform applies to the
    // coordinate system the inner one is expressed in. A group transform was
    // previously dropped without a word, which is the failure the path-transform
    // section above exists to prevent, one level up.
    let composed = null
    for (const frame of stack) {
      if (!frame.matrix) continue
      composed = composed ? multiply(composed, frame.matrix) : frame.matrix
    }
    if (transformRaw) composed = composed ? multiply(composed, matrix) : matrix

    // Nearest first, so the shape's own declaration outranks its parent's.
    const ancestors = stack.map((frame) => frame.tag).reverse()
    const paint = resolvePaint(attrs, rules, ancestors)
    if (!paint.color && !paint.tokenBound) warnings.push(`${name}: a ${kind} has no resolvable paint`)
    paths.push({ d, ...paint, ...(composed && { transform: composed }) })
  }

  if (roundedRects) {
    warnings.push(`${name}: ${roundedRects} rounded rect(s) converted with sharp corners (rx/ry ignored)`)
  }
  if (unsupportedTransforms.size) {
    warnings.push(`${name}: unsupported transform function(s) ignored (${[...unsupportedTransforms].join(', ')})`)
  }

  const others = [...text.matchAll(/<(circle|line|polyline|polygon|ellipse)\b/g)].map((m) => m[1])
  if (others.length) {
    warnings.push(`${name}: ${others.length} non-path shape(s) skipped (${[...new Set(others)].join(', ')})`)
  }
  if (!paths.length) return { mark: null, warnings: [...warnings, `${name}: no paths, skipped`] }

  return {
    mark: { name, viewBox: viewBoxRaw || `0 0 ${GLYPHS.span} ${GLYPHS.span}`, paths },
    warnings,
  }
}
