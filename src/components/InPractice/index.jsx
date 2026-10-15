import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { DemoMotionControl } from '../DemoMotionGate'
import { BasisTitle } from './BasisTitle'
import { BASIS_SHEET_URL, frameSrc } from './inPracticeModel'
import styles from './InPractice.module.css'

// ─── In Practice › Basis ─────────────────────────────────────────────────────
//
// Basis running Cadence's presets, framed. The page follows Measure and
// rivLint: a Rive title, a description, and in place of a tool, the product in
// use. Decision record: docs/decisions/in-practice-2026-10-14.md.
//
// What crosses into the frame is three query parameters and nothing else: the
// preset name, the theme's Basis stock, and whether motion is reduced. No
// postMessage, no live token values (scope 5 of the record). Every change to
// one of the three is a new `src`, so the frame reloads. That reload is the
// design, not a cost to engineer around: without a message channel it is the
// only way to repaint a cross-origin page.
//
// `preset` comes from TokenLab, already resolved: the tool bar's active
// built-in, or the last one it had while the bar reads Custom (framePreset).
//
// This component is mounted once and then hidden, never unmounted, by
// TokenLab (the remount rule applied to a frame), so its state survives
// section swaps. That is what makes the "View motion" consent last the visit.
export function BasisPractice({ preset }) {
  const { theme } = useTheme()
  const reducedMotion = useReducedMotion()

  // Consent to motion under prefers-reduced-motion: per visit, never stored,
  // the DemoMotionGate model. It is never reset, so it holds across preset,
  // theme and section changes until the page itself reloads.
  const [consented, setConsented] = useState(false)

  const src = frameSrc({ preset, theme, reducedMotion, consented })

  // The src the frame has finished loading. Comparing it with the current src
  // tells us a reload is in flight, so the stand-in can cover the frame until
  // Basis has painted instead of showing a blank white document.
  const [loadedSrc, setLoadedSrc] = useState(null)

  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="Basis">
      <article className={styles.page}>
        <BasisTitle />
        <p className={styles.lede}>
          Basis is a ledger of simulated companies, each figure fed by a live
          public source and carrying the request that produced it. Every
          duration, curve, delay and spring in it comes from cadence-tokens; it
          takes the timing and nothing visual. Framed here it wears Cadence&apos;s
          colors. <a className={styles.link} href={BASIS_SHEET_URL} target="_blank" rel="noopener noreferrer">The full sheet</a> wears
          its own.
        </p>
        {/* The workflow, in Measure's guidance form: three bold imperatives,
            each with its reason. The presets live in the tool bar, so the
            page tells the visitor where to find them rather than repeat them. */}
        <section className={styles.guide} aria-label="How to compare presets">
          <p className={styles.guideRow}>
            <strong>Load a preset.</strong> Standard, Snappy and Cinematic sit
            in the Presets row at the top of the tool bar. The frame reloads
            with whichever one is loaded.
          </p>
          <p className={styles.guideRow}>
            <strong>Sort a column.</strong> Click a header, or tab to it and
            press Enter. Rows travel to their new places in a short stagger,
            and the rising ones lift as they pass. The charted companies stay
            selected; hover one and its line lights with it.
          </p>
          <p className={styles.guideRow}>
            <strong>Switch and sort again.</strong> Same table, same move,
            different timing. An edited slider reads as Custom, which Basis
            cannot run; the frame keeps the last preset it had.
          </p>
        </section>

        {/* Only under the OS preference: everyone else already sees motion. */}
        {reducedMotion && (
          <div className={styles.motionRow}>
            <DemoMotionControl on={consented} onChange={setConsented} />
          </div>
        )}

        <div className={styles.embed}>
          <div className={styles.frameBox}>
            <iframe
              className={styles.frame}
              src={src}
              title={`Basis chart and ledger, ${preset} preset`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setLoadedSrc(src)}
              data-testid="basis-frame"
            />
            {loadedSrc !== src && (
              <div className={styles.frameStandIn} aria-hidden="true">
                Loading Basis…
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
