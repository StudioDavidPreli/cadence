// Principle deep links (#/principles/<filter>/<slug>) — the route that opens one
// principle as a modal over the default grid. docs/decisions/principle-deep-links-
// 2026-07-21.md. Runs against built output through the Worker like the rest of the
// suite. The intro-suppression and copy-link rows are the ones the sharing pass
// depends on.
import { test, expect } from '@playwright/test'
import { seedStorage, INTRO_SEEN } from './helpers'

const FOLLOW_THROUGH = '#/principles/classic/follow-through'

test.describe('principle deep links', () => {
  test('a deep link opens the principle modal over the default grid', async ({ page, context }) => {
    // Seed the intro-seen flag so the only dialog in play is the deep-link one.
    await seedStorage(context, INTRO_SEEN)
    await page.goto(`/${FOLLOW_THROUGH}`)

    // The modal is the expanded card body; its accessible name is the principle
    // title. Generous timeout: cold load resolves the lazy library chunk, then
    // the overlay node, then the modal.
    const dialog = page.getByRole('dialog', { name: 'Follow Through' })
    await expect(dialog).toBeVisible({ timeout: 30_000 })

    // The grid underneath is the plain filtered grid, not expanded: the filter
    // normalized to the card's family (classic), so a sibling classic card
    // renders its collapsed h3 title behind the modal.
    await expect(page.getByRole('heading', { level: 3, name: 'Anticipation' })).toBeVisible()
    // No card is expanded in the grid itself — the only expanded title is the
    // modal's, an h2. Exactly one.
    await expect(page.getByRole('heading', { level: 2, name: 'Follow Through' })).toHaveCount(1)
  })

  test('closing rewrites the hash to the plain grid and the grid stays interactive', async ({ page, context }) => {
    await seedStorage(context, INTRO_SEEN)
    await page.goto(`/${FOLLOW_THROUGH}`)
    const dialog = page.getByRole('dialog', { name: 'Follow Through' })
    await expect(dialog).toBeVisible({ timeout: 30_000 })

    // The body's own × carries aria-label "Close" (the Modal header is hidden).
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(dialog).toBeHidden()

    // Close drops the slug segment in place (replaceState): the hash is the plain
    // filtered grid, no id.
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/principles/classic')

    // The grid behaves normally: a collapsed card still expands in place.
    await page.getByRole('heading', { level: 3, name: 'Anticipation' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Anticipation' })).toBeVisible()
  })

  test('the back button closes the modal', async ({ page, context }) => {
    await seedStorage(context, INTRO_SEEN)
    // Land on the grid first so there is a prior history entry to return to,
    // then push the deep-link hash the way a real hash navigation does. goBack
    // then pops back to the grid and the modal follows the id segment out.
    await page.goto('/#/principles')
    await expect(page.getByRole('heading', { level: 3, name: 'Follow Through' })).toBeVisible({ timeout: 30_000 })

    await page.evaluate((h) => { window.location.hash = h }, FOLLOW_THROUGH)
    const dialog = page.getByRole('dialog', { name: 'Follow Through' })
    await expect(dialog).toBeVisible()

    await page.goBack()
    await expect(dialog).toBeHidden()
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/principles')
  })

  test('an unknown slug fails soft to the plain grid', async ({ page, context }) => {
    await seedStorage(context, INTRO_SEEN)
    await page.goto('/#/principles/classic/not-a-real-principle')
    // The grid renders; no dialog opens.
    await expect(page.getByRole('heading', { level: 3, name: 'Anticipation' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // The bad segment is normalized out of the URL (first-run replaceState).
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/principles/classic')
  })

  test('the intro does not appear on deep-link entry', async ({ page }) => {
    // Fresh context (no intro-seen flag): an ordinary visit would auto-open the
    // intro. Deep-link entry must suppress it, and must not mark it seen.
    await page.goto(`/${FOLLOW_THROUGH}`)
    await expect(page.getByRole('dialog', { name: 'Follow Through' })).toBeVisible({ timeout: 30_000 })
    // The intro modal's title never renders.
    await expect(page.getByText('The tool bar drives these cards')).toHaveCount(0)
  })

  test('an ordinary visit still gets the intro (suppression is deep-link only)', async ({ page }) => {
    // The counter-check to the row above: with no deep link and no seen flag, the
    // intro auto-opens as before, proving suppression did not disable it wholesale.
    await page.goto('/#/principles')
    await expect(page.getByText('The tool bar drives these cards')).toBeVisible({ timeout: 30_000 })
  })

  test('the copy-link control writes the principle URL to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await seedStorage(context, INTRO_SEEN)
    await page.goto(`/${FOLLOW_THROUGH}`)
    const dialog = page.getByRole('dialog', { name: 'Follow Through' })
    await expect(dialog).toBeVisible({ timeout: 30_000 })

    await dialog.getByRole('button', { name: 'Link', exact: true }).click()
    // Confirmation swaps the label to "Copied".
    await expect(dialog.getByText('Copied', { exact: true })).toBeVisible()

    const expected = await page.evaluate(
      () => location.origin + location.pathname + '#/principles/classic/follow-through',
    )
    const written = await page.evaluate(() => navigator.clipboard.readText())
    expect(written).toBe(expected)
  })
})
