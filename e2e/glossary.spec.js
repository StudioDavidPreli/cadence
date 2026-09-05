// The Glossary (#/glossary, #/glossary/components) — the generated style
// guide, build-order item 5. Runs against built output through the Worker like
// the rest of the suite. The generation rows are the item's exit criterion:
// the page is data, so these assert real values and provenance surfaced from
// the package, not static copy. Sections are closed-by-default disclosures,
// so content assertions open their section first, which also exercises the
// disclosure itself.
import { test, expect } from '@playwright/test'

test.describe('glossary', () => {
  test('the tokens view renders every family closed, and a family opens to values and provenance', async ({ page }) => {
    await page.goto('/#/glossary')

    await expect(page.getByRole('heading', { level: 2, name: 'Tokens' })).toBeVisible({ timeout: 30_000 })

    // One disclosure heading per family, closed by default. The accessible
    // name is "<title> <row count>", so the trailing digits anchor keeps
    // "Duration" from also matching "Duration scalar".
    for (const family of ['Duration', 'Easing', 'Delay', 'Scale', 'Spring', 'Duration scalar', 'Ambient \\(Motion Tiles\\)']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${family} \\d+$`) })).toHaveAttribute('aria-expanded', 'false')
    }
    await expect(page.getByText('--motion-duration-base', { exact: true })).not.toBeVisible()

    // Open Duration: a generated value (200ms at Standard, from the package),
    // its Material derivation, and its consumers from the map.
    await page.getByRole('button', { name: /^Duration 4$/ }).click()
    await expect(page.getByText('--motion-duration-base', { exact: true })).toBeVisible()
    await expect(page.getByText('Material 3 duration scale (short2)')).toBeVisible()
    await expect(page.getByText(/Read by Button, NavItem/)).toBeVisible()

    // Open Ambient: the measured provenance claim surfaces.
    await page.getByRole('button', { name: /^Ambient/ }).click()
    await expect(page.getByText('[measured]').first()).toBeVisible()
  })

  test('the components view inverts the map behind disclosures', async ({ page }) => {
    await page.goto('/#/glossary/components')

    await expect(page.getByRole('heading', { level: 2, name: 'Components' })).toBeVisible({ timeout: 30_000 })

    const buttonDisclosure = page.getByRole('button', { name: /^Button \d/ })
    await expect(buttonDisclosure).toHaveAttribute('aria-expanded', 'false')
    await buttonDisclosure.click()

    // Button's reads include its press duration and the overshoot slot.
    // Scoped to Button's own body: the same paths sit hidden inside every
    // other closed component's disclosure, so a page-wide text match is
    // ambiguous by construction.
    const body = page.locator('#glossary-body-component-Button')
    await expect(body.getByText('duration.fast', { exact: true })).toBeVisible()
    await expect(body.getByText('easing.overshoot', { exact: true })).toBeVisible()
  })

  test('the nav section routes both leaves and the tool bar rails', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Glossary' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Tokens' })).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/#\/glossary$/)

    // The Token Lab tool bar collapses to its rail while the glossary is open,
    // the same set-aside form Motion Tiles gets. The rail is addressed by its
    // drawer wiring, not its name: the glossary's own Tokens nav leaf is also
    // a button named "Tokens", so the name alone is ambiguous by design.
    await expect(page.locator('button[aria-controls="tokens-drawer"]')).toBeVisible()

    await page.getByRole('button', { name: 'Components', exact: true }).click()
    await expect(page).toHaveURL(/#\/glossary\/components$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Components' })).toBeVisible()

    // Back returns to the tokens view.
    await page.goBack()
    await expect(page.getByRole('heading', { level: 2, name: 'Tokens' })).toBeVisible()
  })

  test('reduced motion swaps both title canvases for their SVG posters', async ({ page }) => {
    // page.emulateMedia, not test.use({ reducedMotion }): the latter silently
    // no-ops in this suite (playwright-mcp-verification-quirks).
    await page.emulateMedia({ reducedMotion: 'reduce' })

    await page.goto('/#/glossary')
    await expect(page.getByRole('heading', { level: 2, name: 'Tokens' })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('img[src^="/fallBacks/tokens"]')).toBeVisible()
    // The poster must actually resolve (the HC-light file shipped under a
    // singular-"token" filename once; a 404 here is exactly that class).
    const posterOk = await page.evaluate(async () => {
      const img = document.querySelector('img[src^="/fallBacks/"]')
      const res = await fetch(img.src)
      return res.ok
    })
    expect(posterOk).toBe(true)

    await page.goto('/#/glossary/components')
    await expect(page.getByRole('heading', { level: 2, name: 'Components' })).toBeVisible()
    await expect(page.locator('img[src^="/fallBacks/components"]')).toBeVisible()
    // No Rive canvas mounts under the preference — the posters replace them
    // entirely, .riv unfetched.
    await expect(page.locator('h2 canvas')).toHaveCount(0)
  })

  test('a stale tail fails soft to the tokens view', async ({ page }) => {
    await page.goto('/#/glossary/nonsense')
    await expect(page.getByRole('heading', { level: 2, name: 'Tokens' })).toBeVisible({ timeout: 30_000 })
  })
})
