// Measure (#/tools, build-order item 8): the reverse-engineering page. Runs
// against built output through the Worker like the rest of the suite.
//
// The item's exit criteria are the tests here: the ground-truth self-test
// passes on at least two presets from inside the page (the site's own
// samples: traces recorded once from the built site's Button with known
// tokens live, fitted live on click; public/measure-samples/*.json), and a
// recording never leaves the browser (the network log during a file-input
// run holds nothing but the video element's blob: object URL). The
// file-input test is the one that exercises the decoder, on the repo's own
// WebM under e2e/fixtures; the samples exercise the fit.
//
// Decoding runs at quarter speed twice (region pass, trace pass), so a
// two-second recording takes roughly fifteen seconds to measure; the waits
// are sized for that, not for the fit.
import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { seedStorage, INTRO_SEEN } from './helpers'

// Done, and decoded whole: the decoder retries at slower rates under load,
// and a run that still dropped frames is not a measurement to assert on.
const DONE = '[data-testid="status"][data-state="done"][data-dropped="0"]'
const MEASURE_TIMEOUT = 90_000

async function openMeasure(page) {
  await page.goto('/#/tools/measure')
  await expect(page.getByRole('heading', { level: 2, name: 'Measure' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('sample-standard')).toBeVisible()
}

// The first transition card's fit, as the page states it.
async function pressDown(page) {
  const card = page.getByTestId('transition-0')
  await expect(card).toBeVisible()
  const [curve, ms, band, frames, confidence, indistinct] = await Promise.all(
    ['curve', 'ms', 'band', 'frames', 'confidence', 'indistinct'].map(a => card.getAttribute(`data-${a}`)),
  )
  const [lo, hi] = band.split('-').map(Number)
  return { curve, ms: Number(ms), lo, hi, frames: Number(frames), confidence, indistinct: indistinct.split(',') }
}

test.describe('measure', () => {
  // The decoder replays the file at 0.25x, then 0.1x, then 0.0625x until no
  // frame drops, twice (region pass, trace pass). On a machine running six
  // workers that is minutes, not the default 30 seconds, and it is the
  // design: a loaded machine pays in time rather than in a partial read.
  // Serial, so this file's decodes never compete with each other for the
  // presenter (three at once under six workers dropped frames at every
  // rate); the other spec files still run alongside.
  test.describe.configure({ timeout: 300_000, mode: 'serial' })

  test('the self-test recovers the Standard press: standard, inside the band, nothing else in tolerance', async ({ page }) => {
    await openMeasure(page)
    await page.getByTestId('sample-standard').click()
    await expect(page.locator(DONE)).toBeVisible({ timeout: MEASURE_TIMEOUT })

    // A stored trace says so in the status line, never "decoded".
    await expect(page.getByTestId('status')).toContainText('recorded 2026-09-05')
    await expect(page.getByTestId('status')).toContainText('fitted now')

    const fit = await pressDown(page)
    expect(fit.curve).toBe('standard')
    expect(fit.lo).toBeLessThanOrEqual(100)
    expect(fit.hi).toBeGreaterThanOrEqual(100)
    expect(fit.indistinct).toContain('standard')
    expect(fit.frames).toBeGreaterThanOrEqual(5)

    // The card says what the sample was recorded at, beside the fit.
    await expect(page.getByTestId('transition-0').getByText('Recorded at')).toBeVisible()
    await expect(page.getByTestId('transition-0').getByText('100ms', { exact: false })).toBeVisible()
  })

  test('the self-test recovers the Cinematic press: enter, 200ms inside the band', async ({ page }) => {
    await openMeasure(page)
    await page.getByTestId('sample-cinematic').click()
    await expect(page.locator(DONE)).toBeVisible({ timeout: MEASURE_TIMEOUT })

    const fit = await pressDown(page)
    expect(fit.curve).toBe('enter')
    expect(fit.lo).toBeLessThanOrEqual(200)
    expect(fit.hi).toBeGreaterThanOrEqual(200)
    expect(fit.frames).toBeGreaterThanOrEqual(10)
    // Two transitions: the press and the release, separated by the hold.
    await expect(page.getByTestId('transition-1')).toBeVisible()
  })

  test('a dropped recording never leaves the browser', async ({ page }) => {
    await openMeasure(page)
    // Let the chunk and the samples list settle before the log is watched.
    await page.waitForLoadState('networkidle')

    const requests = []
    page.on('request', r => requests.push(r.url()))
    await page.getByTestId('file').setInputFiles(join(process.cwd(), 'e2e', 'fixtures', 'standard-press.webm'))
    // While the decoder runs the page says so, with the site's Spinner ahead
    // of the words: the title above holds still and must not read as dead.
    await expect(page.getByTestId('status')).toContainText('Just a moment')
    await expect(page.getByTestId('status').locator('svg')).toBeVisible()
    await expect(page.locator(DONE)).toBeVisible({ timeout: MEASURE_TIMEOUT })

    // blob: is the video element reading its own object URL. Anything else
    // during the run would be the recording, or something about it, leaving.
    expect(requests.filter(u => !u.startsWith('blob:'))).toEqual([])

    // The fit itself is the self-test's business (above); here it only has
    // to be the same answer the sample button gives, loosely. Standard, not
    // Snappy: at four frames Snappy's answer moved between runs under six
    // parallel workers (overshoot, then linear with overshoot outside
    // tolerance), which is the four-frame limitation the decision record
    // states, not a thing to pin a network assertion to.
    const fit = await pressDown(page)
    expect(fit.indistinct).toContain('standard')
    expect(fit.lo).toBeLessThanOrEqual(100)
    expect(fit.hi).toBeGreaterThanOrEqual(100)
  })

  test('an indistinct fit offers its candidates with a Button on each, and the export records the choice', async ({ page }) => {
    await openMeasure(page)
    // Standard is five frames: the wide floor keeps two neighbors in, so the
    // chooser appears.
    await page.getByTestId('sample-standard').click()
    await expect(page.locator(DONE)).toBeVisible({ timeout: MEASURE_TIMEOUT })
    const fit = await pressDown(page)
    expect(fit.indistinct.length).toBeGreaterThan(1)

    const chooser = page.getByTestId('candidates')
    await expect(chooser).toBeVisible()
    // One card per indistinct curve, the winner checked, a real Button in each.
    for (const name of fit.indistinct) await expect(page.getByTestId(`candidate-${name}`)).toBeVisible()
    await expect(page.getByTestId(`candidate-${fit.curve}`).getByRole('radio')).toBeChecked()
    expect(await chooser.getByRole('button', { name: 'Press me' }).count()).toBe(fit.indistinct.length)

    // Choose a runner-up by eye; the file carries that curve and says so.
    const other = fit.indistinct.find(n => n !== fit.curve)
    await page.getByTestId(`candidate-${other}`).getByRole('radio').check()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download').click(),
    ])
    const doc = JSON.parse(await new Response(await download.createReadStream()).text())
    const slot = Object.keys(doc.easing)[0]
    expect(doc.note).toContain(`${other} was chosen by eye`)
    expect(doc.note).toContain(fit.curve)
    // The chosen curve's numbers, not the winner's.
    const NAMED = { linear: '0, 0, 1, 1', standard: '0.4, 0, 0.2, 1', enter: '0, 0, 0.2, 1', exit: '0.4, 0, 1, 1', overshoot: '0.34, 1.56, 0.64, 1' }
    expect(doc.easing[slot]).toBe(`cubic-bezier(${NAMED[other]})`)
  })

  test('the export downloads a flat token file with only the two measured keys', async ({ page }) => {
    await openMeasure(page)
    await page.getByTestId('sample-cinematic').click()
    await expect(page.locator(DONE)).toBeVisible({ timeout: MEASURE_TIMEOUT })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download').click(),
    ])
    expect(download.suggestedFilename()).toBe('cadence.measured.json')
    const text = await new Response(await download.createReadStream()).text()
    const doc = JSON.parse(text)
    expect(doc.label).toBe('Measured')
    expect(Object.keys(doc.duration)).toHaveLength(1)
    expect(Object.keys(doc.easing)).toEqual(['enter'])
    expect(doc.easing.enter).toBe('cubic-bezier(0, 0, 0.2, 1)')
  })

  test('the Tools nav section routes to Measure and the tool bar rails', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Tools' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Measure' })).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/#\/tools$/)
    // The Measure leaf is current, and the Token Lab tool bar is set aside.
    await expect(page.getByLabel('Tools and categories').getByRole('button', { name: 'Measure' })).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('button[aria-controls="tokens-drawer"]')).toBeVisible()

    // A stale tail fails soft to Measure.
    await page.goto('/#/tools/nonsense')
    await expect(page.getByRole('heading', { level: 2, name: 'Measure' })).toBeVisible({ timeout: 30_000 })
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

    await page.goto('/#/tools/measure')
    await expect(page.getByRole('heading', { level: 2, name: 'Measure' })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('img[src="/fallBacks/measureLightMode.svg"]')).toBeVisible()
    await expect(page.locator('h2 canvas')).toHaveCount(0)
    const posterOk = await page.evaluate(async () => (await fetch(document.querySelector('img[src^="/fallBacks/measure"]').src)).ok)
    expect(posterOk).toBe(true)
    expect(rivFetches).toEqual([])
    await context.close()
  })
})
