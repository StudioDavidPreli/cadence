import { describe, it, expect } from 'vitest'
import { comparePixels, isFlat } from './renderCompare'

const W = 8, H = 8
const blank = () => new Uint8ClampedArray(W * H * 4)
const paint = (arr, x, y, rgba) => { const i = (y * W + x) * 4; arr.set(rgba, i) }

describe('comparePixels', () => {
  it('reads identical frames as zero difference with no box', () => {
    const a = blank(), b = blank()
    paint(a, 2, 2, [255, 0, 0, 255]); paint(b, 2, 2, [255, 0, 0, 255])
    expect(comparePixels(a, b, W, H)).toEqual({ differing: 0, fraction: 0, box: null })
  })

  it('counts every differing pixel and boxes them', () => {
    const a = blank(), b = blank()
    paint(b, 1, 1, [255, 0, 0, 255])
    paint(b, 5, 6, [0, 0, 255, 255])
    const r = comparePixels(a, b, W, H)
    expect(r.differing).toBe(2)
    expect(r.fraction).toBeCloseTo(2 / 64)
    expect(r.box).toEqual({ x: 1, y: 1, width: 5, height: 6 })
  })

  it('treats an alpha change as a difference', () => {
    const a = blank(), b = blank()
    paint(a, 0, 0, [10, 10, 10, 255]); paint(b, 0, 0, [10, 10, 10, 128])
    expect(comparePixels(a, b, W, H).differing).toBe(1)
  })
})

// A pair of empty frames compares equal and proves nothing, so the page needs
// to know an empty frame when it reads one.
describe('isFlat', () => {
  it('reads an untouched frame as flat', () => {
    expect(isFlat(blank())).toBe(true)
  })

  it('reads a frame of one solid color as flat', () => {
    const a = blank()
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) paint(a, x, y, [17, 34, 51, 255])
    expect(isFlat(a)).toBe(true)
  })

  it('reads one painted pixel as not flat', () => {
    const a = blank()
    paint(a, 6, 2, [0, 0, 0, 255])
    expect(isFlat(a)).toBe(false)
  })
})
