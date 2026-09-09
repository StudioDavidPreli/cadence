// Off-system edits: the code view as an input (2026-09-09).
// docs/decisions/off-system-edits-2026-09-09.md. The Token Lab snippet lets
// the reader replace a token read with a literal; that one demo drifts while
// the rest keep following the slider. These pin the whole loop on built
// output: the edit, the detached state under a drag, [ADOPT] moving the token,
// [RECONNECT] restoring the read, a preset load clearing everything, and the
// deviation appendix riding export and coming back through import.
import { test, expect } from '@playwright/test'
import { readToken } from './helpers'

// The Button snippet reads tokens.duration.fast twice (press and release). The
// second read is the release; either would do, since the override is per path.
async function openButtonCode(page) {
  await page.goto('/#/token-lab/press-state')
  await page.getByRole('button', { name: 'Show code' }).first().click()
  const block = page.locator('pre').first()
  await expect(block).toContainText('tokens.duration.fast')
  return block
}

async function typeLiteral(page, path, text) {
  await page.locator('span[title^="Click to type"]', { hasText: `tokens.${path}` }).last().click()
  const input = page.getByLabel(`Value for tokens.${path}`)
  await input.fill(text)
  await input.press('Enter')
}

test.describe('off-system edits', () => {
  test('a typed literal replaces the read, names the drift, and offers the two actions', async ({ page }) => {
    const block = await openButtonCode(page)
    await typeLiteral(page, 'duration.fast', '0.25')
    // Per path, so both reads of duration.fast show the literal.
    await expect(block.locator('[title^="Literal in place of tokens.duration.fast"]')).toHaveCount(2)
    await expect(block).toContainText('off-system: 0.25s, nearest duration.base (0.2s)')
    await expect(block.getByRole('button', { name: '[RECONNECT]' }).first()).toBeVisible()
    await expect(block.getByRole('button', { name: '[ADOPT]' }).first()).toBeVisible()
    // The token itself did not move: the demo drifted, not the system.
    await expect.poll(() => readToken(page, '--motion-duration-fast')).not.toBe('250ms')
  })

  test('an invalid draft holds the row with its reason', async ({ page }) => {
    const block = await openButtonCode(page)
    await page.locator('span[title^="Click to type"]', { hasText: 'tokens.duration.fast' }).last().click()
    const input = page.getByLabel('Value for tokens.duration.fast')
    await input.fill('fast')
    await input.press('Enter')
    await expect(block).toContainText('// Expected a number.')
    await expect(input).toBeVisible()
  })

  test('a drag of the overridden token leaves the demo detached, not highlighted', async ({ page }) => {
    await openButtonCode(page)
    await typeLiteral(page, 'duration.fast', '0.25')
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    const slider = page.getByRole('slider', { name: 'duration.fast' })
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(page.getByText('Off-system in this demo.')).toBeVisible()
    const buttonGroup = page.locator('[class*="demoGroup"]', { has: page.locator('[class*="demoLabel"]', { hasText: /^Button/ }) }).first()
    await expect(buttonGroup).not.toHaveClass(/demoGroupHighlighted/)
  })

  test('[ADOPT] moves the token to the literal and the read returns', async ({ page }) => {
    const block = await openButtonCode(page)
    await typeLiteral(page, 'duration.fast', '0.25')
    await block.getByRole('button', { name: '[ADOPT]' }).first().click()
    await expect.poll(() => readToken(page, '--motion-duration-fast')).toBe('250ms')
    await expect(block.locator('[title^="Literal in place"]')).toHaveCount(0)
    await expect(block).toContainText('// 0.25s')
    await expect(block).not.toContainText('off-system')
  })

  test('[RECONNECT] restores the read, and a preset load clears every override', async ({ page }) => {
    const block = await openButtonCode(page)
    await typeLiteral(page, 'duration.fast', '0.3')
    await block.getByRole('button', { name: '[RECONNECT]' }).first().click()
    await expect(block.locator('[title^="Literal in place"]')).toHaveCount(0)
    await expect(block).not.toContainText('off-system')

    await typeLiteral(page, 'duration.fast', '0.3')
    await expect(block).toContainText('off-system')
    await page.getByRole('button', { name: 'Snappy' }).first().click()
    await expect(block).not.toContainText('off-system')
  })

  test('deviations ride the export and come back through import, unmatched names reported', async ({ page }) => {
    const block = await openButtonCode(page)
    await typeLiteral(page, 'duration.fast', '0.25')
    await typeLiteral(page, 'ease.overshoot', '[0.3, 1.4, 0.6, 1]')

    await page.getByRole('button', { name: 'DTCG', exact: true }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button[class*="exportButton"]').first().click(),
    ])
    const text = await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString('utf8'))
    const doc = JSON.parse(text)
    const list = doc.$extensions['com.davidpreli.cadence'].deviations
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ component: 'Button', token: 'duration.fast', $value: '250ms' })
    expect(list[1]).toMatchObject({ component: 'Button', token: 'easing.overshoot' })

    // Clear, then import the same file with one deviation naming a component
    // no demo carries.
    await page.getByRole('button', { name: 'Snappy' }).first().click()
    await expect(block).not.toContainText('off-system')
    list.push({ component: 'Ghost', token: 'duration.fast', $type: 'duration', $value: '300ms' })
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'cadence.tokens.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)),
    })
    const dialog = page.getByRole('dialog').first()
    await expect(dialog).toContainText('Restored 3 off-system values')
    await expect(dialog).toContainText('Ghost')
    await expect(dialog).toContainText('a component this lab does not carry')
    await page.keyboard.press('Escape')
    await expect(block).toContainText('off-system: 0.25s')
    await expect(block).toContainText('off-system: nearest ease.overshoot')
  })
})
