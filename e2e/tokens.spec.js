// Token propagation — the thesis, executed by machine.
// docs/deploy-verification-matrix.md, "Token integrity" T1 rows. The core
// argument of the project is that editing a token through the UI changes
// consuming components live; these tests are that argument as a deploy gate.
import { test, expect } from '@playwright/test'
import { readToken } from './helpers'

test.describe('token propagation (the thesis)', () => {
  test('a duration slider edit rewrites the custom property and the live code view follows', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    // Duration starts collapsed (David's section order, 2026-07-21); open it.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
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
    // Spring starts collapsed (2026-07-21 section order); open it.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Spring' }).click()
    const slider = page.getByRole('slider', { name: 'spring.stiffness' })
    await expect(slider).toBeVisible()

    // Spring is unitless, so this is the thesis without the ms→s conversion.
    // stiffness defaults to 170 (Standard), step 10 -> five presses = 220.
    for (let i = 0; i < 5; i++) await slider.press('ArrowRight')

    await expect.poll(() => readToken(page, '--motion-spring-stiffness')).toBe('220')
    // The Button snippet reads tokens.spring.stiffness in its motionMode branch;
    // the resolved value renders unitless in the code view. This is the
    // propagation half, not just storage.
    await page.getByRole('button', { name: 'Show code' }).first().click()
    await expect(page.locator('pre').filter({ hasText: '220' }).first()).toBeVisible()
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
    // Duration starts collapsed (2026-07-21 section order); open it.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
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

// The reduced-motion resolution (A4, 2026-09-13). The provider does not travel
// with an exported set, so the file carries the answer the tool applies.
// docs/decisions/reduced-motion-resolution-2026-09-13.md
test.describe('reduced motion travels with the export', () => {
  test('the CSS download carries the media block, and the audit states the resolution', async ({ page }) => {
    await page.goto('/#/token-lab')
    // The export modal (2026-09-15): the tool bar's Export… opens it, the
    // format list picks CSS, and the primary action names the format.
    await page.getByRole('button', { name: 'Export…' }).click()
    await page.getByRole('button', { name: /^CSS\b/ }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSS' }).click(),
    ])
    const css = await (await download.createReadStream()).toArray()
      .then(chunks => Buffer.concat(chunks).toString('utf8'))

    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    const media = css.slice(css.indexOf('@media'))
    expect(media).toContain('--motion-duration-fast: 10ms;')
    expect(media).toContain('--motion-duration-slower: 10ms;')
    expect(media).toContain('--motion-delay-long: 0ms;')
    // The resolution replaces the two time families and nothing else.
    expect(media).not.toContain('--motion-ease-')
    expect(media).not.toContain('--motion-scale-')
    expect(media).not.toContain('--motion-spring-')
    expect(media).not.toContain('--motion-duration-scalar')

    // The same answer, stated in the report the engineer reads beside the file.
    // The export dialog is modal, so it closes before the tool bar is reachable.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Export tokens' })).toBeHidden()
    await page.getByRole('button', { name: 'View report' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Reduced motion')
    await expect(dialog).toContainText('replacement: durations 10ms, delays 0ms; easing, scale and spring unchanged')
  })
})

// The easing duplicate-curve note (A3, 2026-09-13). The bar is the floor of
// Measure's indistinctMargin, and the rule excludes exact matches on purpose:
// two slots holding the same curve is a role assignment, which two of the three
// shipped presets do deliberately. docs/decisions/easing-duplicate-curve-2026-09-13.md
test.describe('easing duplicates', () => {
  const flatWithEnter = enter => ({
    name: 'easing.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        enter,
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    })),
  })

  test('notes two slots that drifted together, and stays silent on the presets', async ({ page }) => {
    await page.goto('/#/token-lab')
    const auditLine = page.locator('[class*="auditSummary"]').first()
    await expect(auditLine).toHaveText('Audit: nothing to flag')

    // 0.404 against 0.400: one CSS pixel of drag on the visualizer, 0.0020 rms,
    // inside the 0.005 bar.
    await page.locator('input[type="file"]').setInputFiles(flatWithEnter('cubic-bezier(0.404, 0, 0.2, 1)'))
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('0 findings and 1 note')
    await page.keyboard.press('Escape')
    await expect(auditLine).toHaveText('Audit: 1 note')

    await page.getByRole('button', { name: 'View report' }).click()
    await expect(page.getByRole('dialog')).toContainText(
      'ease.standard and ease.enter draw the same curve, within the separation a recording can resolve. Two names, one shape.',
    )
    await page.keyboard.press('Escape')

    // Every shipped preset is silent, including the two that alias a curve
    // outright: Snappy points standard at overshoot, Cinematic at enter.
    for (const preset of ['Snappy', 'Cinematic', 'Standard']) {
      await page.getByRole('button', { name: preset }).first().click()
      await expect(auditLine).toHaveText('Audit: nothing to flag')
    }
  })

  test('says nothing when two slots hold the same curve outright', async ({ page }) => {
    await page.goto('/#/token-lab')
    await page.locator('input[type="file"]').setInputFiles(flatWithEnter('cubic-bezier(0.4, 0, 0.2, 1)'))
    await expect(page.getByRole('dialog')).toContainText('contradicts itself')
    await page.keyboard.press('Escape')
    await expect(page.locator('[class*="auditSummary"]').first()).toHaveText('Audit: nothing to flag')
  })
})
