// The stored samples the page's buttons load (public/measure-samples/*.json)
// are traces recorded once from the built site's Button; the fit runs on
// click. This keeps them in sync with the model: if the fit changes so that
// a sample no longer recovers the tokens it was recorded at, this fails
// before the page can show a sample that contradicts its own "Recorded at"
// line. It also pins the file shape the page reads.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseMs, parseCubicBezier } from '../../tokens/parse'
import { analyzeTrace, nearestNamed } from './measureModel'

const dir = path.join(__dirname, '..', '..', '..', 'public', 'measure-samples')
const index = JSON.parse(readFileSync(path.join(dir, 'samples.json'), 'utf8'))

describe('stored samples', () => {
  it('lists three samples, each pointing at a data file on this origin', () => {
    expect(index.samples.map(s => s.id)).toEqual(['standard', 'snappy', 'cinematic'])
    for (const s of index.samples) expect(s.data).toMatch(/^\/measure-samples\/[a-z]+\.json$/)
  })

  for (const entry of index.samples) {
    describe(entry.id, () => {
      const doc = JSON.parse(readFileSync(path.join(dir, path.basename(entry.data)), 'utf8'))
      it('carries a trace, a region inside its still, the truth, and a recorded date', () => {
        expect(doc.t.length).toBe(doc.e.length)
        expect(doc.t.length).toBeGreaterThan(50)
        expect(doc.recorded).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(doc.still.src).toBe(`/measure-samples/${entry.id}.png`)
        expect(doc.region.left + doc.region.width).toBeLessThanOrEqual(doc.still.width)
        expect(doc.region.top + doc.region.height).toBeLessThanOrEqual(doc.still.height)
        expect(readFileSync(path.join(dir, `${entry.id}.png`)).length).toBeGreaterThan(0)
      })
      it('recovers the tokens it was recorded at', () => {
        const { segments } = analyzeTrace(doc.t, doc.e)
        expect(segments.length).toBeGreaterThanOrEqual(2)
        const down = segments[0]
        const truthD = parseMs(doc.truth.durationFast)
        expect(down.indistinct).toContain(nearestNamed(parseCubicBezier(doc.truth.pressDown)))
        expect(down.named[0].band[0]).toBeLessThanOrEqual(truthD)
        expect(down.named[0].band[1]).toBeGreaterThanOrEqual(truthD)
      })
    })
  }
})
