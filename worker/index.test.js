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

// The launch trace links (docs/decisions/trace-links-2026-08-17.md): a known
// slug counts one visit and redirects, crawlers and typos redirect without
// counting, and a storage failure never costs the visitor the redirect.

function linkRequest(slug, { method = 'GET', ua = 'Mozilla/5.0' } = {}) {
  return new Request(`https://cadence.test/l/${slug}`, {
    method,
    headers: ua ? { 'User-Agent': ua } : {},
  })
}

describe('GET /l/<slug>', () => {
  it('counts a known channel and redirects to the tool', async () => {
    const env = mockEnv()
    const res = await worker.fetch(linkRequest('linkedin'), env)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://cadence.test/')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(env.EVENTS.writeDataPoint).toHaveBeenCalledWith({
      blobs: ['visit', 'linkedin', 'tool'],
      doubles: [1],
      indexes: ['visit'],
    })
  })

  it('sends a -cs slug to the case study with a case-study blob', async () => {
    const env = mockEnv()
    const res = await worker.fetch(linkRequest('linkedin-cs'), env)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://davidpreli.com/cadence/')
    expect(env.EVENTS.writeDataPoint).toHaveBeenCalledWith({
      blobs: ['visit', 'linkedin', 'case-study'],
      doubles: [1],
      indexes: ['visit'],
    })
  })

  it.each(['som', 'claudeai', 'webdev', 'rive', 'contra', 'dm', 'featured'])(
    'accepts channel %s',
    async (channel) => {
      const env = mockEnv()
      const res = await worker.fetch(linkRequest(channel), env)
      expect(res.status).toBe(302)
      expect(env.EVENTS.writeDataPoint).toHaveBeenCalledTimes(1)
    }
  )

  it('redirects an unknown slug home without counting', async () => {
    const env = mockEnv()
    const res = await worker.fetch(linkRequest('linkdin'), env)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://cadence.test/')
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled()
  })

  it('redirects an unknown -cs slug home, not to the case study', async () => {
    const env = mockEnv()
    const res = await worker.fetch(linkRequest('linkdin-cs'), env)
    expect(res.headers.get('Location')).toBe('https://cadence.test/')
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled()
  })

  it.each([
    ['LinkedInBot/1.0 (compatible; Mozilla/5.0)'],
    ['Mozilla/5.0 (compatible; redditbot/1.0)'],
    ['facebookexternalhit/1.1'],
    ['Slackbot-LinkExpanding 1.0'],
  ])('redirects a link-preview crawler (%s) without counting', async (ua) => {
    const env = mockEnv()
    const res = await worker.fetch(linkRequest('linkedin', { ua }), env)
    expect(res.status).toBe(302)
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled()
  })

  it('redirects a HEAD request without counting', async () => {
    const env = mockEnv()
    const res = await worker.fetch(linkRequest('linkedin', { method: 'HEAD' }), env)
    expect(res.status).toBe(302)
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled()
  })

  it('still redirects when the write throws (metrics never break the tool)', async () => {
    const env = { EVENTS: { writeDataPoint: vi.fn(() => { throw new Error('down') }) } }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await worker.fetch(linkRequest('linkedin'), env)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://cadence.test/')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('still redirects when the binding is absent entirely', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await worker.fetch(linkRequest('linkedin'), {})
    expect(res.status).toBe(302)
    consoleError.mockRestore()
  })
})
