import { describe, it, expect } from 'vitest'
import { transformInk } from './ink'

// The per-theme ink transform. The cases that matter are not the arithmetic but
// the boundaries: what it declines to touch, and that 'lightness' keeps hue
// where 'invert' does not. Reasoning and the stroke-length measurements behind
// the feature are in ink.js.

describe('authored mode', () => {
  it('is identity', () => expect(transformInk('#ea0116', 'authored')).toBe('#ea0116'))
  it('is the default when no mode is given', () => expect(transformInk('#ea0116')).toBe('#ea0116'))
})

describe('invert', () => {
  it('flips per channel', () => expect(transformInk('#000000', 'invert')).toBe('#ffffff'))
  it('round-trips', () => expect(transformInk(transformInk('#3852b2', 'invert'), 'invert')).toBe('#3852b2'))

  // The heaviest ink in the Token Lab library (9.8% of stroke length) and the
  // hierarchy flip it causes: quietest on dark as authored, loudest inverted.
  it('lifts the library\'s dark ink to near-white', () =>
    expect(transformInk('#282828', 'invert')).toBe('#d7d7d7'))

  // Documenting the known cost rather than asserting it is fine: red arrives as
  // cyan. If this ever stops being true, the tonal match changed too.
  it('rotates hue (red becomes cyan)', () =>
    expect(transformInk('#ea0116', 'invert')).toBe('#15fee9'))

  it('normalizes case, so mantis.svg\'s uppercase is one cache entry', () =>
    expect(transformInk('#4CA069', 'invert')).toBe(transformInk('#4ca069', 'invert')))

  it('expands 3-digit hex', () => expect(transformInk('#fff', 'invert')).toBe('#000000'))
})

describe('lightness', () => {
  it('lightens a dark ink', () => {
    const out = transformInk('#282828', 'lightness')
    expect(parseInt(out.slice(1, 3), 16)).toBeGreaterThan(0x28)
  })

  it('darkens a pale ink', () => {
    const out = transformInk('#e9e9eb', 'lightness')
    expect(parseInt(out.slice(1, 3), 16)).toBeLessThan(0xe9)
  })

  // The whole reason chroma is gamut-fit rather than held constant. The naive
  // version drove this to #3b0d00, darker than the input it was asked to lift.
  it('keeps amber in the amber family instead of clipping to near-black', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(transformInk('#ddaa3c', 'lightness').slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(b)
    expect(g).toBeGreaterThan(b)
  })

  it('keeps red red, where invert does not', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(transformInk('#ea0116', 'lightness').slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })

  it('stays in gamut', () => {
    for (const ink of ['#ea0116', '#ddaa3c', '#3852b2', '#4ca06a', '#eed49f', '#000100']) {
      expect(transformInk(ink, 'lightness')).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

// A palette entry is a token read and can come back in a colour space this
// module does not parse. Leaving it alone is the same posture shade() takes.
describe('values it declines to touch', () => {
  for (const value of ['rgb(20, 20, 20)', 'oklch(0.7 0.1 240)', 'color-mix(in srgb, red, blue)', 'currentColor', '#12345']) {
    it(`passes through ${value}`, () => {
      expect(transformInk(value, 'invert')).toBe(value)
      expect(transformInk(value, 'lightness')).toBe(value)
    })
  }
})
