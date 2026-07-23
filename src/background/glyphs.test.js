import { describe, it, expect } from 'vitest'
import {
  parsePathData,
  flattenPath,
  resolvePaint,
  parseMarkSvg,
  buildMark,
  buildLibrary,
  parseTransform,
  applyMatrix,
  GLYPHS,
} from './glyphs'

const cmds = (d) => parsePathData(d).map((c) => c.command).join('')
const flat = (d, opts) => flattenPath(parsePathData(d), opts)
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol

describe('parsePathData', () => {
  it('reads a simple absolute path', () => {
    expect(parsePathData('M0,0 L10,20')).toEqual([
      { command: 'M', args: [0, 0] },
      { command: 'L', args: [10, 20] },
    ])
  })

  it('resolves relative commands to absolute', () => {
    expect(parsePathData('m5,5 l10,0 l0,10')).toEqual([
      { command: 'M', args: [5, 5] },
      { command: 'L', args: [15, 5] },
      { command: 'L', args: [15, 15] },
    ])
  })

  it('expands H and V into lines', () => {
    // The test library is built almost entirely from these two.
    expect(parsePathData('M0,0 H10 V20')).toEqual([
      { command: 'M', args: [0, 0] },
      { command: 'L', args: [10, 0] },
      { command: 'L', args: [10, 20] },
    ])
    expect(parsePathData('M0,0 h10 v20')).toEqual([
      { command: 'M', args: [0, 0] },
      { command: 'L', args: [10, 0] },
      { command: 'L', args: [10, 20] },
    ])
  })

  it('treats a repeated coordinate pair after M as an implicit L', () => {
    // Spec behavior, and Illustrator emits it. Without this the second pair
    // would be read as another moveto and break the subpath in two.
    expect(cmds('M0,0 10,10 20,20')).toBe('MLL')
    expect(parsePathData('M0,0 10,10')[1]).toEqual({ command: 'L', args: [10, 10] })
  })

  it('treats a repeated pair after m as an implicit relative l', () => {
    expect(parsePathData('m0,0 10,10')[1]).toEqual({ command: 'L', args: [10, 10] })
  })

  it('repeats a command across extra argument groups', () => {
    expect(cmds('M0,0 L1,1 2,2 3,3')).toBe('MLLL')
    expect(cmds('M0,0 C1,1 2,2 3,3 4,4 5,5 6,6')).toBe('MCC')
  })

  it('converts S into the cubic it stands for', () => {
    // The reflected control is the previous cubic's second control mirrored
    // about the current point: (10,10) reflected about (10,0) is (10,-10).
    const out = parsePathData('M0,0 C0,10 10,10 10,0 S20,-10 20,0')
    expect(out[2].command).toBe('C')
    expect(out[2].args.slice(0, 2)).toEqual([10, -10])
  })

  it('places the S control at the current point when no cubic precedes it', () => {
    const out = parsePathData('M5,5 S10,10 20,20')
    expect(out[1].args.slice(0, 2)).toEqual([5, 5])
  })

  it('converts T into the quadratic it stands for', () => {
    const out = parsePathData('M0,0 Q10,10 20,0 T40,0')
    expect(out[2].command).toBe('Q')
    expect(out[2].args.slice(0, 2)).toEqual([30, -10])
  })

  it('keeps arc flags and records where the arc starts', () => {
    const out = parsePathData('M10,0 A5,5 0 1 0 20,0')
    expect(out[1].command).toBe('A')
    expect(out[1].args).toEqual([5, 5, 0, 1, 0, 20, 0])
    expect(out[1].from).toEqual([10, 0])
  })

  it('returns the pen to the subpath start on Z', () => {
    const out = parsePathData('M10,10 L20,20 Z L30,30')
    // After Z the current point is back at (10,10), so the following L is
    // measured from there.
    expect(out[out.length - 1]).toEqual({ command: 'L', args: [30, 30] })
    expect(cmds('M10,10 L20,20 Z L30,30')).toBe('MLZL')
  })

  it('reads numbers without separators and with exponents', () => {
    expect(parsePathData('M0,0L-3.5.5')).toEqual([
      { command: 'M', args: [0, 0] },
      { command: 'L', args: [-3.5, 0.5] },
    ])
    expect(parsePathData('M0,0 L1e2,1E-2')[1].args).toEqual([100, 0.01])
  })

  it('survives malformed input rather than throwing', () => {
    expect(parsePathData('')).toEqual([])
    expect(parsePathData(null)).toEqual([])
    expect(parsePathData('garbage')).toEqual([])
    expect(parsePathData('10,10 L20,20')).toEqual([])       // numbers before any command
    expect(() => parsePathData('M0,0 C1,1')).not.toThrow()  // truncated arg list
    expect(parsePathData('M0,0 C1,1')).toEqual([{ command: 'M', args: [0, 0] }])
  })

  it('starts a path that omits its moveto from the origin', () => {
    // Malformed per spec, and a browser would render nothing. Being lenient
    // costs nothing here and keeps one odd file from emptying a library.
    expect(parsePathData('L10,10')).toEqual([{ command: 'L', args: [10, 10] }])
  })

  it('parses a real mark from the test library', () => {
    // Asset 6's actual path data: an all-h/v staircase, which is the shape the
    // whole library is built from.
    const d = 'M0,0h84v26.88h-33.6v3.36h3.36v3.36h3.36v16.8h-3.36v3.36h-3.36v3.36h33.6v26.88H0v-26.88h33.6v-3.36h-3.36v-3.36h-3.36v-16.8h3.36v-3.36h3.36v-3.36H0V0Z'
    const out = parsePathData(d)
    expect(out[0].command).toBe('M')
    expect(out[out.length - 1].command).toBe('Z')
    expect(out.every((c) => 'MLZ'.includes(c.command))).toBe(true)
    expect(out.length).toBeGreaterThan(20)
  })
})

describe('flattenPath', () => {
  it('turns lines into their own endpoints, adding nothing', () => {
    expect(flat('M0,0 L10,0 L10,10')).toEqual([[[0, 0], [10, 0], [10, 10]]])
  })

  it('starts a new subpath on each M, never chording across the gap', () => {
    // A chord between distant subpaths would lay crossing length where the mark
    // has no ink, lighting cells that should stay empty.
    const out = flat('M0,0 L10,0 M50,50 L60,50')
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual([[0, 0], [10, 0]])
    expect(out[1]).toEqual([[50, 50], [60, 50]])
  })

  it('closes a Z subpath back to its start', () => {
    const out = flat('M0,0 L10,0 L10,10 Z')
    expect(out[0][0]).toEqual([0, 0])
    expect(out[0][out[0].length - 1]).toEqual([0, 0])
  })

  it('drops repeated points', () => {
    const out = flat('M0,0 L0,0 L10,0 L10,0')
    expect(out[0]).toEqual([[0, 0], [10, 0]])
  })

  it('flattens a cubic to points that lie on the curve', () => {
    // Straight-line cubic: every flattened point must sit on the line.
    const out = flat('M0,0 C10,0 20,0 30,0')
    expect(out[0].length).toBeGreaterThan(1)
    for (const [, y] of out[0]) expect(near(y, 0)).toBe(true)
    expect(out[0][out[0].length - 1]).toEqual([30, 0])
  })

  it('holds a cubic inside the tolerance', () => {
    // Sample the true curve densely and measure each sample's distance to the
    // POLYLINE, meaning the nearest point on the nearest segment. Measuring to
    // the nearest vertex instead would report the vertex spacing rather than
    // the deviation, which is a much larger and entirely different number.
    const p = [[0, 0], [0, 50], [100, 50], [100, 0]]
    const at = (t) => {
      const u = 1 - t
      return [
        u*u*u*p[0][0] + 3*u*u*t*p[1][0] + 3*u*t*t*p[2][0] + t*t*t*p[3][0],
        u*u*u*p[0][1] + 3*u*u*t*p[1][1] + 3*u*t*t*p[2][1] + t*t*t*p[3][1],
      ]
    }
    const toSegment = (px, py, [ax, ay], [bx, by]) => {
      const dx = bx - ax, dy = by - ay
      const lenSq = dx * dx + dy * dy
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    }
    for (const tolerance of [1, 0.25, 0.05]) {
      const out = flat('M0,0 C0,50 100,50 100,0', { tolerance })[0]
      let worst = 0
      for (let i = 0; i <= 800; i++) {
        const [x, y] = at(i / 800)
        let best = Infinity
        for (let k = 1; k < out.length; k++) best = Math.min(best, toSegment(x, y, out[k - 1], out[k]))
        worst = Math.max(worst, best)
      }
      expect(worst).toBeLessThanOrEqual(tolerance)
    }
  })

  it('spends points in proportion to the tolerance asked for', () => {
    const loose = flat('M0,0 C0,50 100,50 100,0', { tolerance: 1 })[0].length
    const tight = flat('M0,0 C0,50 100,50 100,0', { tolerance: 0.05 })[0].length
    expect(tight).toBeGreaterThan(loose)
  })

  it('spends more points on a bigger curve', () => {
    const small = flat('M0,0 C0,5 10,5 10,0')[0].length
    const large = flat('M0,0 C0,200 400,200 400,0')[0].length
    expect(large).toBeGreaterThan(small)
  })

  it('caps segments per curve', () => {
    const out = flat('M0,0 C0,100000 100000,100000 100000,0')[0]
    expect(out.length).toBeLessThanOrEqual(GLYPHS.maxSegments + 1)
  })

  it('flattens a quadratic through the cubic path', () => {
    const out = flat('M0,0 Q50,0 100,0')[0]
    for (const [, y] of out) expect(near(y, 0)).toBe(true)
    expect(out[out.length - 1]).toEqual([100, 0])
  })

  it('flattens an arc onto its ellipse', () => {
    // A half-circle of radius 50 centered at (50, 0): every point must sit at
    // radius 50 from the center.
    const out = flat('M0,0 A50,50 0 0 1 100,0')[0]
    expect(out.length).toBeGreaterThan(4)
    for (const [x, y] of out) expect(Math.abs(Math.hypot(x - 50, y) - 50)).toBeLessThan(1)
    expect(near(out[out.length - 1][0], 100)).toBe(true)
  })

  it('honours the arc sweep flag', () => {
    const up = flat('M0,0 A50,50 0 0 0 100,0')[0]
    const down = flat('M0,0 A50,50 0 0 1 100,0')[0]
    const midY = (pts) => pts[Math.floor(pts.length / 2)][1]
    expect(Math.sign(midY(up))).toBe(-Math.sign(midY(down)))
  })

  it('treats a zero-radius arc as a line', () => {
    const out = flat('M0,0 A0,0 0 0 1 10,0')[0]
    expect(out).toEqual([[0, 0], [10, 0]])
  })

  it('is deterministic', () => {
    const d = 'M0,0 C0,50 100,50 100,0 A20,10 30 1 0 40,20 Q10,10 0,0 Z'
    expect(flat(d)).toEqual(flat(d))
  })

  it('never emits a subpath with fewer than two points', () => {
    const out = flat('M10,10 M20,20 L30,30')
    expect(out.every((s) => s.length > 1)).toBe(true)
  })
})

describe('resolvePaint', () => {
  const rules = { 'cls-1': { fill: '#b49bc4' }, b: { stroke: '#123456' } }

  it('reads a class rule', () => {
    expect(resolvePaint(' class="cls-1"', rules)).toEqual({ color: '#b49bc4', tokenBound: false })
  })

  it('reads a presentation attribute', () => {
    expect(resolvePaint(' fill="#e0563a"', rules)).toEqual({ color: '#e0563a', tokenBound: false })
  })

  it('reads an inline style', () => {
    expect(resolvePaint(' style="fill:#4ca06a"', rules)).toEqual({ color: '#4ca06a', tokenBound: false })
  })

  it('prefers inline style over attribute over class', () => {
    expect(resolvePaint(' class="cls-1" fill="#111111" style="fill:#222222"', rules).color).toBe('#222222')
    expect(resolvePaint(' class="cls-1" fill="#111111"', rules).color).toBe('#111111')
  })

  it('prefers stroke over fill', () => {
    expect(resolvePaint(' fill="#111111" stroke="#222222"', rules).color).toBe('#222222')
  })

  it('falls through fill="none" to the stroke', () => {
    expect(resolvePaint(' fill="none" stroke="#3c5a9c"', rules).color).toBe('#3c5a9c')
  })

  it('flags currentColor as token-bound and carries no color', () => {
    // The distinction rulings 2b and 9 depend on, and the reason this reads the
    // attribute rather than computed style: computed style would have resolved
    // currentColor to an inherited hex and erased it.
    expect(resolvePaint(' fill="currentColor"')).toEqual({ color: null, tokenBound: true })
    expect(resolvePaint(' stroke="currentColor"')).toEqual({ color: null, tokenBound: true })
  })

  it('returns no paint when there is none', () => {
    expect(resolvePaint(' d="M0,0"')).toEqual({ color: null, tokenBound: false })
    expect(resolvePaint(' fill="none"')).toEqual({ color: null, tokenBound: false })
  })
})

describe('parseMarkSvg', () => {
  const wrap = (body, vb = '0 0 84 84') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`

  it('reads an Illustrator-style mark', () => {
    const svg = wrap('<defs><style>.cls-1{fill:#b49bc4;}</style></defs><path class="cls-1" d="M0,0h40v40H0Z"/>')
    const { mark, warnings } = parseMarkSvg(svg, 'Asset 2')
    expect(warnings).toEqual([])
    expect(mark.name).toBe('Asset 2')
    expect(mark.viewBox).toBe('0 0 84 84')
    expect(mark.paths).toEqual([{ d: 'M0,0h40v40H0Z', color: '#b49bc4', tokenBound: false }])
  })

  it('keeps per-path color for a multi-color mark', () => {
    const svg = wrap('<defs><style>.a{fill:#ddaa3c;}.b{fill:#232323;}</style></defs>' +
      '<path class="a" d="M0,0h40v40H0Z"/><path class="b" d="M44,44h40v40H44Z"/>')
    const { mark } = parseMarkSvg(svg, 'two')
    expect(mark.paths.map((p) => p.color)).toEqual(['#ddaa3c', '#232323'])
  })

  it('warns about non-path shapes rather than dropping them silently', () => {
    const svg = wrap('<circle cx="42" cy="42" r="20" fill="#de803b"/><path fill="#de803b" d="M0,70h84v14H0Z"/>')
    const { mark, warnings } = parseMarkSvg(svg, 'mixed')
    expect(mark.paths).toHaveLength(1)
    expect(warnings.join()).toMatch(/non-path shape/)
    expect(warnings.join()).toMatch(/circle/)
  })

  it('warns when a viewBox is missing but still returns the mark', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><path fill="#76c17d" d="M0,0h84v84H0Z"/></svg>'
    const { mark, warnings } = parseMarkSvg(svg, 'novb')
    expect(mark).not.toBeNull()
    expect(warnings.join()).toMatch(/no viewBox/)
  })

  it('warns about a path with no resolvable paint', () => {
    const { warnings } = parseMarkSvg(wrap('<path d="M0,0h20v20H0Z"/>'), 'nopaint')
    expect(warnings.join()).toMatch(/no resolvable paint/)
  })

  it('returns no mark when there are no paths', () => {
    const { mark, warnings } = parseMarkSvg(wrap('<g></g>'), 'empty')
    expect(mark).toBeNull()
    expect(warnings.join()).toMatch(/no paths/)
  })
})

describe('buildMark', () => {
  it('centers on the viewBox, not on the ink bounding box', () => {
    // The origin ruling. The ink here occupies only the top-left quadrant, so
    // bounding-box centering would move it to the middle; viewBox centering
    // leaves it where the author put it.
    const mark = buildMark({
      name: 'corner',
      viewBox: '0 0 84 84',
      paths: [{ d: 'M0,0 L42,0 L42,42 L0,42 Z', color: '#aaaaaa' }],
    })
    const xs = mark.strokes[0].pts.map((p) => p.x)
    const ys = mark.strokes[0].pts.map((p) => p.y)
    expect(Math.min(...xs)).toBeCloseTo(-42)
    expect(Math.max(...xs)).toBeCloseTo(0)
    expect(Math.min(...ys)).toBeCloseTo(-42)
    expect(Math.max(...ys)).toBeCloseTo(0)
  })

  it('normalizes the longest viewBox side to the span', () => {
    const wide = buildMark({ name: 'w', viewBox: '0 0 168 84', paths: [{ d: 'M0,42 L168,42' }] })
    const xs = wide.strokes[0].pts.map((p) => p.x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(GLYPHS.span)
  })

  it('respects a viewBox with a non-zero origin', () => {
    const mark = buildMark({ name: 'off', viewBox: '10 10 84 84', paths: [{ d: 'M52,52 L52,94' }] })
    expect(mark.strokes[0].pts[0].x).toBeCloseTo(0)
    expect(mark.strokes[0].pts[0].y).toBeCloseTo(0)
  })

  it('carries per-stroke color and the token-bound flag onto every subpath', () => {
    const mark = buildMark({
      name: 'm',
      viewBox: '0 0 84 84',
      paths: [{ d: 'M0,0 L10,0 M20,0 L30,0', color: null, tokenBound: true }],
    })
    expect(mark.strokes).toHaveLength(2)
    expect(mark.strokes.every((s) => s.tokenBound === true && s.color === null)).toBe(true)
  })

  it('lists the distinct inks a mark carries', () => {
    const mark = buildMark({
      name: 'm',
      viewBox: '0 0 84 84',
      paths: [
        { d: 'M0,0 L10,0', color: '#aaaaaa' },
        { d: 'M0,10 L10,10', color: '#aaaaaa' },
        { d: 'M0,20 L10,20', color: null, tokenBound: true },
      ],
    })
    expect(mark.inks).toEqual(['#aaaaaa', 'currentColor'])
  })

  it('falls back to a square viewBox when the attribute is malformed', () => {
    expect(() => buildMark({ name: 'bad', viewBox: 'nonsense', paths: [{ d: 'M0,0 L10,10' }] })).not.toThrow()
  })

  it('is deterministic', () => {
    const def = { name: 'm', viewBox: '0 0 84 84', paths: [{ d: 'M0,0 C0,50 84,50 84,0', color: '#aaaaaa' }] }
    expect(buildMark(def)).toEqual(buildMark(def))
  })

  it('builds a real library mark end to end', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84"><defs><style>.cls-1{fill:#d9a0a8;}</style></defs>' +
      '<path class="cls-1" d="M0,0h84v26.88h-33.6v3.36h3.36v3.36h3.36v16.8h-3.36v3.36h-3.36v3.36h33.6v26.88H0v-26.88h33.6v-3.36h-3.36v-3.36h-3.36v-16.8h3.36v-3.36h3.36v-3.36H0V0Z"/></svg>'
    const { mark, warnings } = parseMarkSvg(svg, 'Asset 6')
    expect(warnings).toEqual([])
    const built = buildMark(mark)
    expect(built.strokes).toHaveLength(1)
    expect(built.inks).toEqual(['#d9a0a8'])
    // Centered on the viewBox center, so the ink spans -42..42 on both axes.
    const pts = built.strokes[0].pts
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(-42)
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(42)
    // Every segment axis-aligned, which is what makes this library degenerate
    // the blend rule (raster's DEGENERATE_EPSILON).
    for (let i = 1; i < pts.length; i++) {
      const dx = Math.abs(pts[i].x - pts[i - 1].x)
      const dy = Math.abs(pts[i].y - pts[i - 1].y)
      expect(dx < 1e-9 || dy < 1e-9).toBe(true)
    }
  })
})

describe('buildLibrary', () => {
  it('builds many marks and drops the empty ones', () => {
    const defs = [
      { name: 'a', viewBox: '0 0 84 84', paths: [{ d: 'M0,0 L10,10', color: '#aaaaaa' }] },
      { name: 'b', viewBox: '0 0 84 84', paths: [{ d: '', color: '#bbbbbb' }] },
    ]
    const lib = buildLibrary(defs)
    expect(lib.map((m) => m.name)).toEqual(['a'])
  })

  it('produces the shape compose expects', () => {
    const lib = buildLibrary([
      { name: 'a', viewBox: '0 0 84 84', paths: [{ d: 'M0,0 L10,10', color: '#aaaaaa' }] },
    ])
    expect(lib[0].strokes[0]).toHaveProperty('pts')
    expect(lib[0].strokes[0].pts[0]).toHaveProperty('x')
    expect(lib[0].strokes[0].pts[0]).toHaveProperty('y')
  })
})

describe('parseTransform', () => {
  it('is the identity for an absent or empty transform', () => {
    expect(parseTransform(undefined).matrix).toEqual([1, 0, 0, 1, 0, 0])
    expect(parseTransform('').matrix).toEqual([1, 0, 0, 1, 0, 0])
  })

  it('reads translate with one argument as an x shift only', () => {
    const p = applyMatrix(parseTransform('translate(10)').matrix, 1, 1)
    expect(p).toEqual({ x: 11, y: 1 })
  })

  it('reads translate with both separators', () => {
    for (const raw of ['translate(60 60)', 'translate(60,60)']) {
      expect(applyMatrix(parseTransform(raw).matrix, -27, -43)).toEqual({ x: 33, y: 17 })
    }
  })

  it('reads scale with one argument as uniform', () => {
    expect(applyMatrix(parseTransform('scale(2)').matrix, 3, 4)).toEqual({ x: 6, y: 8 })
  })

  it('rotates about a named centre', () => {
    const p = applyMatrix(parseTransform('rotate(90 10 10)').matrix, 10, 20)
    expect(near(p.x, 0, 1e-9)).toBe(true)
    expect(near(p.y, 10, 1e-9)).toBe(true)
  })

  // Left to right: the leftmost function is the outermost, so translate applies
  // to the already-scaled point rather than being scaled by it.
  it('composes a list in SVG order', () => {
    expect(applyMatrix(parseTransform('translate(10 0) scale(2)').matrix, 3, 0).x).toBe(16)
    expect(applyMatrix(parseTransform('scale(2) translate(10 0)').matrix, 3, 0).x).toBe(26)
  })

  it('names what it could not apply rather than dropping it silently', () => {
    const { matrix, unsupported } = parseTransform('skewX(20) translate(5 0)')
    expect(unsupported).toEqual(['skewX'])
    expect(applyMatrix(matrix, 0, 0)).toEqual({ x: 5, y: 0 })
  })
})

describe('parseMarkSvg: rects and transforms', () => {
  it('converts a rect to a closed path instead of skipping it', () => {
    const svg = '<svg viewBox="0 0 198 198"><rect x="132" y="11" width="11" height="22" fill="#232323"/></svg>'
    const { mark, warnings } = parseMarkSvg(svg, 'r')
    expect(mark.paths).toHaveLength(1)
    expect(mark.paths[0].d).toBe('M132 11H143V33H132Z')
    expect(mark.paths[0].color).toBe('#232323')
    expect(warnings.join(' ')).not.toMatch(/skipped/)
  })

  // The regression this exists for: a pixel-authored library is all rects, so
  // the old parser dropped whole marks rather than degrading them.
  it('no longer drops a mark that is made only of rects', () => {
    const svg = '<svg viewBox="0 0 22 11"><rect width="11" height="11" fill="#111"/>'
      + '<rect x="11" width="11" height="11" fill="#222"/></svg>'
    const { mark } = parseMarkSvg(svg, 'pixel')
    expect(mark).not.toBeNull()
    expect(mark.paths).toHaveLength(2)
  })

  it('takes a rect fill from a class rule like any other shape', () => {
    const svg = '<svg viewBox="0 0 84 84"><defs><style>.cls-3{fill:#dcdbde;}</style></defs>'
      + '<rect class="cls-3" width="11" height="11"/></svg>'
    expect(parseMarkSvg(svg, 'c').mark.paths[0].color).toBe('#dcdbde')
  })

  it('ignores a zero-area rect', () => {
    const svg = '<svg viewBox="0 0 84 84"><rect width="0" height="11" fill="#111"/></svg>'
    expect(parseMarkSvg(svg, 'z').mark).toBeNull()
  })

  it('warns that a rounded rect converted square', () => {
    const svg = '<svg viewBox="0 0 84 84"><rect width="11" height="11" rx="2" fill="#111"/></svg>'
    expect(parseMarkSvg(svg, 'round').warnings.join(' ')).toMatch(/rounded rect/)
  })

  it('keeps paths and rects in document order', () => {
    const svg = '<svg viewBox="0 0 84 84"><rect width="4" height="4" fill="#a"/>'
      + '<path d="M0,0 L1,1" fill="#b"/><rect x="8" width="4" height="4" fill="#c"/></svg>'
    expect(parseMarkSvg(svg, 'order').mark.paths.map((p) => p.color)).toEqual(['#a', '#b', '#c'])
  })

  it('carries a path transform onto the def', () => {
    const svg = '<svg viewBox="0 0 120 120"><path transform="translate(60 60)" d="M-10,-10 L10,10" fill="#111"/></svg>'
    expect(parseMarkSvg(svg, 't').mark.paths[0].transform).toEqual([1, 0, 0, 1, 60, 60])
  })

  it('leaves transform off a def that had none', () => {
    const svg = '<svg viewBox="0 0 120 120"><path d="M0,0 L10,10" fill="#111"/></svg>'
    expect(parseMarkSvg(svg, 'n').mark.paths[0]).not.toHaveProperty('transform')
  })

  it('still counts the shapes it genuinely cannot represent', () => {
    const svg = '<svg viewBox="0 0 84 84"><circle r="4" fill="#111"/><path d="M0,0 L1,1" fill="#111"/></svg>'
    expect(parseMarkSvg(svg, 'circ').warnings.join(' ')).toMatch(/1 non-path shape\(s\) skipped \(circle\)/)
  })
})

describe('buildMark: transformed geometry', () => {
  // The bug in one assertion. Origin-centred ink pushed into place with
  // translate(60 60) sits at the centre of a 0 0 120 120 viewBox; ignoring the
  // transform put it half a mark up and to the left.
  it('applies the transform before centring on the viewBox', () => {
    const def = {
      name: 'centred',
      viewBox: '0 0 120 120',
      paths: [{ d: 'M-6,-6 L6,6', color: '#111', transform: [1, 0, 0, 1, 60, 60] }],
    }
    const pts = buildMark(def).strokes[0].pts
    const scale = GLYPHS.span / 120
    expect(near(pts[0].x, -6 * scale)).toBe(true)
    expect(near(pts[0].y, -6 * scale)).toBe(true)
    expect(near(pts[pts.length - 1].x, 6 * scale)).toBe(true)
  })

  it('leaves an untransformed path where it was', () => {
    const def = {
      name: 'plain',
      viewBox: '0 0 120 120',
      paths: [{ d: 'M54,54 L66,66', color: '#111' }],
    }
    const pts = buildMark(def).strokes[0].pts
    const scale = GLYPHS.span / 120
    expect(near(pts[0].x, -6 * scale)).toBe(true)
  })
})
