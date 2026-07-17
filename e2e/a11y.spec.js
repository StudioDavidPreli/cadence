// Accessibility floors via axe-core — docs/deploy-verification-matrix.md,
// "Accessibility floors" T1 rows. Four themes crossed with the app's main
// surfaces. axe's wcag2a/wcag2aa ruleset covers the contrast floors (4.5:1
// text, 3:1 UI), name/role/value, and ARIA validity in one pass.
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { THEMES, seedStorage, INTRO_SEEN } from './helpers'

const VIEWS = [
  { name: 'home', path: '/' },
  { name: 'token-lab guide', path: '/#/token-lab' },
  { name: 'press-state demos', path: '/#/token-lab/press-state' },
  { name: 'principles grid', path: '/#/principles' },
  { name: 'motion-tiles landing', path: '/#/motion-tiles' },
]

for (const theme of THEMES) {
  test.describe(`axe floors, ${theme}`, () => {
    for (const view of VIEWS) {
      test(view.name, async ({ browser }) => {
        const context = await browser.newContext()
        // Seed the theme (stored choice wins over OS) and mark the Principles
        // intro as seen so axe scans the grid, not the modal in front of it.
        await seedStorage(context, { 'cadence-theme': theme, ...INTRO_SEEN })
        const page = await context.newPage()
        await page.goto(view.path)
        // Let lazy content (Rive canvases, code views) reach the DOM before
        // scanning; axe reads the accessibility tree as rendered.
        await page.waitForLoadState('networkidle')

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()

        // Print full findings on failure; the assertion message alone is
        // useless for triage.
        const summary = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
        }))
        expect(summary, JSON.stringify(summary, null, 2)).toEqual([])

        await context.close()
      })
    }
  })
}
