// In Practice › Basis (#/in-practice): the frame's `src` and its lifecycle.
// Decision record: docs/decisions/in-practice-2026-10-14.md.
//
// This spec never needs Basis to be up. Every request to basis.davidpreli.com
// is answered here with an empty document, so a Basis outage cannot block a
// Cadence push (scope 6). What it asserts is everything Cadence decides: the
// route, that nothing reaches Basis before the leaf is entered, the `src` for
// every theme, preset and reduced-motion state, and that leaving and
// returning does not reload the frame. What Basis does with the `src` is the
// live spec's job (e2e-live/, run on demand).
//
// The expected `src` is built by the page's own model, imported here, so the
// theme map and the reduce rule are stated once.
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedStorage, stubAnalyticsBeacon } from './helpers'
import { BASIS_ORIGIN, frameSrc } from '../src/components/InPractice/inPracticeModel.js'

const THEME_BUTTONS = {
  light: 'Light theme',
  dark: 'Dark theme',
  'high-contrast-light': 'HC Light theme',
  'high-contrast-dark': 'HC Dark theme',
}

// Answer Basis with an empty page and count the document loads, so a test can
// tell a reload from a frame that stayed put.
async function stubBasis(context) {
  const loads = []
  await context.route(`${BASIS_ORIGIN}/**`, (route) => {
    if (route.request().resourceType() === 'document') loads.push(route.request().url())
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Basis stub</title>' })
  })
  return loads
}

const frame = (page) => page.getByTestId('basis-frame')
const navHeader = (page, label) =>
  page.getByRole('navigation', { name: 'Tools and categories' }).getByRole('button', { name: label, exact: true })

test.describe('in practice', () => {
  test.beforeEach(async ({ context }) => {
    await stubAnalyticsBeacon(context)
    await seedStorage(context, { 'cadence-theme': 'dark' })
  })

  test('nothing reaches Basis until the leaf is entered; the header opens to Basis', async ({ page, context }) => {
    const loads = await stubBasis(context)
    const basisRequests = []
    page.on('request', (r) => { if (r.url().startsWith(BASIS_ORIGIN)) basisRequests.push(r.url()) })

    await page.goto('/#/')
    await navHeader(page, 'Token Lab').click()
    await navHeader(page, 'Glossary').click()
    await expect(page).toHaveURL(/#\/glossary$/)
    await page.waitForLoadState('networkidle')
    expect(basisRequests).toEqual([])

    await navHeader(page, 'In Practice').click()
    await expect(page).toHaveURL(/#\/in-practice$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Basis' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Basis', exact: true })).toHaveAttribute('aria-current', 'true')
    await expect(frame(page)).toHaveAttribute(
      'src',
      frameSrc({ preset: 'standard', theme: 'dark', reducedMotion: false, consented: false }),
    )
    await expect.poll(() => loads.length).toBe(1)

    // The tool bar stays open here (the page points at its presets).
    await expect(page.getByRole('button', { name: 'Snappy' }).first()).toBeVisible()

    // Back returns to the Glossary; forward comes back to Basis.
    await page.goBack()
    await expect(page).toHaveURL(/#\/glossary$/)
    await page.goForward()
    await expect(page).toHaveURL(/#\/in-practice$/)
    await expect(frame(page)).toBeVisible()
  })

  test('a deep link parses, and a stale tail falls back to Basis', async ({ page, context }) => {
    await stubBasis(context)
    await page.goto('/#/in-practice/nothing-here')
    await expect(page.getByRole('heading', { level: 2, name: 'Basis' })).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/#\/in-practice$/)
  })

  test('the frame wears each Cadence theme', async ({ page, context }) => {
    await stubBasis(context)
    await page.goto('/#/in-practice')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })

    for (const theme of Object.keys(THEME_BUTTONS)) {
      await page.getByRole('button', { name: THEME_BUTTONS[theme], exact: true }).click()
      await expect(frame(page)).toHaveAttribute(
        'src',
        frameSrc({ preset: 'standard', theme, reducedMotion: false, consented: false }),
      )
    }
  })

  test('the frame follows the tool bar preset, and Custom keeps the last built-in', async ({ page, context }) => {
    const loads = await stubBasis(context)
    await page.goto('/#/in-practice')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })

    for (const [label, preset] of [['Snappy', 'snappy'], ['Cinematic', 'cinematic'], ['Standard', 'standard'], ['Cinematic', 'cinematic']]) {
      await page.getByRole('button', { name: label }).first().click()
      await expect(frame(page)).toHaveAttribute(
        'src',
        frameSrc({ preset, theme: 'dark', reducedMotion: false, consented: false }),
      )
    }
    await expect.poll(() => loads.length).toBe(5)

    // Nudge a slider: the bar now reads Custom, which Basis cannot run. The
    // frame stays on Cinematic and does not reload.
    // Duration starts collapsed in the tool bar; open it first.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    const slider = page.getByRole('slider', { name: 'duration.fast' })
    for (let i = 0; i < 3; i++) await slider.press('ArrowRight')
    await expect(frame(page)).toHaveAttribute(
      'src',
      frameSrc({ preset: 'cinematic', theme: 'dark', reducedMotion: false, consented: false }),
    )
    await page.waitForTimeout(500)
    expect(loads.length).toBe(5)
  })

  test('leaving the section and coming back does not reload the frame', async ({ page, context }) => {
    const loads = await stubBasis(context)
    await page.goto('/#/in-practice')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    await expect.poll(() => loads.length).toBe(1)

    await navHeader(page, 'Glossary').click()
    await expect(frame(page)).toBeHidden()
    await navHeader(page, 'Principles').click()
    await navHeader(page, 'In Practice').click()
    await expect(frame(page)).toBeVisible()
    await page.waitForTimeout(500)
    expect(loads.length).toBe(1)
  })

  test('under reduced motion the frame reduces until View motion, and the consent holds for the visit', async ({ page, context }) => {
    const loads = await stubBasis(context)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#/in-practice')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })

    const reduced = frameSrc({ preset: 'standard', theme: 'dark', reducedMotion: true, consented: false })
    const consented = frameSrc({ preset: 'standard', theme: 'dark', reducedMotion: true, consented: true })
    await expect(frame(page)).toHaveAttribute('src', reduced)

    const viewMotion = page.getByRole('button', { name: 'View motion' })
    await expect(viewMotion).toHaveAttribute('aria-pressed', 'false')
    await viewMotion.click()
    await expect(viewMotion).toHaveAttribute('aria-pressed', 'true')
    await expect(frame(page)).toHaveAttribute('src', consented)

    // The consent survives a section swap and a preset switch.
    await navHeader(page, 'Glossary').click()
    await navHeader(page, 'In Practice').click()
    await expect(frame(page)).toHaveAttribute('src', consented)
    await page.getByRole('button', { name: 'Snappy' }).first().click()
    await expect(frame(page)).toHaveAttribute(
      'src',
      frameSrc({ preset: 'snappy', theme: 'dark', reducedMotion: true, consented: true }),
    )
    // First load reduced; every load after the press carries the consent.
    expect(loads[0]).toContain('reduce=1')
    expect(loads.slice(1).every((url) => url.includes('reduce=0'))).toBe(true)
  })

  test('no View motion control without the preference', async ({ page, context }) => {
    await stubBasis(context)
    await page.goto('/#/in-practice')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'View motion' })).toHaveCount(0)
  })

  test('the Basis page passes axe (the frame itself is the live spec\'s)', async ({ page, context }) => {
    await stubBasis(context)
    await page.goto('/#/in-practice')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-testid="basis-frame"]')
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
})
