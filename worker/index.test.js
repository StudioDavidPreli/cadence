import { describe, it, expect, vi } from 'vitest'
import worker from './index.js'

// Exercises POST /api/event through the worker's real fetch handler (routing
// included), with the Analytics Engine binding mocked. These are the contract
// tests: the allowlist validation matrix, and the rule that a storage failure
// never surfaces to the client. The GitHub-backed bug-report path is not
// covered here; it was verified end-to-end against production (2026-07-15)
// and a unit test would only be testing the mock.

function eventRequest(body, method = 'POST') {
  return new Request('https://cadence.test/api/event', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
}

function mockEnv() {
  return { EVENTS: { writeDataPoint: vi.fn() } }
}

describe('POST /api/event', () => {
  it.each(['dtcg', 'json', 'css', 'framer-motion'])(
    'accepts an export with format %s and writes one data point',
    async (format) => {
      const env = mockEnv()
      const res = await worker.fetch(eventRequest({ type: 'export', format }), env)
      expect(res.status).toBe(204)
      expect(env.EVENTS.writeDataPoint).toHaveBeenCalledTimes(1)
      expect(env.EVENTS.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['export', format],
        doubles: [1],
        indexes: ['export'],
      })
    }
  )

  it('accepts an import with no format', async () => {
    const env = mockEnv()
    const res = await worker.fetch(eventRequest({ type: 'import' }), env)
    expect(res.status).toBe(204)
    expect(env.EVENTS.writeDataPoint).toHaveBeenCalledWith({
      blobs: ['import', ''],
      doubles: [1],
      indexes: ['import'],
    })
  })

  it.each([
    ['unknown type', { type: 'pageview' }],
    ['missing type', { format: 'css' }],
    ['non-string type', { type: 42 }],
    ['export without format', { type: 'export' }],
    ['export with unknown format', { type: 'export', format: 'scss' }],
    ['export with non-string format', { type: 'export', format: 7 }],
    ['import carrying a format', { type: 'import', format: 'dtcg' }],
  ])('rejects %s with 400 and writes nothing', async (_label, body) => {
    const env = mockEnv()
    const res = await worker.fetch(eventRequest(body), env)
    expect(res.status).toBe(400)
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled()
  })

  it('rejects a non-JSON body with 400', async () => {
    const env = mockEnv()
    const res = await worker.fetch(
      new Request('https://cadence.test/api/event', { method: 'POST', body: 'not json' }),
      env
    )
    expect(res.status).toBe(400)
  })

  it('rejects non-POST methods with 405', async () => {
    const env = mockEnv()
    const res = await worker.fetch(eventRequest(undefined, 'GET'), env)
    expect(res.status).toBe(405)
  })

  it('still returns 204 when the write throws (metrics never break the tool)', async () => {
    const env = { EVENTS: { writeDataPoint: vi.fn(() => { throw new Error('down') }) } }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await worker.fetch(eventRequest({ type: 'import' }), env)
    expect(res.status).toBe(204)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('still returns 204 when the binding is absent entirely', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await worker.fetch(eventRequest({ type: 'import' }), {})
    expect(res.status).toBe(204)
    consoleError.mockRestore()
  })
})
