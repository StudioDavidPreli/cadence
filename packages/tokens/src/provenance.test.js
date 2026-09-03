import { describe, it, expect } from 'vitest'
import {
  provenance,
  PROVENANCE_TAGS,
  EDITABLE_TOKEN_SCHEMA,
  FIXED_REFERENCE_PATHS,
  AMBIENT_PRESETS,
} from './index.js'

// The completeness contract behind the style guide's provenance column: every
// value the system carries has exactly one entry, and no entry points at a
// value that no longer exists. A token added to the schema (or a new ambient
// key) fails here until its provenance is written, which is the point: a
// value without a story cannot ship to the guide.

function expectedPaths() {
  const paths = []
  for (const [family, keys] of Object.entries(EDITABLE_TOKEN_SCHEMA)) {
    for (const key of keys) paths.push(`${family}.${key}`)
  }
  for (const fixed of FIXED_REFERENCE_PATHS) paths.push(fixed)
  paths.push('scalar')
  // Ambient keys are the value keys every preset carries (label and
  // riveInstance are naming, not values), plus the base period.
  const ambientKeys = Object.keys(AMBIENT_PRESETS.standard)
    .filter(k => k !== 'label' && k !== 'riveInstance')
  for (const key of ambientKeys) paths.push(`ambient.${key}`)
  paths.push('ambient.basePeriod')
  return paths.sort()
}

describe('provenance completeness', () => {
  it('covers every token path exactly, with no stale entries', () => {
    expect(Object.keys(provenance).sort()).toEqual(expectedPaths())
  })

  it('every entry carries a valid tag, a source, and a note', () => {
    for (const [path, entry] of Object.entries(provenance)) {
      expect(PROVENANCE_TAGS, `${path}: unknown tag "${entry.tag}"`).toContain(entry.tag)
      expect(entry.source, `${path}: empty source`).toBeTruthy()
      expect(entry.note, `${path}: empty note`).toBeTruthy()
    }
  })

  it('measured claims are confined to the ambient vocabulary', () => {
    // The measured tag makes the strongest claim, and today only the tile
    // reconstruction earned it. If an interaction token ever claims it, that
    // is either a new measurement (update this test with its record) or an
    // overclaim (the thing this test exists to catch).
    for (const [path, entry] of Object.entries(provenance)) {
      if (entry.tag === 'measured') {
        expect(path.startsWith('ambient.'), `${path} claims measured`).toBe(true)
      }
    }
  })
})
