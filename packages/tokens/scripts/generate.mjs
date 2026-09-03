// Generates the package's published artifacts into dist/. Run from the package
// directory (or via `npm run generate -w cadence-tokens` at the repo root).
//
// The full published artifact set (build-order items 2-4):
//
//   dist/cadence.tokens.json      the canonical document, both vocabularies
//   dist/cadence.rive.json        PathEffectVM defaults + clock + unit notes
//   dist/<preset>/cadence.css     that personality as --cadence- custom properties
//   dist/<preset>/cadence.motion.js  that personality as a Framer Motion module
//
// The CSS and Framer Motion files are per-preset because both formats
// serialize ONE state: a stylesheet declares one value per property and a
// transition takes one duration. The JSON documents are the whole system;
// the per-preset files are a chosen personality, ready to drop in.
//
// dist/ is generated output and gitignored; prepack regenerates it so a
// publish can never ship stale artifacts.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildTokensDocument,
  buildRiveDefaults,
  toCssVars,
  toFramerMotion,
  BUILT_IN_PRESETS,
} from '../src/index.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))

const outDir = join(packageDir, 'dist')
mkdirSync(outDir, { recursive: true })

const doc = buildTokensDocument({ version })
writeFileSync(join(outDir, 'cadence.tokens.json'), JSON.stringify(doc, null, 2) + '\n')

const riveDefaults = buildRiveDefaults()
writeFileSync(join(outDir, 'cadence.rive.json'), JSON.stringify(riveDefaults, null, 2) + '\n')

for (const preset of BUILT_IN_PRESETS) {
  const presetDir = join(outDir, preset.id)
  mkdirSync(presetDir, { recursive: true })
  writeFileSync(join(presetDir, 'cadence.css'), toCssVars(preset.state, { prefix: '--cadence-' }) + '\n')
  writeFileSync(join(presetDir, 'cadence.motion.js'), toFramerMotion(preset.state))
}

console.log(`generated (version ${version}): cadence.tokens.json, cadence.rive.json, and css + motion.js for ${BUILT_IN_PRESETS.map(p => p.id).join(', ')}`)
