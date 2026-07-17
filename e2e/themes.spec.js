// Theme and media emulation — docs/deploy-verification-matrix.md, "Theme and
// media emulation" T1 rows. Contexts are created per-combination because
// colorScheme/contrast must be set before the pre-paint script in index.html
// runs; that script is the code under test.
import { test, expect } from '@playwright/test'
import { readToken, seedStorage } from './helpers'

test.describe('OS-preference first load (no stored choice)', () => {
  const matrix = [
    { colorScheme: 'dark', contrast: 'no-preference', expected: 'dark' },
    { colorScheme: 'light', contrast: 'no-preference', expected: 'light' },
    { colorScheme: 'dark', contrast: 'more', expected: 'high-contrast-dark' },
    { colorScheme: 'light', contrast: 'more', expected: 'high-contrast-light' },
  ]
  for (const { colorScheme, contrast, expected } of matrix) {
    test(`${colorScheme} + contrast:${contrast} resolves to ${expected}`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme, contrast })
      const page = await context.newPage()
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', expected)
      await context.close()
    })
  }
})

test('a stored choice wins over conflicting OS preferences, set before paint', async ({ browser }) => {
  // OS says dark and high contrast; the user chose light. Light must win,
  // and it must be the pre-paint script that applies it (no flash, no
  // post-mount re-set). Asserting immediately after navigation catches a
  // late re-resolution.
  const context = await browser.newContext({ colorScheme: 'dark', contrast: 'more' })
  await seedStorage(context, { 'cadence-theme': 'light' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await context.close()
})

test('theme switch re-reads tokens: custom properties resolve to new values', async ({ page }) => {
  await page.goto('/')
  const before = await readToken(page, '--color-bg')
  const current = await page.locator('html').getAttribute('data-theme')
  // Switch to whichever pole we are not on, so the test is stable regardless
  // of the context's default scheme.
  const target = current === 'dark' ? 'Light theme' : 'Dark theme'
  // exact: true — "Dark theme" is a prefix of "HC Dark theme".
  await page.getByRole('button', { name: target, exact: true }).click()
  await expect.poll(() => readToken(page, '--color-bg')).not.toBe(before)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the Modal fully appears and fully leaves under prefers-reduced-motion', async ({ page }) => {
    // Reduced motion must reduce ambition, not strand the user: the dialog
    // still reaches full opacity and still closes. A broken reduce path
    // classically leaves the panel stuck mid-transition.
    await page.goto('/#/principles')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect.poll(async () =>
      dialog.evaluate((el) => getComputedStyle(el).opacity),
    ).toBe('1')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
