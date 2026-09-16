import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

// The package's `exports` map is a gate, not a listing: once it exists, any
// subpath it does not name is refused with ERR_PACKAGE_PATH_NOT_EXPORTED, even
// when the file is in the tarball. 2.0.0 named only the root and the two
// documents, so the per-preset files the README and the first consumer (Basis,
// 2026-09-16) import, `dist/<preset>/cadence.css` and `cadence.motion.js`,
// were shipped but unreachable. 2.0.1 adds the `./dist/*` pattern. This test
// resolves through Node's own resolver against the workspace link, which
// honours the map exactly as a consumer's bundler would.

const require = createRequire(import.meta.url)

describe('package exports map', () => {
  it.each([
    'cadence-tokens',
    'cadence-tokens/tokens.json',
    'cadence-tokens/rive.json',
    'cadence-tokens/dist/standard/cadence.css',
    'cadence-tokens/dist/standard/cadence.motion.js',
    'cadence-tokens/dist/snappy/cadence.css',
    'cadence-tokens/dist/cinematic/cadence.motion.js',
    'cadence-tokens/dist/cadence.figma.json',
  ])('resolves %s', (specifier) => {
    expect(() => require.resolve(specifier)).not.toThrow()
  })

  it('still refuses paths outside dist', () => {
    expect(() => require.resolve('cadence-tokens/src/audit.js')).toThrow(/not defined by "exports"/)
  })
})
