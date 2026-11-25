// In Practice › Basis against LIVE Basis (scope 6 of
// docs/decisions/in-practice-2026-10-14.md). On demand only:
// `npm run test:live`. The pre-push spec (e2e/in-practice.spec.js) asserts
// what Cadence sends; this one asserts what Basis does with it: that the
// frame is allowed to render here, that it paints a Cadence paper in each of
// the four themes, that the framed page is axe clean, and that a sort runs.
//
// Needs the network and basis.davidpreli.com up. A failure here is a Basis
// question first: check the embed unframed before changing Cadence.
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const THEMES = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark']

// Resolve a CSS color through the browser, so '#141414' and 'rgb(20, 20, 20)'
// compare equal (the minifier respells colors; the parse.js lesson).
function resolvedColors(page, names) {
  return page.evaluate((list) => {
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    const out = list.map((n) => {
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue(n).trim()
      return getComputedStyle(probe).color
    })
    probe.remove()
    return out
  }, names)
}

for (const theme of THEMES) {
  test(`Basis paints a Cadence paper in ${theme}, is axe clean, and sorts`, async ({ page, context }) => {
    await context.addInitScript((t) => localStorage.setItem('cadence-theme', t), theme)
    await page.goto('/#/in-practice')

    const frameEl = page.getByTestId('basis-frame')
    await expect(frameEl).toBeVisible({ timeout: 30_000 })
    const framed = page.frameLocator('[data-testid="basis-frame"]')
    // Rendered at all: a frame-ancestors refusal leaves an empty document.
    await expect(framed.getByRole('table')).toBeVisible({ timeout: 30_000 })

    // The paper: the framed page's background is one of Cadence's own
    // surfaces in this theme (Basis restates them from color.css).
    const cadence = await resolvedColors(page, ['--color-bg', '--color-surface-raised', '--color-surface'])
    const frame = page.frames().find((f) => f.url().startsWith('https://basis.davidpreli.com'))
    const paper = await frame.evaluate(() => {
      const bg = (el) => getComputedStyle(el).backgroundColor
      const transparent = 'rgba(0, 0, 0, 0)'
      return bg(document.body) !== transparent ? bg(document.body) : bg(document.documentElement)
    })
    expect(cadence, `frame paper ${paper} is not a Cadence ${theme} surface`).toContain(paper)

    // The chart is drawn, and the 820 px box holds the whole stage: Basis
    // reported that height for every width from 560 to 880, so the framed
    // document must not scroll inside itself.
    await expect(framed.locator('svg').first()).toBeVisible()
    const overflow = await frame.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
    expect(overflow, 'the framed stage scrolls inside its 820 px box').toBeLessThanOrEqual(0)

    // Axe inside the frame.
    const results = await new AxeBuilder({ page })
      .include('[data-testid="basis-frame"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])

    // A sort runs: a column header's sort control flips its aria-sort.
    const header = framed.getByRole('columnheader').nth(2)
    await header.getByRole('button').click()
    await expect(header).not.toHaveAttribute('aria-sort', 'none')
  })
}

// ─── CLNDR, the booking calendar ─────────────────────────────────────────────
//
// Against LIVE CADENCE, not the local build: only https://cadence.davidpreli.com
// may frame the calendar (David, 2026-11-25), so this works once the leaf is
// deployed, and says nothing about an undeployed change.
//
// The calendar takes real bookings. This test LOOKS AND NOTHING ELSE: it presses
// no day and no time, never opens the form and never presses Book. Pressing a
// day loads Cloudflare's script and opening the form runs the real Turnstile.
// Nothing inside the frame is ever clicked here; keep it that way.
//
// One test, one frame, four loads one after another, no retry: each load asks
// the live /api/slots, and the zone blocks an address for 10 s after 15
// requests in 10 s, which would block a real visitor on that address too. The
// pause between themes keeps well under it.
const LIVE_CADENCE = 'https://cadence.davidpreli.com'
const LIVE_CALENDAR = 'https://calendar.davidpreli.com'
const CLNDR_THEMES = {
  dark: ['Dark theme', 'cadence-dark'],
  light: ['Light theme', 'cadence-light'],
  'high-contrast-light': ['HC Light theme', 'cadence-hc-light'],
  'high-contrast-dark': ['HC Dark theme', 'cadence-hc-dark'],
}

test.describe('CLNDR in live Cadence', () => {
  test.describe.configure({ retries: 0, timeout: 180_000 })

  test('the calendar paints in each theme, does not scroll, and is axe clean at rest', async ({ page, context }) => {
    // This visit is not a visitor: no analytics beacon, no event.
    await context.route('https://static.cloudflareinsights.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }))
    await context.route(`${LIVE_CADENCE}/api/**`, (r) => r.fulfill({ status: 204, body: '' }))
    await context.addInitScript(() => localStorage.setItem('cadence-theme', 'dark'))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${LIVE_CADENCE}/#/in-practice/clndr`)
    await expect(page.getByTestId('clndr-frame')).toBeVisible({ timeout: 30_000 })
    const framed = page.frameLocator('[data-testid="clndr-frame"]')

    for (const [theme, [button, name]] of Object.entries(CLNDR_THEMES)) {
      await page.getByRole('button', { name: button, exact: true }).click()
      await expect(page.getByTestId('clndr-frame')).toHaveAttribute('src', new RegExp(`theme=${name}$`))
      // Rendered at all (a frame-ancestors refusal leaves an empty document),
      // in this theme, with its open days come back.
      await expect(framed.locator('html')).toHaveAttribute('data-theme', name, { timeout: 30_000 })
      await expect(framed.getByRole('heading', { level: 1, name: 'Studio David Preli' })).toBeVisible({ timeout: 30_000 })
      await expect(framed.locator('#days')).not.toBeEmpty({ timeout: 30_000 })
      const open = await framed.locator('#days button').count()
      test.info().annotations.push({ type: 'open days', description: `${theme}: ${open}` })

      // The ground is Cadence's bg in this theme.
      const [bg] = await resolvedColors(page, ['--color-bg'])
      const live = page.frames().find((f) => f.url().startsWith(LIVE_CALENDAR))
      const state = await live.evaluate(() => ({
        ground: getComputedStyle(document.documentElement).backgroundColor,
        overflowY: document.documentElement.scrollHeight - window.innerHeight,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
      }))
      expect(state.ground, theme).toBe(bg)
      expect(state.overflowY, `${theme}: the frame's page scrolls`).toBeLessThanOrEqual(0)
      expect(state.overflowX, `${theme}: the frame's page runs wide`).toBeLessThanOrEqual(0)

      const results = await new AxeBuilder({ page })
        .include('[data-testid="clndr-frame"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
      await page.waitForTimeout(5_000)
    }
  })
})
