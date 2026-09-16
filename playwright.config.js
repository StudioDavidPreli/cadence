import { defineConfig, devices } from '@playwright/test'

// The Tier 1 deploy gate specified by docs/deploy-verification-matrix.md.
// Everything runs against BUILT output served by the real Worker (wrangler dev),
// never the dev server — the standing rule in CLAUDE.md exists because a whole
// class of bugs (CSS minification, code splitting) is invisible under `npm run
// dev`. The webServer block builds first, so a plain `npm run test:e2e` always
// tests the current source compiled the way the deploy compiles it.
export default defineConfig({
  testDir: './e2e',
  // The suite mutates app state (tokens, themes, localStorage) but each test
  // gets a fresh browser context, so tests are independent. Fully parallel is
  // safe because state lives per-context, not in the server.
  fullyParallel: true,
  // One retry absorbs the boundary flake that real browser timing produces
  // (font/Rive loads racing an assertion) without hiding a real regression:
  // a genuine failure fails twice.
  retries: 1,
  use: {
    baseURL: 'http://localhost:8787',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npx wrangler dev',
    url: 'http://localhost:8787',
    // Never reuse. With reuse on, anything already listening on 8787 (a
    // preview, an earlier run's workerd that outlived npm) made Playwright
    // skip this command, the build included, and pass the suite against
    // whatever that server was serving: a green light for source it never
    // compiled. Off, a busy port is a loud error (2026-09-15).
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
