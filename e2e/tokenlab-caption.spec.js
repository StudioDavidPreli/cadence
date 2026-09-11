// The caption slot under each Token Lab demo (2026-09-11).
// docs/decisions/demo-caption-slot-2026-09-11.md. DemoWrapper shows one of
// three captions: the demo's instruction, the amber "token unused" note, or
// the off-system note. They used to be conditionally rendered, so a swap
// between faces of different line counts changed the demo's height and moved
// every demo under it. These pin the fix on built output: the slot holds the
// tallest face's height in every state, and exactly one face is visible.
import { test, expect } from '@playwright/test'

// Carousel's caption wraps to two lines and does not consume duration.base,
// so stepping that slider swaps its two-line instruction for the one-line
// note. That is the pair the 14px reflow was measured on. Gesture carries two
// demos: Carousel first, Reorder under it.
async function boxes(page) {
  return page.evaluate(() => {
    const mains = [...document.querySelectorAll('[class*="demoMain"]')]
    return {
      caption: +mains[0].querySelector('[class*="demoCaption"]').getBoundingClientRect().height.toFixed(2),
      carousel: +mains[0].getBoundingClientRect().height.toFixed(2),
      // The demo below it: the reflow showed up as this moving up and back.
      below: +mains[1].getBoundingClientRect().top.toFixed(2),
    }
  })
}

// The Carousel's slide canvases size themselves a beat after the chunk loads,
// which moves the demo's own box for reasons that have nothing to do with the
// caption. Wait for two identical reads before taking a baseline, or the
// comparison races that settling instead of measuring the swap.
async function settled(page) {
  let last = null
  for (let i = 0; i < 40; i++) {
    const now = await boxes(page)
    if (last && JSON.stringify(now) === JSON.stringify(last)) return now
    last = now
    await page.waitForTimeout(150)
  }
  throw new Error('demo geometry never settled')
}

// Every demo now carries all three faces, so a bare text locator matches the
// hidden copies under every other demo too. The visible filter is the point of
// the assertion anyway: one face showing, everywhere else hidden.
const visibleText = (page, text) => page.getByText(text).filter({ visible: true })

test.describe('demo caption slot', () => {
  test('a caption swap leaves the demo, and the demo below it, where they were', async ({ page }) => {
    await page.goto('/#/token-lab/gesture')
    await expect(page.getByText('Drag to advance')).toBeVisible()
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    const before = await settled(page)

    // Focus is what sets the active token for the keyboard path (the slider's
    // onFocus); a click would set it on pointerdown and clear it on pointerup.
    const slider = page.getByRole('slider', { name: 'duration.base' })
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(visibleText(page, 'Token unused by present components.')).toHaveCount(1)

    expect(await boxes(page)).toEqual(before)
  })

  test('exactly one face is visible, and the hidden faces keep their box', async ({ page }) => {
    await page.goto('/#/token-lab/gesture')
    await expect(page.getByText('Drag to advance')).toBeVisible()
    const read = () => page.evaluate(() =>
      [...document.querySelector('[class*="demoCaption"]').children].map((p) => {
        const cs = getComputedStyle(p)
        return { visibility: cs.visibility, display: cs.display }
      }))

    // Idle: the instruction shows, the two notes are hidden but still boxes.
    // display is read, not the hidden attribute: [hidden] is display: none by
    // default and the slot overrides it, which is the whole mechanism.
    expect(await read()).toEqual([
      { visibility: 'visible', display: 'block' },
      { visibility: 'hidden', display: 'block' },
      { visibility: 'hidden', display: 'block' },
    ])

    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    const slider = page.getByRole('slider', { name: 'duration.base' })
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(visibleText(page, 'Token unused by present components.')).toHaveCount(1)
    expect(await read()).toEqual([
      { visibility: 'hidden', display: 'block' },
      { visibility: 'visible', display: 'block' },
      { visibility: 'hidden', display: 'block' },
    ])

    // A hidden face is out of the accessibility tree on visibility alone, so
    // the instruction is not readable while the note is showing.
    await expect(visibleText(page, 'Drag to advance')).toHaveCount(0)
  })

  test('the detached note holds the demo height too', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    await page.getByRole('button', { name: 'Show code' }).first().click()
    await page.locator('span[title^="Click to type"]', { hasText: 'tokens.duration.fast' }).last().click()
    const input = page.getByLabel('Value for tokens.duration.fast')
    await input.fill('0.25')
    await input.press('Enter')

    const button = page.locator('[class*="demoMain"]').first()
    const before = await button.evaluate((el) => +el.getBoundingClientRect().height.toFixed(2))

    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    const slider = page.getByRole('slider', { name: 'duration.fast' })
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(visibleText(page, 'Off-system in this demo.')).toHaveCount(1)

    expect(await button.evaluate((el) => +el.getBoundingClientRect().height.toFixed(2))).toBe(before)
  })
})
