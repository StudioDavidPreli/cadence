import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BackgroundArt } from './index'
import { loadColorway, MARK_LIBRARY_KEYS } from '../../background/library'

// ─── Does it render at all ────────────────────────────────────────────────────
//
// This file exists because of a bug it would have caught. `nativeDefs` is a
// const that evaluates during render and referenced `symbolPrefix`, which was
// declared sixty lines further down, so every render threw `Cannot access
// 'symbolPrefix' before initialization` and hit the error boundary. Lint did not
// see it, the unit suite did not see it, and the build did not see it, because
// nothing in the project had ever rendered this component.
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

// Two fields, which is the whole palette since the traced and pixel faces went.
// The tone ramp, the grid ink and the high-contrast blanket all belonged to them.
const palette = { tokenInk: '#e1e1e1', theme: 'dark' }

// The real assets, loaded once. Same argument as library.test.js: a fixture
// would prove the renderer works and prove nothing about the art it is handed.
const SHAPES = {}
for (const key of MARK_LIBRARY_KEYS) {
  SHAPES[key] = {
    darkMode: await loadColorway(key, 'darkMode'),
    lightMode: await loadColorway(key, 'lightMode'),
  }
}

const render = (props) =>
  renderToStaticMarkup(
    <BackgroundArt
      width={300}
      height={900}
      baseline={260}
      seed={4242}
      palette={palette}
      libraryKey="tokenLab"
      shapes={SHAPES.tokenLab.darkMode}
      markCount={SHAPES.tokenLab.darkMode.length}
      {...props}
    />,
  )

describe('BackgroundArt renders', () => {
  it.each(MARK_LIBRARY_KEYS)('the %s library without throwing', (key) => {
    for (const colorway of ['darkMode', 'lightMode']) {
      expect(() =>
        render({
          libraryKey: key,
          shapes: SHAPES[key][colorway],
          markCount: SHAPES[key][colorway].length,
        }),
      ).not.toThrow()
    }
  })

  it('draws stamps', () => {
    const html = render({})
    expect(html).toMatch(/<use/)
    expect(html).toMatch(/<defs>/)
  })

  // The bug the arrival structure exists to fix: placement lives in a
  // `transform` attribute, and a CSS-animated `transform` replaces it outright.
  // Markup assertions cannot see a cascade, so the rule is structural instead:
  // an element carrying a transform ATTRIBUTE may not also carry a class whose
  // animation declares `transform`. `.stamp` is that class.
  it('never animates transform on a placed element', () => {
    const html = render({})
    for (const [tag] of html.matchAll(/<(?:use|g)\b[^>]*transform="[^"]*"[^>]*>/g)) {
      const cls = tag.match(/class="([^"]*)"/)?.[1] ?? ''
      expect(cls, `a placed element carries ${cls}`).not.toMatch(/(^|\s)stamp(\s|$)/)
    }
    expect(html).toMatch(/<use/)
  })

  // The two halves of the face have to agree about the id, and they are written
  // sixty lines apart. A `<use>` pointing at nothing renders silently as an empty
  // document, which is precisely the failure that is invisible by eye.
  it('points every use at a group that exists', () => {
    const html = render({})
    const defined = new Set([...html.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]))
    const referenced = [...html.matchAll(/<use[^>]+href="#([^"]+)"/g)].map((m) => m[1])

    expect(defined.size).toBe(SHAPES.tokenLab.darkMode.length)
    expect(referenced.length).toBeGreaterThan(0)
    expect(referenced.filter((id) => !defined.has(id))).toEqual([])
  })

  it('fills and never strokes', () => {
    const html = render({})
    // The authored colorway reaches the document as a real fill, and nothing is
    // stroked. That was the whole difference from the traced face, and it is now
    // simply what the renderer does.
    expect(html).toMatch(/fill="#/)
    expect(html).not.toMatch(/stroke-width=/)
    expect(html).not.toMatch(/stroke="/)
  })

  // A theme switch must repaint without moving anything. The `<use href>` ids
  // carry the seed and not the theme for exactly this reason: same placements,
  // same references, different fills in the defs.
  it('keeps every placement when the colorway changes', () => {
    const placements = (html) =>
      [...html.matchAll(/<g transform="([^"]+)"/g)].map((m) => m[1])
    const dark = render({ shapes: SHAPES.tokenLab.darkMode })
    const light = render({ shapes: SHAPES.tokenLab.lightMode })

    expect(placements(light)).toEqual(placements(dark))
    expect(light).not.toBe(dark)
  })

  // The reveal replay. A CSS animation does not restart just because its class
  // was re-applied to an element that never unmounted, so the pass number has to
  // reach the element keys or the whole feature is a no-op that looks correct in
  // every other respect.
  it('rekeys its stamps when revealKey changes', () => {
    const keysOf = (html) => [...html.matchAll(/<use[^>]+href="#([^"]+)"/g)].map((m) => m[1])
    // Same composition either way: revealKey must not disturb the geometry, only
    // replay the arrival over it.
    expect(keysOf(render({ revealKey: 3 }))).toEqual(keysOf(render({ revealKey: 0 })))
  })

  it('renders nothing rather than throwing before the colorway has landed', () => {
    expect(() => render({ shapes: null, markCount: 0 })).not.toThrow()
    expect(render({ shapes: null, markCount: 0 })).toBe('')
  })

  it('survives an empty library rather than throwing', () => {
    expect(() => render({ shapes: [], markCount: 0 })).not.toThrow()
  })
})
