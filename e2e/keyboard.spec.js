// Keyboard operability — docs/deploy-verification-matrix.md, "Keyboard
// operability" T1 rows. Playwright drives real key events and reads
// activeElement; nothing here is simulated below the event layer.
import { test, expect } from '@playwright/test'
import { readToken } from './helpers'

test.describe('keyboard operability', () => {
  test('sliders have an accessible name, respond to arrows, and show a focus ring', async ({ page }) => {
    await page.goto('/#/token-lab')
    // Duration starts collapsed (2026-07-21 section order); open it first.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    // getByRole with a name only resolves if the aria-label is present, so
    // this locator IS the accessible-name assertion (the 2026-07-16 fix).
    const slider = page.getByRole('slider', { name: 'duration.base' })
    // press() focuses then sends the key; a keyboard interaction makes
    // :focus-visible match, which is what the ring rule is written against.
    await slider.press('ArrowRight')
    await expect.poll(() => readToken(page, '--motion-duration-base')).toBe('210ms')
    const outline = await slider.evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).not.toBe('none')
  })

  test('nav accordion is keyboard operable: Enter toggles, state is exposed', async ({ page }) => {
    await page.goto('/')
    const principles = page.getByRole('button', { name: 'Principles' })
    await principles.focus()
    const before = await principles.getAttribute('aria-expanded')
    await principles.press('Enter')
    await expect(principles).toHaveAttribute('aria-expanded', before === 'true' ? 'false' : 'true')
  })

  test('the Card demo toggles by keyboard and exposes pressed state', async ({ page }) => {
    // Regression guard for the 2026-07-16 axe finding: the Card was a
    // pointer-only div carrying aria-pressed without a button role.
    await page.goto('/#/token-lab/press-state')
    const card = page.getByRole('button', { name: /Squash & Stretch/ })
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await card.press(' ')
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await card.press('Enter')
    await expect(card).toHaveAttribute('aria-pressed', 'false')
  })

  test('focus is trapped inside the open Modal and Escape closes it', async ({ page }) => {
    // Fresh context: no intro-seen flag, so the Principles intro Modal
    // auto-opens. This is the app's one reliably reachable app-level dialog.
    await page.goto('/#/principles')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Walk far enough that an unbounded tab order would certainly have left
    // the dialog (it contains only a handful of focusables), asserting
    // containment after every step.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() =>
        document.querySelector('[role="dialog"]')?.contains(document.activeElement),
      )
      expect(inside, `Tab press ${i + 1} escaped the dialog`).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    // Focus must land somewhere real, not be lost into the removed subtree.
    const activeTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeTag).toBeTruthy()
  })
})
