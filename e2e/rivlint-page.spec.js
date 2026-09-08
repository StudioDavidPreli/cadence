// rivLint (#/tools/rivlint, build-order item 9): the public .riv linter, the
// page; e2e/rivlint.spec.js is the site's own contract gate on the same read. Runs
// against built output through the Worker like the rest of the suite.
//
// The item's exit criteria are the tests here: the site's own files read
// clean of fail-level findings and match the reports the page made from
// them earlier (the samples, public/rivlint-samples), a dropped file never
// leaves the browser (the network log during a file-input lint is empty
// outright: the reader takes bytes, not a URL, and the asset CDN is off),
// the download is the report shape, and the preview holds still under
// reduced motion. The fail-level rules themselves are unit-tested against
// raw runtime reads (src/components/RivLint/lintModel.test.js); a deliberately
// broken file is not committed to the public repo.
import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { seedStorage, INTRO_SEEN } from './helpers'

const DONE = '[data-testid="status"][data-state="done"]'
const ICON = join(process.cwd(), 'public', 'rive', 'principles_icon11.riv')

async function openLint(page) {
  await page.goto('/#/tools/rivlint')
  await expect(page.getByRole('heading', { level: 2, name: 'rivLint' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('sample-icon')).toBeVisible()
}

test.describe('rivLint', () => {
  test('the Tools nav routes to rivLint and the tool bar rails', async ({ page }) => {
    await openLint(page)
    const row = page.getByRole('button', { name: 'rivLint', exact: true })
    await expect(row).toHaveAttribute('aria-current', 'true')
    // The sliders drive nothing here; the tool bar collapses to its rail.
    await expect(page.getByRole('button', { name: /Tokens/ }).first()).toBeVisible()
    // The Measure leaf is the sibling and routes back.
    await page.getByRole('button', { name: 'Measure', exact: true }).click()
    await expect(page).toHaveURL(/#\/tools$/)
    await page.goBack()
    await expect(page).toHaveURL(/#\/tools\/rivlint$/)
  })

  test('switching leaves never remounts the titles (the fallback-flash fix)', async ({ page }) => {
    await openLint(page)
    await expect(page.locator('h2 canvas')).toHaveCount(1)
    // Tag rivLint's title canvas, switch to Measure and back, and assert the
    // SAME element survived: a remount (the flash David caught 2026-09-08,
    // the Glossary's 2026-09-05 bug again) would produce a fresh canvas
    // without the tag. Both leaves stay mounted once visited, so two title
    // canvases exist afterwards regardless of which leaf shows.
    await page.evaluate(() => { document.querySelector('h2 canvas').dataset.rivlintTag = 'survivor' })
    await page.getByRole('button', { name: 'Measure', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Measure' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('heading', { level: 2, name: 'rivLint' })).toBeHidden()
    await page.getByRole('button', { name: 'rivLint', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'rivLint' })).toBeVisible()
    await expect(page.locator('canvas[data-rivlint-tag="survivor"]')).toHaveCount(1)
    await expect(page.locator('h2 canvas')).toHaveCount(2)
  })

  test('a sample reads one of the site\'s own files and matches its earlier report', async ({ page }) => {
    await openLint(page)
    await page.getByTestId('sample-icon').click()
    await expect(page.locator(DONE)).toBeVisible({ timeout: 30_000 })

    // The handoff facts lead: the default artboard and its view model.
    const handoff = page.getByTestId('handoff')
    await expect(handoff).toHaveAttribute('data-default-artboard', 'SolidDrawing')
    await expect(handoff).toContainText('ViewModel1')
    await expect(handoff).toContainText('colorPropertyOutline')

    // No fail-level finding on a shipped file; the sample is checked against
    // the report the page produced from it earlier, as a contract.
    await expect(page.getByTestId('findings')).toHaveAttribute('data-fails', '0')
    const result = page.getByTestId('compare-result')
    await expect(result).toHaveAttribute('data-pass', 'true')
    await expect(result).toHaveAttribute('data-failures', '0')
    await expect(page.getByTestId('cannot-see')).toContainText('does not expose')
  })

  test('a dropped file never leaves the browser', async ({ page }) => {
    await openLint(page)
    // Warm the runtime on a sample first so the WASM fetch (this origin, and
    // never carrying the file) is behind us, then watch the log.
    await page.getByTestId('sample-title').click()
    await expect(page.locator(DONE)).toBeVisible({ timeout: 30_000 })
    await page.waitForLoadState('networkidle')

    const requests = []
    page.on('request', r => requests.push(r.url()))
    await page.getByTestId('file').setInputFiles(ICON)
    await expect(page.getByTestId('status')).toContainText('Just a moment')
    await expect(page.locator(DONE)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('handoff')).toHaveAttribute('data-default-artboard', 'SolidDrawing')

    // Empty outright: bytes go in as a buffer, the CDN is off, the loader
    // claims every asset. Not even a blob: URL.
    expect(requests).toEqual([])
  })

  test('the compare zone diffs the same file against itself as no difference, and a report as a passing contract', async ({ page }) => {
    await openLint(page)
    await page.getByTestId('file').setInputFiles(ICON)
    await expect(page.locator(DONE)).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('compare-file').setInputFiles(ICON)
    const result = page.getByTestId('compare-result')
    await expect(result).toHaveAttribute('data-entries', '0', { timeout: 30_000 })
    await expect(result).toContainText('No structural difference')

    // Contract mode against the page's own download of this file.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download').click(),
    ])
    expect(download.suggestedFilename()).toBe('principles_icon11.report.json')
    const reportPath = await download.path()
    await page.getByRole('button', { name: 'Clear' }).click()
    await page.getByTestId('compare-file').setInputFiles(reportPath)
    await page.getByLabel(/Treat it as the contract/).check()
    await expect(result).toHaveAttribute('data-pass', 'true', { timeout: 30_000 })
  })

  test('reduced motion: the preview draws one frame and waits for play', async ({ browser }) => {
    const context = await browser.newContext()
    await seedStorage(context, INTRO_SEEN)
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openLint(page)
    await page.getByTestId('sample-icon').click()
    await expect(page.locator(DONE)).toBeVisible({ timeout: 30_000 })
    const preview = page.getByTestId('preview')
    await expect(preview).toHaveAttribute('data-playing', 'false')
    await expect(page.getByTestId('preview-play')).toHaveAttribute('aria-pressed', 'false')
    await expect(preview).toContainText('Reduced motion')
    await page.getByTestId('preview-play').click()
    await expect(preview).toHaveAttribute('data-playing', 'true')
    await context.close()
  })

  test('reduced motion swaps the title canvas for its SVG poster', async ({ browser }) => {
    const context = await browser.newContext()
    await seedStorage(context, { 'cadence-theme': 'light', ...INTRO_SEEN })
    const page = await context.newPage()
    // page.emulateMedia, not test.use({ reducedMotion }): the latter silently
    // no-ops in this suite (playwright-mcp-verification-quirks).
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const rivFetches = []
    page.on('request', r => { if (r.url().endsWith('.riv')) rivFetches.push(r.url()) })

    await page.goto('/#/tools/rivlint')
    await expect(page.getByRole('heading', { level: 2, name: 'rivLint' })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('img[src="/fallBacks/lintLightMode.svg"]')).toBeVisible()
    await expect(page.locator('h2 canvas')).toHaveCount(0)
    const posterOk = await page.evaluate(async () => (await fetch(document.querySelector('img[src^="/fallBacks/lint"]').src)).ok)
    expect(posterOk).toBe(true)
    expect(rivFetches).toEqual([])
    await context.close()
  })

  test('the title binds the theme\'s own instance and paints', async ({ page }) => {
    await openLint(page)
    // The scene mounts a canvas inside the h2; the plain-word fallback is
    // gone once the runtime has loaded and the view model is bound.
    await expect(page.locator('h2 canvas')).toHaveCount(1)
    await expect(page.locator('h2').getByText('rivLint', { exact: true })).toHaveCount(1)
    // The poster stood in until the first paint and has handed off: no
    // image left in the heading on the motion path (David's call,
    // 2026-09-08; before that the stand-in was the plain word).
    await expect(page.locator('h2 img')).toHaveCount(0)
  })

  test('if the title file never loads, the poster stays and no plain word appears', async ({ page }) => {
    await page.route('**/rive/rivlintTitles.riv', route => route.abort())
    await page.goto('/#/tools/rivlint')
    await expect(page.getByRole('heading', { level: 2, name: 'rivLint' })).toBeVisible({ timeout: 30_000 })
    const poster = page.locator('h2 img[src^="/fallBacks/lint"]')
    await expect(poster).toBeVisible()
    // The runtime never reports a load, so the poster is the title for good;
    // the accessible name is the only text in the heading.
    await page.waitForTimeout(1500)
    await expect(poster).toBeVisible()
    await expect(page.locator('h2').getByText('rivLint', { exact: true })).toHaveCount(1)
  })
})
