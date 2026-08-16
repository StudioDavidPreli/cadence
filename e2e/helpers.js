// Shared helpers for the Tier 1 suite (docs/deploy-verification-matrix.md).

// Read a CSS custom property as the app's components do: resolved on the root
// element. Token Lab writes edits as inline style properties on
// documentElement, so after any UI edit this returns the runtime-authored
// string exactly ('150ms', 'cubic-bezier(0, 0, 1, 1)'). Initial values come
// from the minified stylesheet, which may respell them (400ms -> .4s) — assert
// exact strings only after a runtime write, never on first load.
export function readToken(page, name) {
  return page.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  )
}

// The four display modes, as stored in localStorage under 'cadence-theme' and
// mirrored to <html data-theme> by the pre-paint script in index.html.
export const THEMES = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark']

// Pre-seed localStorage before any page script runs. addInitScript executes
// ahead of the pre-paint theme script, so a stored choice set here is
// indistinguishable from a returning visitor's.
export async function seedStorage(context, entries) {
  await context.addInitScript((kv) => {
    for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v)
  }, entries)
}

// The Principles intro modal auto-opens on first visit. Tests that want the
// grid (not the modal) seed the seen flag; tests that want the modal do not.
export const INTRO_SEEN = { 'cadence-principles-intro-v1': 'true' }

// The Cloudflare Web Analytics beacon (index.html, 2026-08-16) loads from
// static.cloudflareinsights.com. Sandboxed or offline test environments may
// fail to resolve that host, and the failed load logs exactly the console
// error the console-clean tests assert against. Analytics is not under test:
// fulfill the request with an empty module so every environment sees the
// same, deterministically clean console. Works on a Page or a BrowserContext;
// call before the first goto.
export async function stubAnalyticsBeacon(target) {
  await target.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  )
}
