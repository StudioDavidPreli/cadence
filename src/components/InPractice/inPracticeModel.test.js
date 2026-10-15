import { describe, it, expect } from 'vitest'
import { THEMES } from '../../context/ThemeContext'
import {
  BASIS_ORIGIN,
  BASIS_EMBED_PATH,
  BUILT_IN_PRESETS,
  THEME_TO_BASIS,
  framePreset,
  frameSrc,
} from './inPracticeModel'

function params(src) {
  return new URL(src).searchParams
}

describe('framePreset', () => {
  it('follows a built-in preset the tool bar has loaded', () => {
    for (const id of BUILT_IN_PRESETS) expect(framePreset(id, 'standard')).toBe(id)
  })

  it('keeps the last built-in when the tool bar reads Custom', () => {
    expect(framePreset(null, 'snappy')).toBe('snappy')
    expect(framePreset(null, 'cinematic')).toBe('cinematic')
  })

  it('treats a saved user preset as Custom', () => {
    expect(framePreset('user-1730000000000', 'cinematic')).toBe('cinematic')
  })

  it('falls back to Standard with no built-in seen', () => {
    expect(framePreset(null, null)).toBe('standard')
    expect(framePreset(null, 'bogus')).toBe('standard')
  })
})

describe('frameSrc', () => {
  const base = { preset: 'standard', theme: 'dark', reducedMotion: false, consented: false }

  it('points at the Basis embed', () => {
    const url = new URL(frameSrc(base))
    expect(url.origin).toBe(BASIS_ORIGIN)
    expect(url.pathname).toBe(BASIS_EMBED_PATH)
  })

  it('maps every Cadence theme to its Basis stock', () => {
    expect(Object.keys(THEME_TO_BASIS).sort()).toEqual([...THEMES].sort())
    expect(params(frameSrc({ ...base, theme: 'light' })).get('theme')).toBe('cadence-light')
    expect(params(frameSrc({ ...base, theme: 'dark' })).get('theme')).toBe('cadence-dark')
    expect(params(frameSrc({ ...base, theme: 'high-contrast-light' })).get('theme')).toBe('cadence-hc-light')
    expect(params(frameSrc({ ...base, theme: 'high-contrast-dark' })).get('theme')).toBe('cadence-hc-dark')
  })

  it('carries each built-in preset', () => {
    for (const preset of BUILT_IN_PRESETS) {
      expect(params(frameSrc({ ...base, preset })).get('preset')).toBe(preset)
    }
  })

  it('never passes a preset Basis cannot run', () => {
    expect(params(frameSrc({ ...base, preset: 'custom' })).get('preset')).toBe('standard')
  })

  it('omits reduce with no reduced-motion preference', () => {
    expect(params(frameSrc(base)).has('reduce')).toBe(false)
    expect(params(frameSrc({ ...base, consented: true })).has('reduce')).toBe(false)
  })

  it('reduces under the preference until the visitor consents', () => {
    expect(params(frameSrc({ ...base, reducedMotion: true })).get('reduce')).toBe('1')
    expect(params(frameSrc({ ...base, reducedMotion: true, consented: true })).get('reduce')).toBe('0')
  })

  it('falls back to the dark stock for an unknown theme', () => {
    expect(params(frameSrc({ ...base, theme: 'sepia' })).get('theme')).toBe('cadence-dark')
  })
})
