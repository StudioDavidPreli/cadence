import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BackgroundArt } from './index'
import { MARK_LIBRARIES, MARK_PALETTES, MARK_SHAPES } from '../../background/library'

// ─── Does it render at all ────────────────────────────────────────────────────
//
// This file exists because of a bug it would have caught. `nativeDefs` is a
// const that evaluates during render and referenced `symbolPrefix`, which was
// declared sixty lines further down, so every native-face render threw
// `Cannot access 'symbolPrefix' before initialization` and hit the error
// boundary. Lint did not see it, the unit suite did not see it, and the build
// did not see it, because nothing in the project had ever rendered this
// component.
//
// Server rendering rather than a DOM harness, which is what makes it free: the
// project has no jsdom and no testing-library, and does not need them for this.
// `renderToStaticMarkup` runs the render body and never runs an effect, and both
// hooks this component depends on are written for that: `useMediaQuery` guards
// on `typeof window` in its initializer, and `useMotionTokens` does its
// getComputedStyle read inside `useEffect`. So the first render is exactly the
// pure part, which is the part that can throw.
//
// What this does NOT cover: anything an effect does, any measurement, and
// anything about how it looks. It answers one question, which is the question
// nothing else was asking.

// One shim, and worth naming what it admits. The component is not fully pure at
// render time: the idle timing calls `backgroundIdlePeriodSeconds()` in a memo,
// which reads `--feedback-background-idle-period` off the document. That is the
// chrome-timing rule working as designed (no literals, read the token), and it
// means a render needs a document even before any effect runs.
//
// Returning an empty string is deliberate rather than lazy: it drives
// `parseTokenValue` down its fallback path, so these tests exercise the branch
// that runs when a token is missing, which is the one that produced the NaN
// crash of 2026-07-15. `window` is left undefined so `useMediaQuery` reports
// no-reduce deterministically.
const realGetComputedStyle = globalThis.getComputedStyle
const realDocument = globalThis.document

beforeAll(() => {
  globalThis.document = { documentElement: {} }
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })
})

afterAll(() => {
  globalThis.getComputedStyle = realGetComputedStyle
  globalThis.document = realDocument
})

const palette = {
  tokenInk: '#e1e1e1',
  ramp: ['#3a3a3a', '#5c5c5c', '#8a8a8a', '#c4c4c4'],
  grid: '#2a2a2a',
  blanket: null,
  theme: 'dark',
}

const render = (props) =>
  renderToStaticMarkup(
    <BackgroundArt
      width={300}
      height={900}
      baseline={260}
      seed={4242}
      palette={palette}
      {...props}
    />,
  )

const LIBRARIES = Object.keys(MARK_LIBRARIES)
const FACES = ['vector', 'native', 'pixel', 'both']

describe('BackgroundArt renders', () => {
  it.each(FACES)('in the %s face without throwing', (face) => {
    expect(() =>
      render({
        face,
        library: MARK_LIBRARIES.tokenLab,
        shapes: MARK_SHAPES.tokenLab.darkMode,
        markPalette: MARK_PALETTES.tokenLab.darkMode,
      }),
    ).not.toThrow()
  })

  it.each(LIBRARIES)('for the %s library in every face', (key) => {
    for (const face of FACES) {
      expect(() =>
        render({
          face,
          library: MARK_LIBRARIES[key],
          shapes: MARK_SHAPES[key].lightMode,
          markPalette: MARK_PALETTES[key].lightMode,
        }),
      ).not.toThrow()
    }
  })

  it('draws stamps in the vector face', () => {
    const html = render({ face: 'vector', library: MARK_LIBRARIES.tokenLab })
    expect(html).toMatch(/<path/)
    expect(html).toMatch(/stroke=/)
  })

  // The bug this whole trio of arrivals exists to fix: placement lives in a
  // `transform` attribute, and a CSS-animated `transform` replaces it outright.
  // Markup assertions cannot see a cascade, so the rule is structural instead:
  // an element carrying a transform ATTRIBUTE may not also carry a class whose
  // animation declares `transform`. `.stamp` is that class.
  it('never animates transform on a placed element', () => {
    const html = render({
      face: 'native',
      library: MARK_LIBRARIES.tokenLab,
      shapes: MARK_SHAPES.tokenLab.darkMode,
      markPalette: MARK_PALETTES.tokenLab.darkMode,
    })
    // Every opening tag that declares a transform attribute, with its classes.
    for (const [tag] of html.matchAll(/<(?:use|g)\b[^>]*transform="[^"]*"[^>]*>/g)) {
      const cls = tag.match(/class="([^"]*)"/)?.[1] ?? ''
      expect(cls, `a placed element carries ${cls}`).not.toMatch(/(^|\s)stamp(\s|$)/)
    }
    expect(html).toMatch(/<use/)
  })

  // The native face's two halves have to agree about the id, and they are
  // written sixty lines apart. A `<use>` pointing at nothing renders silently as
  // an empty document, which is precisely the failure that is invisible by eye.
  it('points every native use at a group that exists', () => {
    const html = render({
      face: 'native',
      library: MARK_LIBRARIES.tokenLab,
      shapes: MARK_SHAPES.tokenLab.darkMode,
      markPalette: MARK_PALETTES.tokenLab.darkMode,
    })
    const defined = new Set([...html.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]))
    const referenced = [...html.matchAll(/<use[^>]+href="#([^"]+)"/g)].map((m) => m[1])

    expect(defined.size).toBe(MARK_SHAPES.tokenLab.darkMode.length)
    expect(referenced.length).toBeGreaterThan(0)
    expect(referenced.filter((id) => !defined.has(id))).toEqual([])
  })

  it('fills in the native face and strokes in neither', () => {
    const html = render({
      face: 'native',
      library: MARK_LIBRARIES.tokenLab,
      shapes: MARK_SHAPES.tokenLab.darkMode,
      markPalette: MARK_PALETTES.tokenLab.darkMode,
    })
    // The authored colorway reaches the document as a real fill, and nothing in
    // this face is stroked: that is the whole difference from the traced one.
    expect(html).toMatch(/fill="#/)
    expect(html).not.toMatch(/stroke-width=/)
  })

  // The reveal replay. A CSS animation does not restart just because its class
  // was re-applied to an element that never unmounted, so the pass number has to
  // reach the element keys or the whole feature is a no-op that looks correct in
  // every other respect.
  it('rekeys its stamps when revealKey changes', () => {
    const keysOf = (html) => [...html.matchAll(/<use[^>]+href="#([^"]+)"/g)].map((m) => m[1])
    const first = render({
      face: 'native',
      revealKey: 0,
      library: MARK_LIBRARIES.tokenLab,
      shapes: MARK_SHAPES.tokenLab.darkMode,
    })
    // Same composition either way: revealKey must not disturb the geometry, only
    // replay the arrival over it.
    const second = render({
      face: 'native',
      revealKey: 3,
      library: MARK_LIBRARIES.tokenLab,
      shapes: MARK_SHAPES.tokenLab.darkMode,
    })
    expect(keysOf(second)).toEqual(keysOf(first))
    expect(second).toMatch(/<use/)
  })

  it('survives an empty library rather than throwing', () => {
    expect(() => render({ face: 'native', library: [], shapes: [] })).not.toThrow()
    expect(() => render({ face: 'vector', library: [] })).not.toThrow()
  })

  // A native render with no shapes handed to it is a wiring mistake, not a
  // crash: the caller resolved a colorway the library does not have.
  it('renders nothing rather than breaking when native has no shapes', () => {
    expect(() =>
      render({ face: 'native', library: MARK_LIBRARIES.tokenLab, shapes: null }),
    ).not.toThrow()
  })
})
