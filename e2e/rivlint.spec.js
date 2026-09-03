// The .riv contract check (build-order item 1, 2026-09-03).
//
// Every shipped .riv is enumerated through the real webgl2 runtime in the
// browser and compared against a committed baseline (e2e/rivlint/manifest.json):
// artboard names, animation names, state machine names, view models with their
// properties and named instances. The baseline was generated from the current,
// David-verified files, so the check is a regression gate, not a convention
// oracle: the class of failure it exists to catch is a re-export silently
// losing structure (r4c1 shipped blank once because its VM binding did not
// survive an export; that failure changed exactly the facts this file pins).
//
// A NEW .riv fails with "no manifest entry" until the baseline is regenerated,
// which is deliberate: regeneration is the moment to eyeball the new file's
// contract (ViewModel1 + Dark/Light/Contrast instances for principle art,
// full VM provisioning for tiles). Regenerate with:
//
//   RIVLINT_UPDATE=1 npx playwright test rivlint
//
// then review the manifest diff like source, because it is.
//
// Scope limit, documented rather than implied: the runtime enumerates file
// structure, not wiring. A property-to-shape binding that breaks while the VM
// itself survives is invisible here (the in-app unbound-tile diagnostic still
// covers that at runtime). Converter internals are not readable through any
// public surface, MCP included.
//
// Mechanics: the page is a route-fulfilled blank document on the served
// origin (so /rive/*.riv fetches are same-origin), the UMD runtime is
// injected from node_modules, and its WASM is served through a second
// fulfilled route because the app's own pinned copy ships under a hashed
// asset name this spec should not chase. useOffscreenRenderer shares one GL
// context across all ~60 loads, the same setting the Motion Tiles grid runs.
import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const e2eDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(e2eDir)
const publicDir = join(repoRoot, 'public')
const manifestPath = join(e2eDir, 'rivlint', 'manifest.json')
const runtimePath = join(repoRoot, 'node_modules', '@rive-app', 'webgl2', 'rive.js')
const wasmPath = join(repoRoot, 'node_modules', '@rive-app', 'webgl2', 'rive.wasm')

const UPDATE = process.env.RIVLINT_UPDATE === '1'

// Every .riv under public/, keyed by its served path relative to public/
// (which is also its URL path on the origin).
function discoverRivFiles(dir = publicDir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...discoverRivFiles(full))
    else if (entry.endsWith('.riv')) files.push(relative(publicDir, full))
  }
  return files.sort()
}

const allFiles = discoverRivFiles()

// Grouped by directory so a failure names the surface it belongs to and the
// suite stays at a handful of tests instead of ~60.
const groups = {}
for (const file of allFiles) {
  const group = dirname(file) === '.' ? '(public root)' : dirname(file)
  ;(groups[group] ??= []).push(file)
}

const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : {}

async function setupHarness(page) {
  await page.route('**/__rivlint__', route =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' })
  )
  await page.route('**/__rivlint__/rive.wasm', route =>
    route.fulfill({ contentType: 'application/wasm', body: readFileSync(wasmPath) })
  )
  await page.goto('/__rivlint__')
  await page.addScriptTag({ path: runtimePath })
  await page.evaluate(() => {
    window.rive.RuntimeLoader.setWasmUrl('/__rivlint__/rive.wasm')
  })
}

// Enumerate one file's contract facts inside the page. Sequential on purpose:
// each instance is cleaned up before the next loads.
function enumerateFile(page, urlPath) {
  return page.evaluate(async src => {
    const canvas = (window.__rivlintCanvas ??= document.createElement('canvas'))
    const instance = await new Promise((resolve, reject) => {
      const r = new window.rive.Rive({
        src,
        canvas,
        autoplay: false,
        useOffscreenRenderer: true,
        onLoad: () => resolve(r),
        onLoadError: () => reject(new Error(`runtime failed to load ${src}`)),
      })
    })
    try {
      const contents = instance.contents ?? {}
      const artboards = (contents.artboards ?? []).map(a => ({
        name: a.name,
        animations: a.animations,
        stateMachines: a.stateMachines.map(s => s.name),
      }))
      const viewModels = []
      for (let i = 0; i < instance.viewModelCount; i++) {
        const vm = instance.viewModelByIndex(i)
        viewModels.push({
          name: vm.name,
          instances: vm.instanceNames,
          properties: vm.properties.map(p => ({ name: p.name, type: String(p.type) })),
        })
      }
      return { artboards, viewModels }
    } finally {
      instance.cleanup()
    }
  }, `/${urlPath}`)
}

// ─── Update mode: one test regenerates the whole baseline ────────────────────
test('rivlint: regenerate manifest', async ({ page }) => {
  test.skip(!UPDATE, 'run with RIVLINT_UPDATE=1 to regenerate the baseline')
  await setupHarness(page)
  const next = {}
  for (const file of allFiles) {
    next[file] = await enumerateFile(page, file)
  }
  writeFileSync(manifestPath, JSON.stringify(next, null, 2) + '\n')
  console.log(`rivlint manifest regenerated: ${allFiles.length} files`)
})

// ─── Assert mode: one test per directory group ───────────────────────────────
for (const [group, files] of Object.entries(groups)) {
  test(`rivlint: ${group} (${files.length} files)`, async ({ page }) => {
    test.skip(UPDATE, 'baseline regeneration run')
    // A manifest entry whose file is gone is as much a finding as the reverse:
    // it means a shipped asset was deleted or moved without the baseline.
    const stale = Object.keys(manifest).filter(
      f => (dirname(f) === '.' ? '(public root)' : dirname(f)) === group && !files.includes(f)
    )
    expect(stale, 'manifest entries with no file on disk').toEqual([])

    await setupHarness(page)
    for (const file of files) {
      expect(manifest[file], `${file}: no manifest entry — new or renamed file; review it, then RIVLINT_UPDATE=1 npx playwright test rivlint`).toBeDefined()
      const facts = await enumerateFile(page, file)
      expect.soft(facts, `${file}: contract drifted from e2e/rivlint/manifest.json`).toEqual(manifest[file])
    }
  })
}
