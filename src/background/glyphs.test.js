import { describe, it, expect } from 'vitest'
import { resolvePaint, parseMarkSvg, parseTransform, GLYPHS } from './glyphs'

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol

// Apply an SVG matrix to a point. This lived in glyphs.js as `applyMatrix`
// until 2026-07-28, where its only caller was the flattener; the native face
// hands matrices to the browser and never multiplies one itself. It stays here
// because reading a matrix through a point is how these tests stay legible:
// asserting six raw coefficients says nothing about what the transform does.
const applyMatrix = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] })

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

  // SVG's initial value for fill is black, so "nothing declared" is a colour,
  // not a gap. Real exporters rely on it: tokenLab/contrastLight omits fill on
  // 136 black paths across runner3 and runner4.
  it('defaults an undeclared fill to black', () => {
    expect(resolvePaint(' d="M0,0"')).toEqual({ color: '#000000', tokenBound: false })
    expect(resolvePaint(' stroke="none"')).toEqual({ color: '#000000', tokenBound: false })
  })

  it('returns no paint for an explicit none', () => {
    expect(resolvePaint(' fill="none"')).toEqual({ color: null, tokenBound: false })
  })

  it('inherits an ancestor fill when the shape declares none', () => {
    expect(resolvePaint(' x="1"', rules, [' fill="#282828"']).color).toBe('#282828')
  })

  it('prefers the shape to its ancestor, and the nearest ancestor to the rest', () => {
    expect(resolvePaint(' fill="#111111"', rules, [' fill="#282828"']).color).toBe('#111111')
    expect(resolvePaint(' x="1"', rules, [' fill="#282828"', ' fill="#999999"']).color).toBe('#282828')
  })

  // fill="none" is a declaration, not a gap. It has to win the walk and then
  // fail the none test, or a group fill would paint shapes that opted out.
  it('does not inherit past an explicit none', () => {
    expect(resolvePaint(' fill="none"', rules, [' fill="#282828"'])).toEqual({ color: null, tokenBound: false })
  })

  // Per property, not per resolved paint. The walk finds stroke and fill
  // independently and the stroke-over-fill rule applies once, at the end. So an
  // inherited stroke does outrank the shape's own fill, which is what the format
  // means: stroke is an inherited property, and a shape inside a stroking group
  // really is stroked. No group in any of the three libraries declares one, so
  // this pins the rule rather than describing art that exists.
  it('walks each property separately', () => {
    expect(resolvePaint(' fill="#111111"', rules, [' stroke="#282828"']).color).toBe('#282828')
    expect(resolvePaint(' x="1"', rules, [' fill="#111111" stroke="#282828"']).color).toBe('#282828')
  })

  it('inherits a token-bound ink', () => {
    expect(resolvePaint(' x="1"', rules, [' fill="currentColor"'])).toEqual({ color: null, tokenBound: true })
  })

  it('inherits through an ancestor class rule', () => {
    expect(resolvePaint(' x="1"', rules, [' class="cls-1"']).color).toBe('#b49bc4')
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

  it('warns about a path that paints nothing at all', () => {
    const { warnings } = parseMarkSvg(wrap('<path fill="none" d="M0,0h20v20H0Z"/>'), 'nopaint')
    expect(warnings.join()).toMatch(/no resolvable paint/)
  })

  it('does not warn about a path relying on the default fill', () => {
    const { mark, warnings } = parseMarkSvg(wrap('<path d="M0,0h20v20H0Z"/>'), 'blackbydefault')
    expect(mark.paths[0].color).toBe('#000000')
    expect(warnings).toEqual([])
  })

  it('returns no mark when there are no paths', () => {
    const { mark, warnings } = parseMarkSvg(wrap('<g></g>'), 'empty')
    expect(mark).toBeNull()
    expect(warnings.join()).toMatch(/no paths/)
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

// The regression these exist for: the pixel exports declare their ink once on a
// wrapping <g> and leave every rect bare. Reading the shape alone resolved 62.9%
// of the Token Lab library's stroke length to nothing, and a stroke with no ink
// key paints as the theme's own ink rather than being dropped, so the art still
// drew and the loss was invisible.
describe('parseMarkSvg: inherited paint and placement', () => {
  it('takes a rect fill from the group that wraps it', () => {
    const svg = '<svg viewBox="0 0 28 32"><g fill="#282828">'
      + '<rect x="7" y="0" width="1" height="1"/><rect x="17" y="0" width="1" height="1"/></g></svg>'
    const { mark, warnings } = parseMarkSvg(svg, 'pixels')
    expect(mark.paths.map((p) => p.color)).toEqual(['#282828', '#282828'])
    expect(warnings).toEqual([])
  })

  it('keeps two groups on their own inks', () => {
    const svg = '<svg viewBox="0 0 28 24"><g fill="#531d22"><rect width="1" height="1"/></g>'
      + '<g fill="#ea0116"><rect x="1" width="1" height="1"/></g></svg>'
    expect(parseMarkSvg(svg, 'two').mark.paths.map((p) => p.color)).toEqual(['#531d22', '#ea0116'])
  })

  it('lets a shape override the group it sits in', () => {
    const svg = '<svg viewBox="0 0 28 24"><g fill="#531d22">'
      + '<rect width="1" height="1"/><rect x="1" width="1" height="1" fill="#ea0116"/></g></svg>'
    expect(parseMarkSvg(svg, 'over').mark.paths.map((p) => p.color)).toEqual(['#531d22', '#ea0116'])
  })

  it('inherits a fill declared on the svg element itself', () => {
    const svg = '<svg viewBox="0 0 28 24" fill="#4ca06a"><rect width="1" height="1"/></svg>'
    expect(parseMarkSvg(svg, 'root').mark.paths[0].color).toBe('#4ca06a')
  })

  it('stops inheriting when the group closes', () => {
    const svg = '<svg viewBox="0 0 28 24"><g fill="#531d22"><rect width="1" height="1"/></g>'
      + '<rect x="1" width="1" height="1"/></svg>'
    const { mark, warnings } = parseMarkSvg(svg, 'closed')
    // The second rect is outside the group, so it takes the document default
    // rather than the group's ink. Black, and no warning: that is a real colour.
    expect(mark.paths.map((p) => p.color)).toEqual(['#531d22', '#000000'])
    expect(warnings).toEqual([])
  })

  it('does not unbalance the stack on a self-closing group', () => {
    const svg = '<svg viewBox="0 0 28 24"><g fill="#531d22"/><rect width="1" height="1" fill="#ea0116"/></svg>'
    expect(parseMarkSvg(svg, 'selfclose').mark.paths[0].color).toBe('#ea0116')
  })

  // A group transform used to be dropped without a word, which is the same
  // failure the path-transform section fixes, one level up.
  it('carries a group transform onto the shapes inside it', () => {
    const svg = '<svg viewBox="0 0 120 120"><g transform="translate(60 60)">'
      + '<path d="M-10,-10 L10,10" fill="#111"/></g></svg>'
    expect(parseMarkSvg(svg, 'gt').mark.paths[0].transform).toEqual([1, 0, 0, 1, 60, 60])
  })

  it('composes an outer group with the shape\'s own transform', () => {
    const svg = '<svg viewBox="0 0 120 120"><g transform="translate(60 60)">'
      + '<path transform="scale(2)" d="M1,1 L2,2" fill="#111"/></g></svg>'
    const { matrix } = parseTransform('translate(60 60) scale(2)')
    expect(parseMarkSvg(svg, 'gc').mark.paths[0].transform).toEqual(matrix)
  })

  it('leaves the transform off a shape whose groups carried none', () => {
    const svg = '<svg viewBox="0 0 120 120"><g fill="#111"><path d="M0,0 L1,1"/></g></svg>'
    expect(parseMarkSvg(svg, 'gn').mark.paths[0]).not.toHaveProperty('transform')
  })

  it('names an unsupported transform function on a group', () => {
    const svg = '<svg viewBox="0 0 120 120"><g transform="skewX(20)"><path d="M0,0 L1,1" fill="#111"/></g></svg>'
    expect(parseMarkSvg(svg, 'skew').warnings.join(' ')).toMatch(/unsupported transform function\(s\) ignored \(skewX\)/)
  })
})

