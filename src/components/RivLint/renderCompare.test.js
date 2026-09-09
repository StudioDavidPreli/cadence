import { describe, it, expect } from 'vitest'
import { comparePixels } from './renderCompare'

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
