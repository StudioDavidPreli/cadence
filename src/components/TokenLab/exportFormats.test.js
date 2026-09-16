import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { INITIAL_STATE, BUILT_IN_PRESETS, importTokens } from 'cadence-tokens'
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_KEYS,
  exportFormat,
  exportFile,
  exportLabel,
  TOKENS_PACKAGE_VERSION,
} from './exportFormats'

const here = dirname(fileURLToPath(import.meta.url))
const cinematic = BUILT_IN_PRESETS.find(p => p.id === 'cinematic')

describe('the export format table', () => {
  it('names six formats with unique keys, filenames and wire names', () => {
    expect(EXPORT_FORMAT_KEYS).toEqual(['dtcg', 'flat', 'css', 'fm', 'ae', 'flow'])
    const unique = field => new Set(EXPORT_FORMATS.map(f => f[field])).size
    expect(unique('filename')).toBe(6)
    expect(unique('wire')).toBe(6)
    expect(unique('label')).toBe(6)
  })

  it('every entry is complete, and its description is a sentence', () => {
    for (const f of EXPORT_FORMATS) {
      for (const field of ['key', 'label', 'description', 'filename', 'mime', 'language', 'wire']) {
        expect(typeof f[field], `${f.key}.${field}`).toBe('string')
        expect(f[field].length, `${f.key}.${field}`).toBeGreaterThan(0)
      }
      expect(typeof f.reimports, f.key).toBe('boolean')
      expect(typeof f.carriesDeviations, f.key).toBe('boolean')
      expect(typeof f.stringify, f.key).toBe('function')
      expect(f.description, f.key).toMatch(/^[A-Z]/)
      expect(f.description, f.key).toMatch(/\.$/)
      expect(f.description, f.key).not.toMatch(/—/)
    }
  })

  // The counter's allowlist lives in the Worker. This reads that line out of
  // the Worker source so the two lists cannot drift: a format added here
  // without its wire name there would count nothing and never fail a test.
  it('speaks exactly the wire names the Worker allows', () => {
    const worker = readFileSync(join(here, '../../../worker/index.js'), 'utf8')
    const match = worker.match(/const EXPORT_FORMATS = \[([^\]]+)\]/)
    expect(match, 'EXPORT_FORMATS array in worker/index.js').not.toBeNull()
    const allowed = match[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
    expect([...EXPORT_FORMATS.map(f => f.wire)].sort()).toEqual([...allowed].sort())
  })

  it('exportFormat throws on an unknown key rather than returning undefined', () => {
    expect(() => exportFormat('scss')).toThrow(/Unknown export format/)
  })
})

describe('exportFile', () => {
  it('produces non-empty text with the format\'s filename, mime and wire name', () => {
    for (const key of EXPORT_FORMAT_KEYS) {
      const f = exportFormat(key)
      const file = exportFile(key, INITIAL_STATE)
      expect(file.filename).toBe(f.filename)
      expect(file.mime).toBe(f.mime)
      expect(file.wire).toBe(f.wire)
      expect(file.text.length, key).toBeGreaterThan(40)
    }
  })

  it('the two interchange formats round-trip through importTokens', () => {
    for (const f of EXPORT_FORMATS.filter(f => f.reimports)) {
      const { text } = exportFile(f.key, cinematic.state)
      const result = importTokens(text)
      expect(result.ok, f.key).toBe(true)
      expect(result.state.duration, f.key).toEqual(cinematic.state.duration)
    }
  })

  it('carries the deviation appendix on the formats that have a place for it, and nowhere else', () => {
    const deviations = [{ component: 'Button', token: 'duration.fast', value: 0.25 }]
    for (const f of EXPORT_FORMATS) {
      const plain = exportFile(f.key, INITIAL_STATE).text
      const withDeviation = exportFile(f.key, INITIAL_STATE, { deviations }).text
      if (f.carriesDeviations) {
        expect(withDeviation, f.key).not.toBe(plain)
        expect(withDeviation, f.key).toContain('Button')
      } else {
        expect(withDeviation, f.key).toBe(plain)
      }
    }
  })
})

describe('the After Effects export', () => {
  it('is headed with the preset label when the set matches one, and Custom when it does not', () => {
    expect(exportLabel('Cinematic')).toBe('Cinematic')
    expect(exportLabel(null)).toBe('Custom')
    const named = exportFile('ae', cinematic.state, { presetLabel: 'Cinematic' }).text
    const custom = exportFile('ae', cinematic.state).text
    expect(named).toContain('Cinematic preset')
    expect(custom).toContain('Custom preset')
  })

  it('names the package version it came from, read from the manifest', () => {
    expect(TOKENS_PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(exportFile('ae', INITIAL_STATE).text).toContain(`cadence-tokens ${TOKENS_PACKAGE_VERSION}`)
  })
})
