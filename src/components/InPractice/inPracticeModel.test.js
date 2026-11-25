import { describe, it, expect } from 'vitest'
import { THEMES } from '../../context/ThemeContext'
import {
  BASIS_ORIGIN,
  BASIS_EMBED_PATH,
  BUILT_IN_PRESETS,
  THEME_TO_BASIS,
  BASIS,
  CLNDR,
  embedSrc,
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

// Basis's addresses as the page sent them before a second product existed,
// written out: the model was generalized under them (2026-11-25) and nothing
// Basis receives may have moved.
describe('Basis is unchanged by the second product', () => {
  const base = { preset: 'standard', theme: 'dark', reducedMotion: false, consented: false }

  it('sends the same bytes', () => {
    expect(frameSrc(base)).toBe('https://basis.davidpreli.com/embed/in-practice?preset=standard&theme=cadence-dark')
    expect(frameSrc({ preset: 'snappy', theme: 'high-contrast-light', reducedMotion: true, consented: false }))
      .toBe('https://basis.davidpreli.com/embed/in-practice?preset=snappy&theme=cadence-hc-light&reduce=1')
    expect(frameSrc({ preset: 'cinematic', theme: 'light', reducedMotion: true, consented: true }))
      .toBe('https://basis.davidpreli.com/embed/in-practice?preset=cinematic&theme=cadence-light&reduce=0')
    expect(BASIS.linkOut).toBe('https://basis.davidpreli.com/')
  })

  it('is embedSrc for the Basis entry', () => {
    for (const theme of THEMES) expect(frameSrc({ ...base, theme })).toBe(embedSrc(BASIS, { ...base, theme }))
  })
})

// The calendar's contract: docs/embed.md in the booking-calendar repo.
describe('the CLNDR src', () => {
  const THEME_NAMES = {
    light: 'cadence-light',
    dark: 'cadence-dark',
    'high-contrast-light': 'cadence-hc-light',
    'high-contrast-dark': 'cadence-hc-dark',
  }
  // [OS preference, consented, what is appended]
  const REDUCE = [
    [false, false, ''],
    [false, true, ''],
    [true, false, '&reduce=1'],
    [true, true, '&reduce=0'],
  ]

  it('is the address, preset, theme and reduce, in every combination', () => {
    expect(Object.keys(THEME_NAMES).sort()).toEqual([...THEMES].sort())
    for (const preset of BUILT_IN_PRESETS) {
      for (const [theme, name] of Object.entries(THEME_NAMES)) {
        for (const [reducedMotion, consented, tail] of REDUCE) {
          expect(embedSrc(CLNDR, { preset, theme, reducedMotion, consented }))
            .toBe(`https://calendar.davidpreli.com/embed/booking?preset=${preset}&theme=${name}${tail}`)
        }
      }
    }
  })

  it('falls back to Standard and to dark', () => {
    expect(embedSrc(CLNDR, { preset: 'custom', theme: 'sepia', reducedMotion: false, consented: false }))
      .toBe('https://calendar.davidpreli.com/embed/booking?preset=standard&theme=cadence-dark')
  })

  it('links out to the calendar itself', () => {
    expect(CLNDR.linkOut).toBe('https://calendar.davidpreli.com')
  })
})
