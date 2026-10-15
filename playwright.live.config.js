import { defineConfig, devices } from '@playwright/test'

// The live In Practice spec (docs/decisions/in-practice-2026-10-14.md, scope
// 6): Cadence's built output framing the real basis.davidpreli.com. Its own
// config and directory, outside the main suite's testDir, so the pre-push gate
// never runs it and a Basis outage can never block a Cadence push. Run it on
// demand and before David's visual pass: `npm run test:live`. Basis allows
// http://localhost:8787 as a frame ancestor for exactly this.
//
// Same server rules as the main config: built output through the Worker,
// never a reused server.
export default defineConfig({
  testDir: './e2e-live',
  fullyParallel: true,
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
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
