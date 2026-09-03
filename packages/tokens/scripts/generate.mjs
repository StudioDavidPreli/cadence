// Generates the package's published artifacts into dist/. Run from the package
// directory (or via `npm run generate -w cadence-tokens` at the repo root).
//
// Item 2 of the build order generates the canonical document only; the wider
// artifact set (a --cadence- prefixed CSS file per preset, the Framer Motion
// module, the Rive VM defaults) lands with the publish item, where the README
// documents each one. The emitters already exist, so those are one-line adds
// here when their time comes.
//
// dist/ is generated output and gitignored; `npm publish` regenerates it via
// prepack when the publish item wires that up.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTokensDocument } from '../src/index.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))

const outDir = join(packageDir, 'dist')
mkdirSync(outDir, { recursive: true })

const doc = buildTokensDocument({ version })
writeFileSync(join(outDir, 'cadence.tokens.json'), JSON.stringify(doc, null, 2) + '\n')

console.log(`cadence.tokens.json generated (version ${version})`)
