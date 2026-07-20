// Token propagation — the thesis, executed by machine.
// docs/deploy-verification-matrix.md, "Token integrity" T1 rows. The core
// argument of the project is that editing a token through the UI changes
// consuming components live; these tests are that argument as a deploy gate.
import { test, expect } from '@playwright/test'
import { readToken } from './helpers'

test.describe('token propagation (the thesis)', () => {
  test('a duration slider edit rewrites the custom property and the live code view follows', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    const slider = page.getByRole('slider', { name: 'duration.fast' })
    await expect(slider).toBeVisible()

    // Drive by keyboard, not fill(): arrows are the real user path and each
    // press dispatches the same input event a pointer drag does.
    // duration.fast defaults to 100ms, step 10 -> five presses = 150ms.
    for (let i = 0; i < 5; i++) await slider.press('ArrowRight')

    await expect.poll(() => readToken(page, '--motion-duration-fast')).toBe('150ms')
    // The consuming side: each demo card hides its code view behind a "Show
    // code" toggle. The first card in Press & State is the Button, whose
    // snippet reads tokens.duration.fast; its resolved value renders in
    // seconds. This is the half that proves propagation, not just storage.
    await page.getByRole('button', { name: 'Show code' }).first().click()
    await expect(page.locator('pre').filter({ hasText: '0.15s' }).first()).toBeVisible()
  })

  test('a spring slider edit rewrites the custom property and the live code view follows', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    const slider = page.getByRole('slider', { name: 'spring.stiffness' })
    await expect(slider).toBeVisible()

    // Spring is unitless, so this is the thesis without the ms→s conversion.
    // stiffness defaults to 400, step 10 -> five presses = 450.
    for (let i = 0; i < 5; i++) await slider.press('ArrowRight')

    await expect.poll(() => readToken(page, '--motion-spring-stiffness')).toBe('450')
    // The Button snippet reads tokens.spring.stiffness in its motionMode branch;
    // the resolved value renders unitless in the code view. This is the
    // propagation half, not just storage.
    await page.getByRole('button', { name: 'Show code' }).first().click()
    await expect(page.locator('pre').filter({ hasText: '450' }).first()).toBeVisible()
  })

  test('an easing preset click rewrites each slot (standard, enter, exit)', async ({ page }) => {
    await page.goto('/#/token-lab')
    // Tab names and preset-button names collide (Standard, Enter, Exit exist
    // as both), so select by role: tabs pick the slot, buttons pick the curve.
    const slots = [
      { tab: 'Standard', prop: '--motion-ease-standard' },
      { tab: 'Enter', prop: '--motion-ease-enter' },
      { tab: 'Exit', prop: '--motion-ease-exit' },
    ]
    for (const { tab, prop } of slots) {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      await page.getByRole('button', { name: 'Linear', exact: true }).click()
      // Linear is EASING_CURVES.linear, written verbatim by easingCss().
      await expect.poll(() => readToken(page, prop)).toBe('cubic-bezier(0, 0, 1, 1)')
    }
  })

  test('Explore mode widens slider ranges; toggling off resets to Standard', async ({ page }) => {
    await page.goto('/#/token-lab')
    const slider = page.getByRole('slider', { name: 'duration.fast' })

    // Constrained ranges are the semantic bounds (DURATION_CONFIG).
    await expect(slider).toHaveAttribute('min', '50')
    await expect(slider).toHaveAttribute('max', '500')

    await page.getByRole('switch', { name: 'Explore' }).click()
    // Explore is the full system range (DURATION_CONFIG_EXPLORE), and the
    // Overshoot easing tab only exists here.
    await expect(slider).toHaveAttribute('min', '0')
    await expect(slider).toHaveAttribute('max', '2000')
    await expect(page.getByRole('tab', { name: 'Overshoot' })).toBeVisible()

    // Push the value somewhere only Explore allows, then leave Explore.
    // The documented model is "toggle off = clean state": everything resets
    // to the Standard preset rather than clamping the out-of-range value in
    // place.
    await slider.fill('1800')
    await expect.poll(() => readToken(page, '--motion-duration-fast')).toBe('1800ms')
    await page.getByRole('switch', { name: 'Explore' }).click()
    await expect.poll(() => readToken(page, '--motion-duration-fast')).toBe('100ms')
    await expect(page.getByRole('tab', { name: 'Overshoot' })).toBeHidden()
  })

  test('out-of-range import is clamped and itemized, never silently dropped', async ({ page }) => {
    await page.goto('/#/token-lab')
    // A flat-format file with two scalars outside even the Explore bounds.
    // Import clamps to EXPLORE_BOUNDS (duration max 2000, scale max 1.2) and
    // must report each adjustment in the result modal.
    const file = {
      name: 'out-of-range.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        duration: { fast: 9999 },
        scale: { lift: 3.5 },
      })),
    }
    await page.locator('input[type="file"]').setInputFiles(file)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('9999')
    await expect(dialog).toContainText('2000')
    await expect(dialog).toContainText('3.5')
    await expect(dialog).toContainText('1.2')

    // The clamped values are what actually landed in the system.
    await expect.poll(() => readToken(page, '--motion-duration-fast')).toBe('2000ms')
    await expect.poll(() => readToken(page, '--motion-scale-lift')).toBe('1.2')
  })
})
