// Theme and media emulation — docs/deploy-verification-matrix.md, "Theme and
// media emulation" T1 rows. Contexts are created per-combination because
// colorScheme/contrast must be set before the pre-paint script in index.html
// runs; that script is the code under test.
import { test, expect } from '@playwright/test'
import { readToken, seedStorage, INTRO_SEEN, stubAnalyticsBeacon } from './helpers'

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
  // page.emulateMedia, NOT test.use({ reducedMotion: 'reduce' }): the context
  // option silently fails to apply in this suite (verified empirically
  // 2026-07-17: matchMedia('(prefers-reduced-motion: reduce)') stays false
  // under the option, flips true under emulateMedia). Every test in this block
  // depends on the emulation being real, so it is applied before navigation.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

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

  test('expanded cards offer the View motion control in the first view, off by default', async ({ page, context }) => {
    // The 2026-07-17 decision: library demos flatten under OS reduce-motion
    // like any other UI, and each card offers explicit playback governing
    // BOTH demo layers. The control must be reachable without switching to
    // the UI view (discoverability was the first review's finding). P13
    // Systematization is the probe because it formerly carried a blanket
    // respectReducedMotion={false} opt-out; the control must govern it too.
    await seedStorage(context, INTRO_SEEN)
    await page.goto('/#/principles')
    await page.getByRole('heading', { level: 3, name: 'Systematization' }).click()
    const control = page.getByRole('button', { name: 'View motion' })
    await expect(control).toBeVisible()
    await expect(control).toHaveAttribute('aria-pressed', 'false')
    await control.click()
    await expect(control).toHaveAttribute('aria-pressed', 'true')
  })

  test('P17 Reduced Motion also carries the control; its demo keeps its own toggle', async ({ page, context }) => {
    // The control on P17 governs the Rive animation layer; the UI demo stays
    // exempt from the token scope because its local Reduce toggle owns it.
    await seedStorage(context, INTRO_SEEN)
    await page.goto('/#/principles')
    await page.getByRole('heading', { level: 3, name: 'Reduced Motion' }).click()
    await expect(page.getByRole('button', { name: 'View motion' })).toBeVisible()
  })

  test('the home page renders static posters and fetches no Rive at all', async ({ page }) => {
    // The 2026-07-18 poster upgrade: under reduce-motion the hero and the
    // bug-report button render per-theme SVGs instead of mounting canvases,
    // so no .riv and no WASM binary is ever requested on the home page. The
    // network assertion is the point: the posters are not just a visual
    // fallback, they remove the entire Rive payload for reduce users.
    const riveLoads = []
    page.on('request', (r) => {
      const u = r.url()
      if (u.endsWith('.riv') || u.endsWith('.wasm')) riveLoads.push(u)
    })
    await page.goto('/')
    await expect(page.locator('img[src*="/fallBacks/hero3"]')).toBeVisible()
    await expect(page.locator('img[src*="/fallBacks/problems"]')).toBeVisible()
    expect(riveLoads).toEqual([])
  })

  test('the tool titles and the Enter button render their posters', async ({ page }) => {
    await page.goto('/#/token-lab')
    await expect(page.locator('img[src*="/fallBacks/tokenLab"]')).toBeVisible()
    await page.goto('/#/motion-tiles')
    await expect(page.locator('img[src*="/fallBacks/motionTilesOverview"]')).toBeVisible()
    await expect(page.locator('img[src*="/fallBacks/enter"]')).toBeVisible()
  })

  test('the mobile gate renders its posters under reduce-motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/')
    await expect(page.locator('img[src*="/fallBacks/hero3Mobile"]')).toBeVisible()
    await expect(page.locator('img[src*="/fallBacks/singleLineLogo"]')).toBeVisible()
  })

  test('the Motion Tiles field starts paused under reduce-motion: its button reads Play', async ({ page }) => {
    // The 2026-07-17 Rive policy: demonstration surfaces start paused behind
    // an explicit play affordance. The field's clock defaults to paused (rest
    // state, progress 0) and the existing Pause/Play control is the
    // affordance; a press overrides in either direction.
    await page.goto('/#/motion-tiles/grid')
    const playButton = page.getByRole('button', { name: 'Play', exact: true })
    await expect(playButton).toBeVisible()
    await expect(playButton).toHaveAttribute('aria-pressed', 'true')
    await playButton.click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveAttribute('aria-pressed', 'false')
  })

  test('grid icons start paused under reduce-motion: the header button reads Play', async ({ page, context }) => {
    // The universal pause defaults on under the OS preference; the existing
    // Pause/Play button is the explicit-playback affordance and stays a live
    // override in both directions.
    await seedStorage(context, INTRO_SEEN)
    await page.goto('/#/principles')
    const pauseButton = page.getByRole('button', { name: 'Play', exact: true })
    await expect(pauseButton).toBeVisible()
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'true')
    await pauseButton.click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('forced colors (Windows High Contrast Mode)', () => {
  // page.emulateMedia({ forcedColors: 'active' }), NOT test.use: the context
  // option is unreliable in this suite for the same reason reducedMotion is
  // (see the reduced-motion block above), so the emulation is applied before
  // navigation. forced-colors erases box-shadow, so the two state cues that
  // rebuild themselves as outlines are what these tests pin. The manual pass
  // proved by hand that they survive (2026-07-16 checklist), but nothing
  // stopped a refactor from dropping either @media (forced-colors: active)
  // block. Assert outline-style and outline-width, never color: forced colors
  // substitutes system colors the test cannot predict, and the mechanism (an
  // outline exists where a box-shadow would have been erased) is the thing
  // worth pinning.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
  })

  test('the nav active-leaf marker rebuilds its cue as a solid 2px outline', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    // The active category leaf carries .rowActive, whose selection marker is an
    // inset box-shadow outside forced colors. forced-colors erases that; the
    // @media block in NavColumn.module.css restores it as a Highlight outline.
    // Deleting that block leaves the leaf with no outline at all, so both the
    // style and the width assertions fail.
    const activeLeaf = page.getByRole('button', { name: 'Press & State' })
    await expect(activeLeaf).toHaveAttribute('aria-current', 'true')
    await expect(activeLeaf).toHaveCSS('outline-style', 'solid')
    await expect(activeLeaf).toHaveCSS('outline-width', '2px')
  })

  test('the Token Lab connection ring rebuilds its cue as a solid 2px outline when raised by keyboard', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    // Duration starts collapsed (2026-07-21 section order); open it first.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    // Raise the connection highlight the keyboard way: focusing a token slider
    // sustains the highlight on the demo groups it drives (the keyboard-parity
    // onFocus behavior). duration.base drives the Card demo, which renders on
    // the Press & State page.
    await page.getByRole('slider', { name: 'duration.base' }).focus()
    const ring = page.locator('[class*="demoGroupHighlighted"] [class*="demoMain"]').first()
    await expect(ring).toBeVisible()
    // The 2px width is the discriminating assertion. The base rule already
    // draws a 1px solid accent outline, so outline-style stays solid even if
    // the @media block is removed; only the width proves the forced-colors
    // block (which thickens it to 2px Highlight) actually ran.
    await expect(ring).toHaveCSS('outline-style', 'solid')
    await expect(ring).toHaveCSS('outline-width', '2px')
  })
})

test('the mobile gate binds the homogenized hero file console-clean in HC-dark', async ({ browser }) => {
  // 2026-07-18: heromobile.riv was re-exported with the same four homogenized
  // theme instances as hero3.riv, and MobileGate dropped the old runtime
  // stroke/fill flip. HC-dark is the probe because it is the theme the flip
  // existed for: the contrastDark instance must bind and paint console-clean.
  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    colorScheme: 'dark',
    contrast: 'more',
  })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await stubAnalyticsBeacon(context)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast-dark')
  // Generous timeout: this is a cold context fetching two .riv files through
  // the built Worker; the first run of this test flaked at the default 5s.
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 })
  expect(errors).toEqual([])
  await context.close()
})

test('the View motion gate never renders without the OS reduce-motion preference', async ({ page, context }) => {
  await seedStorage(context, INTRO_SEEN)
  await page.goto('/#/principles')
  await page.getByRole('heading', { level: 3, name: 'Systematization' }).click()
  await page.getByRole('button', { name: 'UI', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View motion' })).toHaveCount(0)
})
