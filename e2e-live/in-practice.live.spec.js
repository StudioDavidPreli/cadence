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
