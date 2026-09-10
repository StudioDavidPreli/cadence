// Reorder (2026-09-10, build-order item 13): one list, two input modes. The
// keyboard path is timed; the pointer path is input until release and then a
// spring from the hand's velocity. These pin both on built output: a keyboard
// grab-move-drop, a pointer drag that commits, one released short of the
// threshold that does not, Escape mid-drag restoring the order, the spring
// toggle's drop still landing, and the item 11 rule that a preset switch and
// a slider edit leave the rows where they are.
import { test, expect } from '@playwright/test'

const LIST = 'ul[aria-label="Presets"]'

// The rows never change DOM order; their visual order is where each one sits
// on screen. Sorting by top edge reads the order the way a user does.
function visualOrder(page) {
  return page.evaluate((sel) =>
    [...document.querySelectorAll(`${sel} > li`)]
      .map((li) => ({ label: li.querySelector(':scope > span').textContent, top: li.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top)
      .map((r) => r.label),
  LIST)
}

// Row pitch as the component measures it: flow positions, untouched by the
// transforms that move the rows on screen.
function pitch(page) {
  return page.evaluate((sel) => {
    const [a, b] = document.querySelectorAll(`${sel} > li`)
    return b.offsetTop - a.offsetTop
  }, LIST)
}

async function openGesture(page) {
  await page.goto('/#/token-lab/gesture')
  await expect(page.getByRole('button', { name: 'Reorder Snappy' })).toBeVisible()
  await expect.poll(() => pitch(page)).toBeGreaterThan(0)
}

// page.mouse does not scroll a target into view the way click() does, and the
// demo column clips below the Carousel at Playwright's default viewport, so
// the handle is brought on screen first or the pointer lands on the shell.
async function handleCenter(page, name) {
  const handle = page.getByRole('button', { name })
  await handle.scrollIntoViewIfNeeded()
  const box = await handle.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// A real pointer drag: down on the handle, travel in steps, release. Framer
// starts the drag after a few px, so the first step is never the whole move.
async function drag(page, name, dy, { release = true } = {}) {
  const { x, y } = await handleCenter(page, name)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + dy, { steps: 12 })
  if (release) await page.mouse.up()
}

test.describe('reorder', () => {
  test('keyboard: Space grabs, ArrowDown moves, Space drops, and the order commits', async ({ page }) => {
    await openGesture(page)
    const handle = page.getByRole('button', { name: 'Reorder Standard' })
    await handle.focus()
    await handle.press('Space')
    await expect(handle).toHaveAttribute('aria-pressed', 'true')
    await handle.press('ArrowDown')
    await handle.press('Space')
    await expect(handle).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => visualOrder(page)).toEqual(['Snappy', 'Cinematic', 'Standard', 'Explore'])
    // The handle never remounted: it still has focus after its row moved.
    await expect(handle).toBeFocused()
  })

  test('pointer: a drag of two rows commits, and the row settles into its slot', async ({ page }) => {
    await openGesture(page)
    const p = await pitch(page)
    await drag(page, 'Reorder Snappy', 2 * p)
    await expect.poll(() => visualOrder(page)).toEqual(['Standard', 'Cinematic', 'Snappy', 'Explore'])
    await expect(page.getByRole('button', { name: 'Reorder Snappy' })).toHaveAttribute('aria-pressed', 'false')
    // Settled means the row's translate stopped where the slot is: two
    // pitches down from its DOM position, once the settle is done.
    await expect.poll(() => page.evaluate((sel) => {
      const [a] = document.querySelectorAll(`${sel} > li`)
      return Math.round(new DOMMatrix(getComputedStyle(a).transform).m42)
    }, LIST), { timeout: 4000 }).toBe(2 * p)
  })

  test('pointer: a drag released short of half a pitch returns to its own slot', async ({ page }) => {
    await openGesture(page)
    const p = await pitch(page)
    await drag(page, 'Reorder Standard', Math.floor(p * 0.3))
    await expect.poll(() => visualOrder(page)).toEqual(['Snappy', 'Standard', 'Cinematic', 'Explore'])
  })

  test('pointer: Escape mid-drag restores the order and ends the hold', async ({ page }) => {
    await openGesture(page)
    const p = await pitch(page)
    await drag(page, 'Reorder Snappy', Math.round(1.5 * p), { release: false })
    // The rows made room while the hand held Snappy over the second slot.
    // 1.5 pitches rounds to two slots down, so Snappy is over the third.
    await expect.poll(() => visualOrder(page)).toEqual(['Standard', 'Cinematic', 'Snappy', 'Explore'])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Reorder Snappy' })).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => visualOrder(page)).toEqual(['Snappy', 'Standard', 'Cinematic', 'Explore'])
    // Releasing after the cancel is not a drop: nothing changes.
    await page.mouse.up()
    await page.waitForTimeout(300)
    expect(await visualOrder(page)).toEqual(['Snappy', 'Standard', 'Cinematic', 'Explore'])
    // A row can be picked up again: the drag session really ended.
    await drag(page, 'Reorder Explore', -p)
    await expect.poll(() => visualOrder(page)).toEqual(['Snappy', 'Standard', 'Explore', 'Cinematic'])
  })

  test('the spring toggle is present and a drop still lands with it on', async ({ page }) => {
    await openGesture(page)
    const p = await pitch(page)
    // Carousel carries the same toggle; scope to the Reorder label row.
    const labelRow = page.locator('[class*="demoLabelRow"]', { hasText: 'Reorder' })
    await labelRow.getByRole('button', { name: 'Spring motion off' }).click()
    await expect(labelRow.getByRole('button', { name: 'Spring motion on' })).toHaveAttribute('aria-pressed', 'true')
    await drag(page, 'Reorder Cinematic', -2 * p)
    await expect.poll(() => visualOrder(page)).toEqual(['Cinematic', 'Snappy', 'Standard', 'Explore'])
  })

  test('a preset switch and a slider edit leave the rows where they are', async ({ page }) => {
    await openGesture(page)
    const p = await pitch(page)
    await drag(page, 'Reorder Snappy', p)
    await expect.poll(() => visualOrder(page)).toEqual(['Standard', 'Snappy', 'Cinematic', 'Explore'])
    // The rows' own translates, not viewport positions: the column above
    // the list may reflow on a token change, and that is not the rows moving.
    const translates = () => page.evaluate((sel) =>
      [...document.querySelectorAll(`${sel} > li`)].map((li) => {
        const t = getComputedStyle(li).transform
        return t === 'none' ? 0 : Math.round(new DOMMatrix(t).m42)
      }), LIST)
    await page.waitForTimeout(800)
    const before = await translates()
    await page.getByRole('button', { name: 'Cinematic', exact: true }).click()
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    await page.getByRole('slider', { name: 'duration.base' }).press('ArrowRight')
    await page.waitForTimeout(400)
    expect(await translates()).toEqual(before)
    expect(await visualOrder(page)).toEqual(['Standard', 'Snappy', 'Cinematic', 'Explore'])
  })
})
