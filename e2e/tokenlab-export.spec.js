// The export modal (2026-09-15). docs/decisions/export-modal-2026-09-15.md.
// The tool bar's Export section shrank to one button; the choice of format,
// the preview and the actions live in a dialog. These pin, on built output:
// the six formats and their files, the preview being the real output, the
// After Effects header naming the preset or "Custom", the deviation note per
// format, and the counter speaking the two new wire names.
import { test, expect } from '@playwright/test'

async function openExport(page) {
  await page.goto('/#/token-lab')
  await page.getByRole('button', { name: 'Export…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export tokens' })
  await expect(dialog).toBeVisible()
  return dialog
}

function pick(dialog, label) {
  return dialog.getByRole('button', { name: new RegExp(`^${label}\\b`) })
}

async function downloadFrom(page, dialog, label) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: `Export ${label}` }).click(),
  ])
  const text = await (await download.createReadStream()).toArray()
    .then(chunks => Buffer.concat(chunks).toString('utf8'))
  return { name: download.suggestedFilename(), text }
}

test.describe('the export modal', () => {
  test('lists seven formats, and each downloads under its own file name', async ({ page }) => {
    const dialog = await openExport(page)
    const group = dialog.getByRole('group', { name: 'Export format' })
    await expect(group.getByRole('button')).toHaveCount(7)

    const expected = [
      ['DTCG', 'cadence.tokens.json', '"$type"'],
      ['Flat JSON', 'cadence-tokens.json', '"fast": "100ms"'],
      ['CSS', 'cadence.tokens.css', ':root'],
      ['Framer Motion', 'cadence.motion.js', 'export const'],
      ['After Effects', 'cadence.tokens.jsx', "'TOKENS Motion'"],
      ['Flow', 'cadence.flow.txt', '"standard"'],
      ['Figma', 'cadence.figma.json', '"collection": "Cadence Motion"'],
    ]
    for (const [label, filename, signature] of expected) {
      await pick(dialog, label).click()
      await expect(dialog).toContainText(filename)
      const file = await downloadFrom(page, dialog, label)
      expect(file.name, label).toBe(filename)
      expect(file.text, label).toContain(signature)
    }
  })

  test('the preview is the file: what the pane shows is what the download writes', async ({ page }) => {
    const dialog = await openExport(page)
    await pick(dialog, 'Flow').click()
    const preview = dialog.getByRole('region', { name: 'Preview of cadence.flow.txt' })
    const shown = await preview.innerText()
    const file = await downloadFrom(page, dialog, 'Flow')
    expect(shown.trim()).toBe(file.text.trim())
  })

  test('the After Effects script is headed with the preset until the set is edited, then Custom', async ({ page }) => {
    let dialog = await openExport(page)
    await expect(dialog).toContainText('Standard preset')
    await pick(dialog, 'After Effects').click()
    let file = await downloadFrom(page, dialog, 'After Effects')
    expect(file.text).toContain('Standard preset')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Nudge one slider off the preset. The set is no longer Standard. Duration
    // starts collapsed (David's section order, 2026-07-21); open it first.
    await page.locator('button[class*="sectionHeader"]', { hasText: 'Duration' }).click()
    const slider = page.getByRole('slider', { name: 'duration.fast' })
    await slider.focus()
    await slider.press('ArrowRight')

    await page.getByRole('button', { name: 'Export…' }).click()
    dialog = page.getByRole('dialog', { name: 'Export tokens' })
    await expect(dialog).toContainText('Custom values')
    // The format choice survives the close.
    await expect(pick(dialog, 'After Effects')).toHaveAttribute('aria-pressed', 'true')
    file = await downloadFrom(page, dialog, 'After Effects')
    expect(file.text).toContain('Custom preset')
    expect(file.text).not.toContain('Standard preset')
  })

  test('the counter speaks the new wire names for After Effects, Flow and Figma', async ({ page }) => {
    const events = []
    await page.route('**/api/event', async route => {
      events.push(route.request().postDataJSON())
      await route.fulfill({ status: 204, body: '' })
    })
    const dialog = await openExport(page)
    await pick(dialog, 'After Effects').click()
    await downloadFrom(page, dialog, 'After Effects')
    await pick(dialog, 'Flow').click()
    await downloadFrom(page, dialog, 'Flow')
    await pick(dialog, 'Figma').click()
    await downloadFrom(page, dialog, 'Figma')
    expect(events).toEqual([
      { type: 'export', format: 'after-effects' },
      { type: 'export', format: 'flow' },
      { type: 'export', format: 'figma' },
    ])
  })

  test('the deviation note says which files carry an off-system edit', async ({ page }) => {
    // Take Button off the system through the code view, then open the modal.
    await page.goto('/#/token-lab/press-state')
    await page.getByRole('button', { name: 'Show code' }).first().click()
    await page.locator('span[title^="Click to type"]', { hasText: 'tokens.duration.fast' }).last().click()
    const input = page.getByLabel('Value for tokens.duration.fast')
    await input.fill('0.25')
    await input.press('Enter')

    await page.getByRole('button', { name: 'Export…' }).click()
    const dialog = page.getByRole('dialog', { name: 'Export tokens' })
    await pick(dialog, 'DTCG').click()
    await expect(dialog).toContainText('1 off-system deviation rides this file')
    await pick(dialog, 'After Effects').click()
    await expect(dialog).toContainText('do not ride this format')
  })
})
