// The shared-literal audit note (2026-09-15, the deferred A2 piece).
// docs/decisions/audit-offsystem-section-2026-09-13.md, addendum. Two demos
// typed onto one literal raise a note, never a finding, and the row names the
// moments from the site table. Pinned on built output: the tool bar line, the
// report row, and the note leaving when one demo reconnects.
import { test, expect } from '@playwright/test'

// One demo's group on the page, found by its label span so the Button and
// Toggle blocks can be driven without the page-wide ambiguity the code views
// share (both snippets read tokens.duration.fast).
function demo(page, name) {
  return page.locator('[class*="demoGroup"]', {
    has: page.locator('span[class*="demoLabel"]', { hasText: new RegExp(`^${name}$`) }),
  })
}

async function typeLiteral(page, name, path, text) {
  const group = demo(page, name)
  await group.getByRole('button', { name: 'Show code' }).click()
  await group.locator('span[title^="Click to type"]', { hasText: `tokens.${path}` }).last().click()
  const input = group.getByLabel(`Value for tokens.${path}`)
  await input.fill(text)
  await input.press('Enter')
  await expect(group.locator('pre').first()).toContainText('off-system')
}

test.describe('the shared-literal note', () => {
  test('two demos on one literal raise a note that names their moments', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    await typeLiteral(page, 'Button', 'duration.fast', '0.25')
    // One deviation: the tool bar counts it and flags nothing.
    await expect(page.getByText('Audit: nothing to flag, 1 off-system')).toBeVisible()

    await typeLiteral(page, 'Toggle', 'duration.fast', '0.25')
    // Two on one value: a note joins the count, the off-system clause stays.
    await expect(page.getByText('Audit: 1 note, 2 off-system')).toBeVisible()

    await page.getByRole('button', { name: 'View report' }).click()
    const dialog = page.getByRole('dialog', { name: 'Motion token audit' })
    await expect(dialog).toContainText(
      'Button (press, release) and Toggle (flip) run duration.fast as 0.25s off-system. One value in two places is a token that has not been named yet.',
    )
    // Still not a finding: the verdict on the set is unchanged.
    await expect(dialog).toContainText('Nothing in this set contradicts itself. 2 off-system values.')
    await page.keyboard.press('Escape')

    // Reconnect one demo and the note goes with it.
    await demo(page, 'Toggle').getByRole('button', { name: '[RECONNECT]' }).first().click()
    await expect(page.getByText('Audit: nothing to flag, 1 off-system')).toBeVisible()
  })

  test('two demos on different values raise nothing', async ({ page }) => {
    await page.goto('/#/token-lab/press-state')
    await typeLiteral(page, 'Button', 'duration.fast', '0.25')
    await typeLiteral(page, 'Toggle', 'duration.fast', '0.3')
    await expect(page.getByText('Audit: nothing to flag, 2 off-system')).toBeVisible()
  })
})
