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
  // Maximum distance, in local units, between a flattened polyline and the true
  // curve. Smaller is smoother and heavier. Curves are subdivided to meet this,
  // deterministically, from the control points alone.
  tolerance: 0.25,
  // Hard ceiling on segments per curve, so a pathological control polygon
  // cannot produce an unbounded point count.
  maxSegments: 96,
}

// ── Path data ─────────────────────────────────────────────────────────────────

const ARG_COUNT = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

// Tokenize a `d` string into { command, args } pairs, normalized to ABSOLUTE
// coordinates. Relative commands, implicit repeats (a second coordinate pair
// after an M continues as an L, per the SVG spec), and the shorthand curve
// forms all resolve here so the flattener only ever sees M, L, C, Q, A and Z.
export function parsePathData(d) {
  if (typeof d !== 'string') return []
  const tokens = d.match(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)
  if (!tokens) return []

  const out = []
  let i = 0
  let cx = 0, cy = 0            // current point
  let sx = 0, sy = 0            // subpath start, for Z
  let prevCubic = null          // last cubic control, for S
  let prevQuad = null           // last quadratic control, for T
  let command = null

  const num = () => parseFloat(tokens[i++])

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      command = tokens[i++]
    } else if (command === null) {
      break                     // numbers before any command: malformed
    } else if (command === 'M') {
      command = 'L'             // implicit repeat after a moveto is a lineto
    } else if (command === 'm') {
      command = 'l'
    }

    const upper = command.toUpperCase()
    const relative = command !== upper
    const count = ARG_COUNT[upper]
    if (count === undefined) break                 // unknown command, stop
    if (count > 0 && i + count > tokens.length) break

    switch (upper) {
      case 'M': {
        const x = num(), y = num()
        cx = relative ? cx + x : x
        cy = relative ? cy + y : y
        sx = cx; sy = cy
        out.push({ command: 'M', args: [cx, cy] })
        prevCubic = prevQuad = null
        break
      }
      case 'L': {
        const x = num(), y = num()
        cx = relative ? cx + x : x
        cy = relative ? cy + y : y
        out.push({ command: 'L', args: [cx, cy] })
        prevCubic = prevQuad = null
        break
      }
      case 'H': {
        const x = num()
        cx = relative ? cx + x : x
        out.push({ command: 'L', args: [cx, cy] })
        prevCubic = prevQuad = null
        break
      }
      case 'V': {
        const y = num()
        cy = relative ? cy + y : y
        out.push({ command: 'L', args: [cx, cy] })
        prevCubic = prevQuad = null
        break
      }
      case 'C': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num()
        const a = relative ? [cx + x1, cy + y1, cx + x2, cy + y2, cx + x, cy + y] : [x1, y1, x2, y2, x, y]
        out.push({ command: 'C', args: a })
        prevCubic = [a[2], a[3]]
        prevQuad = null
        cx = a[4]; cy = a[5]
        break
      }
      case 'S': {
        // Smooth cubic: the first control mirrors the previous cubic's second
        // control about the current point. With no previous cubic it coincides
        // with the current point, per the spec.
        const x2 = num(), y2 = num(), x = num(), y = num()
        const r = prevCubic ? [2 * cx - prevCubic[0], 2 * cy - prevCubic[1]] : [cx, cy]
        const a = relative
          ? [r[0], r[1], cx + x2, cy + y2, cx + x, cy + y]
          : [r[0], r[1], x2, y2, x, y]
        out.push({ command: 'C', args: a })
        prevCubic = [a[2], a[3]]
        prevQuad = null
        cx = a[4]; cy = a[5]
        break
      }
      case 'Q': {
        const x1 = num(), y1 = num(), x = num(), y = num()
        const a = relative ? [cx + x1, cy + y1, cx + x, cy + y] : [x1, y1, x, y]
        out.push({ command: 'Q', args: a })
        prevQuad = [a[0], a[1]]
        prevCubic = null
        cx = a[2]; cy = a[3]
        break
      }
      case 'T': {
        const x = num(), y = num()
        const r = prevQuad ? [2 * cx - prevQuad[0], 2 * cy - prevQuad[1]] : [cx, cy]
        const a = relative ? [r[0], r[1], cx + x, cy + y] : [r[0], r[1], x, y]
        out.push({ command: 'Q', args: a })
        prevQuad = [a[0], a[1]]
        prevCubic = null
        cx = a[2]; cy = a[3]
        break
      }
      case 'A': {
        const rx = num(), ry = num(), rot = num(), large = num(), sweep = num()
        const x = num(), y = num()
        const ex = relative ? cx + x : x
        const ey = relative ? cy + y : y
        out.push({ command: 'A', args: [rx, ry, rot, large, sweep, ex, ey], from: [cx, cy] })
        cx = ex; cy = ey
        prevCubic = prevQuad = null
        break
      }
      case 'Z': {
        out.push({ command: 'Z', args: [] })
        cx = sx; cy = sy
        prevCubic = prevQuad = null
        break
      }
      default:
        return out
    }
  }
  return out
}

// ── Flattening ────────────────────────────────────────────────────────────────

// Segment count for a cubic, from the standard chord-error bound rather than a
// heuristic on the control polygon's length.
//
// The distance between a Bezier and the chord across a parameter step dt is at
// most max|B''| * dt^2 / 8. For a cubic,
//   B''(t) = 6(1-t)(P0 - 2*P1 + P2) + 6t(P1 - 2*P2 + P3)
// which is a straight interpolation between two fixed vectors, so its magnitude
// is bounded by 6 times the larger of them. With n uniform steps dt = 1/n, so
//   error <= 6 * maxSecondDifference / (8 * n^2)
// and inverting for n gives the count below.
//
// Uniform subdivision rather than recursive flatness testing: both are
// deterministic, but this one is closed-form, has no recursion depth to bound,
// and produces the same count on every engine from the control points alone.
function cubicSegments(p0, p1, p2, p3, tolerance) {
  const ax = p0[0] - 2 * p1[0] + p2[0], ay = p0[1] - 2 * p1[1] + p2[1]
  const bx = p1[0] - 2 * p2[0] + p3[0], by = p1[1] - 2 * p2[1] + p3[1]
  const secondDifference = Math.max(Math.hypot(ax, ay), Math.hypot(bx, by))
  if (secondDifference < 1e-12) return 1          // a straight cubic needs one
  const n = Math.ceil(Math.sqrt((6 * secondDifference) / (8 * Math.max(tolerance, 1e-6))))
  return Math.max(1, Math.min(GLYPHS.maxSegments, n))
}

function cubicAt(p0, p1, p2, p3, t) {
  const u = 1 - t
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ]
}

// An elliptical arc, endpoint parameterization to center parameterization,
// following the SVG spec's implementation notes. Included rather than skipped
// because a flattener that silently drops arcs would lose whole marks from any
// library whose circles and ellipses were converted to paths.
function arcToPoints(from, args, tolerance, push) {
  let [rx, ry, rotDeg, large, sweep, x, y] = args
  const [x0, y0] = from
  if (x0 === x && y0 === y) return
  rx = Math.abs(rx); ry = Math.abs(ry)
  if (rx < 1e-12 || ry < 1e-12) { push([x, y]); return }   // degenerate: a line

  const phi = (rotDeg * Math.PI) / 180
  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
  const dx2 = (x0 - x) / 2, dy2 = (y0 - y) / 2
  const x1 = cosPhi * dx2 + sinPhi * dy2
  const y1 = -sinPhi * dx2 + cosPhi * dy2

  // Scale the radii up if they are too small to span the endpoints.
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s }

  const sign = large !== sweep ? 1 : -1
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const co = sign * Math.sqrt(Math.max(0, num) / (den || 1))
  const cxp = (co * rx * y1) / ry
  const cyp = (-co * ry * x1) / rx
  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2

  const angleOf = (ux, uy) => {
    const a = Math.atan2(uy, ux)
    return a < 0 ? a + 2 * Math.PI : a
  }
  const theta1 = angleOf((x1 - cxp) / rx, (y1 - cyp) / ry)
  const theta2 = angleOf((-x1 - cxp) / rx, (-y1 - cyp) / ry)
  let delta = theta2 - theta1
  if (sweep && delta < 0) delta += 2 * Math.PI
  if (!sweep && delta > 0) delta -= 2 * Math.PI

  const radius = Math.max(rx, ry)
  const n = Math.max(2, Math.min(
    GLYPHS.maxSegments,
    Math.ceil(Math.abs(delta) / (2 * Math.acos(Math.max(-1, 1 - Math.max(tolerance, 1e-6) / radius)))),
  ))
  for (let i = 1; i <= n; i++) {
    const t = theta1 + (delta * i) / n
    const ct = Math.cos(t), st = Math.sin(t)
    push([
      cosPhi * rx * ct - sinPhi * ry * st + cx,
      sinPhi * rx * ct + cosPhi * ry * st + cy,
    ])
  }
}

// Absolute commands -> subpaths, each an array of [x, y].
//
// A subpath break (a new M, or the end of a Z'd shape) starts a new polyline
// rather than drawing a chord across the gap. That matters for presence: a
// chord between two distant subpaths would lay down crossing length where the
// mark has no ink, and light cells that should be empty.
export function flattenPath(commands, { tolerance = GLYPHS.tolerance } = {}) {
  const subpaths = []
  let current = null
  let cursor = [0, 0]

  const push = (p) => {
    if (!current) { current = [cursor.slice()]; subpaths.push(current) }
    const last = current[current.length - 1]
    // Drop points that repeat: they carry no length and would only inflate the
    // traversal's work.
    if (Math.abs(last[0] - p[0]) > 1e-12 || Math.abs(last[1] - p[1]) > 1e-12) current.push(p)
    cursor = p
  }

  for (const { command, args, from } of commands) {
    switch (command) {
      case 'M':
        cursor = [args[0], args[1]]
        current = [cursor.slice()]
        subpaths.push(current)
        break
      case 'L':
        push([args[0], args[1]])
        break
      case 'C': {
        const p0 = cursor
        const p1 = [args[0], args[1]], p2 = [args[2], args[3]], p3 = [args[4], args[5]]
        const n = cubicSegments(p0, p1, p2, p3, tolerance)
        for (let i = 1; i <= n; i++) push(cubicAt(p0, p1, p2, p3, i / n))
        break
      }
      case 'Q': {
        // Degree-elevate the quadratic to a cubic and reuse one code path,
        // rather than carrying a second evaluator that could drift from it.
        const p0 = cursor
        const q = [args[0], args[1]], p3 = [args[2], args[3]]
        const p1 = [p0[0] + (2 / 3) * (q[0] - p0[0]), p0[1] + (2 / 3) * (q[1] - p0[1])]
        const p2 = [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])]
        const n = cubicSegments(p0, p1, p2, p3, tolerance)
        for (let i = 1; i <= n; i++) push(cubicAt(p0, p1, p2, p3, i / n))
        break
      }
      case 'A':
        arcToPoints(from || cursor, args, tolerance, push)
        break
      case 'Z':
        if (current && current.length > 1) {
          const start = current[0]
          push([start[0], start[1]])
          current = null              // a following command opens a new subpath
        }
        break
      default:
        break
    }
  }
  return subpaths.filter((s) => s.length > 1)
}

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

// Resolve a tag's paint in the order the browser would: inline style, then
// presentation attribute, then a class rule. Stroke wins over fill when both
// are present, because a stroked mark's ink is its stroke; the fill fallback is
// what lets a fill-authored library (all of testSVGS) work under the silhouette
// ruling, where fills enter the pipeline as outlines.
export function resolvePaint(tag, rules = {}) {
  const attr = (name) => {
    const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`))
    return m ? m[1] : undefined
  }
  const classes = (attr('class') || '').split(/\s+/).filter(Boolean)
  const inline = {}
  for (const part of (attr('style') || '').split(';')) {
    const [k, v] = part.split(':')
    if (k && v) inline[k.trim()] = v.trim()
  }
  const lookup = (prop) => {
    if (inline[prop]) return inline[prop]
    const a = attr(prop)
    if (a) return a
    for (const c of classes) if (rules[c] && rules[c][prop]) return rules[c][prop]
    return undefined
  }
  const stroke = lookup('stroke')
  const fill = lookup('fill')
  const paint = stroke && stroke !== 'none' ? stroke : fill && fill !== 'none' ? fill : null
  return {
    color: paint === 'currentColor' ? null : paint,
    tokenBound: paint === 'currentColor',
  }
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
  for (const tag of text.matchAll(/<path\b([^>]*)>/g)) {
    const d = (tag[1].match(/\sd="([^"]*)"/) || [])[1]
    if (!d) continue
    const paint = resolvePaint(tag[1], rules)
    if (!paint.color && !paint.tokenBound) warnings.push(`${name}: a path has no resolvable paint`)
    paths.push({ d, ...paint })
  }

  const others = [...text.matchAll(/<(circle|rect|line|polyline|polygon|ellipse)\b/g)].map((m) => m[1])
  if (others.length) {
    warnings.push(`${name}: ${others.length} non-path shape(s) skipped (${[...new Set(others)].join(', ')})`)
  }
  if (!paths.length) return { mark: null, warnings: [...warnings, `${name}: no paths, skipped`] }

  return {
    mark: { name, viewBox: viewBoxRaw || `0 0 ${GLYPHS.span} ${GLYPHS.span}`, paths },
    warnings,
  }
}

// ── Mark building ─────────────────────────────────────────────────────────────

// A mark definition -> flattened strokes in local space, centered on the
// attachment point and scaled so the longest viewBox side spans GLYPHS.span.
//
// Centering is on the VIEWBOX, never on the ink's bounding box. That is the
// origin ruling: where a mark attaches is a design decision the author makes by
// positioning ink relative to the viewBox center, and bounding-box centering
// would silently override it. The labs centered on the bbox; that does not
// come along.
export function buildMark(def, { span = GLYPHS.span, tolerance = GLYPHS.tolerance } = {}) {
  const vb = String(def.viewBox || `0 0 ${span} ${span}`).trim().split(/[\s,]+/).map(Number)
  const [vx, vy, vw, vh] = vb.length === 4 && vb.every(Number.isFinite) ? vb : [0, 0, span, span]
  const cx = vx + vw / 2
  const cy = vy + vh / 2
  const scale = span / (Math.max(vw, vh) || 1)

  const strokes = []
  for (const path of def.paths || []) {
    for (const subpath of flattenPath(parsePathData(path.d), { tolerance })) {
      strokes.push({
        color: path.color ?? null,
        tokenBound: !!path.tokenBound,
        pts: subpath.map(([x, y]) => ({ x: (x - cx) * scale, y: (y - cy) * scale })),
      })
    }
  }
  return { name: def.name, strokes, inks: distinctInks(def.paths || []) }
}

function distinctInks(paths) {
  const seen = []
  for (const p of paths) {
    const key = p.tokenBound ? 'currentColor' : p.color
    if (key && !seen.includes(key)) seen.push(key)
  }
  return seen
}

// A whole library at once. Ordering is the caller's; a natural sort on filename
// is what the offline generator uses, so `Asset 2` precedes `Asset 10`.
export function buildLibrary(defs, options) {
  return defs.map((def) => buildMark(def, options)).filter((m) => m.strokes.length)
}
