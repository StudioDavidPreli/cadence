// In Practice › CLNDR (#/in-practice/clndr): the booking calendar's leaf.
// Decision record: docs/decisions/in-practice-2026-10-14.md; the embed's
// contract is docs/embed.md in the booking-calendar repo.
//
// THE CALENDAR TAKES REAL BOOKINGS, and even a refused frame sends it a
// request. So every test here answers https://calendar.davidpreli.com/** itself,
// in beforeEach, and Basis the same way: this spec reaches neither. What it
// asserts is what Cadence decides (the route, the title, the link out, the
// frame's `src`, size and lifecycle), as in-practice.spec.js does for Basis.
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedStorage, stubAnalyticsBeacon, THEMES } from './helpers'
import { BASIS_ORIGIN, CLNDR, embedSrc } from '../src/components/InPractice/inPracticeModel.js'

const THEME_BUTTONS = {
  light: 'Light theme',
  dark: 'Dark theme',
  'high-contrast-light': 'HC Light theme',
  'high-contrast-dark': 'HC Dark theme',
}
const BASE = { preset: 'standard', theme: 'dark', reducedMotion: false, consented: false }

const frame = (page) => page.getByTestId('clndr-frame')
const basisFrame = (page) => page.getByTestId('basis-frame')
const navButton = (page, label) =>
  page.getByRole('navigation', { name: 'Tools and categories' }).getByRole('button', { name: label, exact: true })

test.describe('in practice, CLNDR', () => {
  let loads
  let asked

  test.beforeEach(async ({ context, page }) => {
    loads = { clndr: [], basis: [] }
    asked = []
    await stubAnalyticsBeacon(context)
    await seedStorage(context, { 'cadence-theme': 'dark' })
    for (const [name, origin] of [['clndr', CLNDR.origin], ['basis', BASIS_ORIGIN]]) {
      await context.route(`${origin}/**`, (route) => {
        if (route.request().resourceType() === 'document') loads[name].push(route.request().url())
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><title>${name} stub</title>` })
      })
    }
    page.on('request', (r) => { if (r.url().startsWith(CLNDR.origin)) asked.push(r.url()) })
  })

  test('nothing asks the calendar until its leaf is entered; the leaf has its title, words and one frame', async ({ page }) => {
    await page.goto('/#/')
    await navButton(page, 'Glossary').click()
    await navButton(page, 'In Practice').click()
    // The header still opens Basis, and being on Basis asks nothing of the calendar.
    await expect(page).toHaveURL(/#\/in-practice$/)
    await expect(basisFrame(page)).toBeVisible({ timeout: 30_000 })
    await page.waitForLoadState('networkidle')
    expect(asked).toEqual([])
    await expect(frame(page)).toHaveCount(0)

    await navButton(page, 'CLNDR').click()
    await expect(page).toHaveURL(/#\/in-practice\/clndr$/)
    await expect(page.getByRole('heading', { level: 2, name: 'CLNDR, studio booking' })).toBeVisible({ timeout: 30_000 })
    await expect(navButton(page, 'CLNDR')).toHaveAttribute('aria-current', 'true')
    await expect(navButton(page, 'Basis')).not.toHaveAttribute('aria-current', 'true')
    await expect(frame(page)).toHaveAttribute('src', embedSrc(CLNDR, BASE))
    await expect.poll(() => loads.clndr.length).toBe(1)

    // One frame of the embed, with Basis's attributes and nothing that narrows it.
    await expect(page.locator(`iframe[src^="${CLNDR.origin}"]`)).toHaveCount(1)
    await expect(frame(page)).toHaveAttribute('loading', 'lazy')
    await expect(frame(page)).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    await expect(frame(page)).toHaveAttribute('title', 'CLNDR booking calendar, standard preset')
    for (const attr of ['sandbox', 'allow', 'credentialless']) {
      expect(await frame(page).getAttribute(attr), attr).toBeNull()
    }

    // David's first row, with the link out.
    const leaf = page.getByRole('region', { name: 'CLNDR', exact: true })
    await expect(leaf.getByText(
      'CLNDR is a custom frontend for my studio practice running a cal.com api in html using three.js and rive. Link to the full page [here].',
    )).toBeVisible()
    const link = leaf.getByRole('link', { name: '[here]', exact: true })
    await expect(link).toHaveAttribute('href', 'https://calendar.davidpreli.com')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    // The tool bar stays open; Back goes to Basis and forward returns.
    await expect(page.getByRole('button', { name: 'Snappy' }).first()).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/#\/in-practice$/)
    await expect(basisFrame(page)).toBeVisible()
    await expect(frame(page)).toBeHidden()
    await page.goForward()
    await expect(frame(page)).toBeVisible()
  })

  test('a deep link opens CLNDR and loads no Basis', async ({ page }) => {
    await page.goto('/#/in-practice/clndr')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/#\/in-practice\/clndr$/)
    await page.waitForLoadState('networkidle')
    expect(loads.basis).toEqual([])
  })

  test('the frame wears each Cadence theme', async ({ page }) => {
    await page.goto('/#/in-practice/clndr')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    for (const theme of THEMES) {
      await page.getByRole('button', { name: THEME_BUTTONS[theme], exact: true }).click()
      await expect(frame(page)).toHaveAttribute('src', embedSrc(CLNDR, { ...BASE, theme }))
    }
  })

  test('the frame follows the tool bar preset, and Custom keeps each of the three', async ({ page }) => {
    await page.goto('/#/in-practice/clndr')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    await expect.poll(() => loads.clndr.length).toBe(1)
    // Duration starts collapsed in the tool bar; open it first.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    const slider = page.getByRole('slider', { name: 'duration.fast' })

    let expected = 1
    for (const [label, preset] of [['Snappy', 'snappy'], ['Cinematic', 'cinematic'], ['Standard', 'standard']]) {
      const src = embedSrc(CLNDR, { ...BASE, preset })
      const button = page.getByRole('button', { name: label, exact: true }).first()
      await button.click()
      await expect(frame(page)).toHaveAttribute('src', src)
      await expect.poll(() => loads.clndr.length).toBe(++expected)

      // Nudge a slider: the bar reads Custom, which the calendar cannot run.
      const before = await slider.inputValue()
      for (let i = 0; i < 3; i++) await slider.press('ArrowRight')
      expect(await slider.inputValue()).not.toBe(before)
      await expect(frame(page)).toHaveAttribute('src', src)
      await page.waitForTimeout(400)
      expect(loads.clndr.length, `Custom over ${preset} reloaded the frame`).toBe(expected)
    }
  })

  test('both leaves stay alive: switching leaves and sections reloads neither', async ({ page }) => {
    await page.goto('/#/in-practice')
    await expect(basisFrame(page)).toBeVisible({ timeout: 30_000 })
    await navButton(page, 'CLNDR').click()
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    await expect(basisFrame(page)).toBeHidden()
    await expect.poll(() => [loads.basis.length, loads.clndr.length]).toEqual([1, 1])

    await navButton(page, 'Glossary').click()
    await expect(frame(page)).toBeHidden()
    await expect(basisFrame(page)).toBeHidden()
    await navButton(page, 'In Practice').click()
    await expect(basisFrame(page)).toBeVisible()
    await navButton(page, 'CLNDR').click()
    await expect(frame(page)).toBeVisible()
    await page.waitForTimeout(500)
    expect([loads.basis.length, loads.clndr.length]).toEqual([1, 1])
  })

  test('reduced motion: the poster and no .riv, reduce=1 until View motion, and the consent holds for the visit', async ({ page }) => {
    const rivs = []
    page.on('request', (r) => { if (r.url().includes('clndrTitle.riv')) rivs.push(r.url()) })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#/in-practice/clndr')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('img[src="/fallBacks/clndrTitleDarkMode.svg"]')).toBeVisible()

    const reduced = embedSrc(CLNDR, { ...BASE, reducedMotion: true })
    const consented = embedSrc(CLNDR, { ...BASE, reducedMotion: true, consented: true })
    await expect(frame(page)).toHaveAttribute('src', reduced)
    const viewMotion = page.getByRole('region', { name: 'CLNDR', exact: true }).getByRole('button', { name: 'View motion' })
    await viewMotion.click()
    await expect(viewMotion).toHaveAttribute('aria-pressed', 'true')
    await expect(frame(page)).toHaveAttribute('src', consented)

    // It survives another leaf, another section, and a preset.
    await navButton(page, 'Basis').click()
    await navButton(page, 'Glossary').click()
    await navButton(page, 'In Practice').click()
    await navButton(page, 'CLNDR').click()
    await expect(frame(page)).toHaveAttribute('src', consented)
    await page.getByRole('button', { name: 'Snappy' }).first().click()
    await expect(frame(page)).toHaveAttribute('src', embedSrc(CLNDR, { ...BASE, preset: 'snappy', reducedMotion: true, consented: true }))
    expect(rivs).toEqual([])
  })

  test('no View motion control without the preference, and the title plays', async ({ page }) => {
    await page.goto('/#/in-practice/clndr')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'View motion' })).toHaveCount(0)
    const title = page.getByRole('heading', { level: 2, name: 'CLNDR, studio booking' })
    await expect(title.locator('canvas')).toBeVisible()
    await expect(title.locator('img')).toHaveCount(0, { timeout: 30_000 })
  })

  // The embed picks its layout by the frame's width, with breaks at 560 and 660
  // px, so these are part of the contract: a column change that moves one of
  // them can drop a window to another layout.
  test("the frame is the contract's width at each window, and shares it with the title and the box", async ({ page }) => {
    // Layout only: reduced motion keeps the art from competing with eight
    // resizes, and one evaluate per read needs no stable frame from a canvas.
    test.setTimeout(60_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/in-practice/clndr')
    await expect(frame(page)).toBeVisible({ timeout: 30_000 })
    const read = () => frame(page).evaluate((el) => {
      const article = el.closest('article')
      const width = (node) => Math.round(node.getBoundingClientRect().width)
      return {
        frame: width(el),
        height: Math.round(el.getBoundingClientRect().height),
        box: width(article.querySelector('section')),
        title: width(article.querySelector('h2')),
      }
    })
    const WIDTHS = { 1000: 476, 1120: 420, 1280: 580, 1360: 660, 1440: 740, 1536: 836, 1600: 878, 1728: 878 }
    for (const [windowWidth, width] of Object.entries(WIDTHS)) {
      await page.setViewportSize({ width: Number(windowWidth), height: 900 })
      // The box and the heading are the frame plus its two 1 px borders.
      await expect.poll(read, { message: `window ${windowWidth}` })
        .toEqual({ frame: width, height: 820, box: width + 2, title: width + 2 })
    }
  })

  for (const theme of THEMES) {
    test(`the CLNDR page passes axe in ${theme} (the frame itself is the live spec's)`, async ({ page, context }) => {
      await seedStorage(context, { 'cadence-theme': theme })
      await page.goto('/#/in-practice/clndr')
      await expect(frame(page)).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('[data-testid="clndr-frame"]')
        .analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }
})
