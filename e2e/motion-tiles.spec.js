// Motion Tiles and the Worker as first-class verification surfaces — the
// coverage gap named in docs/open-items-audit-2026-07-16.md: the checklists
// described an app one tool smaller than the one that shipped.
import { test, expect } from '@playwright/test'
import { stubAnalyticsBeacon } from './helpers'

test.describe('motion tiles grid', () => {
  test('the grid mounts its tile field, serves WASM from our origin, and stays console-clean', async ({ page, baseURL }) => {
    const consoleErrors = []
    const pageErrors = []
    const wasmRequests = []
    const thirdPartyRuntime = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', (err) => pageErrors.push(String(err)))
    await stubAnalyticsBeacon(page)
    page.on('request', (req) => {
      const url = req.url()
      if (url.endsWith('.wasm')) wasmRequests.push(url)
      // The 2026-07-16 WASM pin exists to keep the runtime off CDNs; any
      // request to these hosts is a regression of that fix.
      if (/unpkg\.com|jsdelivr\.net/.test(url)) thirdPartyRuntime.push(url)
    })

    // Deep link straight to the grid; the router mounts it without the
    // landing's Enter gesture.
    await page.goto('/#/motion-tiles/grid')

    // The grid mounts at its default 4x4 field (gridN state in
    // MotionTilesGrid), one canvas per tile, plus a couple of chrome
    // canvases; larger fields are user-selected. Assert the default field as
    // a floor, not an exact count, so a chrome change does not flake the
    // deploy gate.
    await expect
      .poll(() => page.locator('canvas').count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(16)

    // Both halves of the WASM pin: fetched at all (the runtime is real), and
    // fetched from us.
    expect(wasmRequests.length).toBeGreaterThanOrEqual(1)
    for (const url of wasmRequests) expect(url.startsWith(baseURL)).toBe(true)
    expect(thirdPartyRuntime).toEqual([])

    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('the grid panel holds in the narrow band above the mobile gate', async ({ page }) => {
    // The v8 closeout's open question: does the grid panel need Token Lab's
    // rail collapse once it graduated from a lab route? The mobile gate
    // covers widths below ~720; this asserts the band between the gate and
    // the 1024 nav collapse renders without horizontal overflow.
    for (const width of [760, 1024]) {
      await page.setViewportSize({ width, height: 700 })
      await page.goto('/#/motion-tiles/grid')
      await expect.poll(() => page.locator('canvas').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(16)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
    }
  })

  test('the landing gates the grid: no tile canvases before Enter', async ({ page }) => {
    await page.goto('/#/motion-tiles')
    // The landing may render small chrome canvases (logo, enter button); the
    // 52-tile field must not be among them. A low ceiling proves the gate.
    await page.waitForLoadState('networkidle')
    expect(await page.locator('canvas').count()).toBeLessThan(10)
  })
})

test.describe('worker endpoint guards', () => {
  // These exercise the deployed request path without ever reaching GitHub:
  // both inputs are rejected (or swallowed) before the API call, so no issue
  // is created by a test run.
  test('rejects an empty message with 400', async ({ request }) => {
    const res = await request.post('/api/bug-report', { data: { message: '   ' } })
    expect(res.status()).toBe(400)
  })

  test('swallows honeypot submissions with 204', async ({ request }) => {
    const res = await request.post('/api/bug-report', {
      data: { message: 'e2e honeypot probe', website: 'bot-filled' },
    })
    expect(res.status()).toBe(204)
  })

  test('rejects non-POST with 405', async ({ request }) => {
    const res = await request.get('/api/bug-report')
    expect(res.status()).toBe(405)
  })
})
