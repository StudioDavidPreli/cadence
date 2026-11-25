import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { DemoMotionControl } from '../DemoMotionGate'
import { embedSrc } from './inPracticeModel'
import styles from './InPractice.module.css'

// ─── In Practice: the page a leaf is ─────────────────────────────────────────
//
// What every leaf shares: the scroll region, a title, a guidance box, the "View
// motion" control under the OS preference, and the product's frame with a
// stand-in over it while a `src` loads. A leaf supplies its product entry, its
// title, its guidance rows (children) and its names.
//
// What crosses into the frame is three query parameters and nothing else: the
// preset name, the theme, and whether motion is reduced. No postMessage, no
// live token values (scope 5 of docs/decisions/in-practice-2026-10-14.md).
// Every change to one of the three is a new `src`, so the frame reloads. That
// reload is the design, not a cost to engineer around: without a message
// channel it is the only way to repaint a cross-origin page.
//
// A leaf is mounted once and then hidden, never unmounted, by TokenLab (the
// remount rule applied to a frame), so this state survives section swaps. That
// is what makes the "View motion" consent last the visit, leaf by leaf.
export function PracticePage({
  product,
  preset,
  name,
  title,
  guideLabel,
  frameTitle,
  frameTestId,
  pageClassName = styles.page,
  children,
}) {
  const { theme } = useTheme()
  const reducedMotion = useReducedMotion()

  // Consent to motion under prefers-reduced-motion: per visit, never stored,
  // the DemoMotionGate model. It is never reset, so it holds across preset,
  // theme and section changes until the page itself reloads.
  const [consented, setConsented] = useState(false)

  const src = embedSrc(product, { preset, theme, reducedMotion, consented })

  // The src the frame has finished loading. Comparing it with the current src
  // tells us a reload is in flight, so the stand-in can cover the frame until
  // the product has painted instead of showing a blank white document.
  const [loadedSrc, setLoadedSrc] = useState(null)

  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label={name}>
      <article className={pageClassName}>
        {title}
        <section className={styles.guide} aria-label={guideLabel}>
          {children}
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
              title={frameTitle}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setLoadedSrc(src)}
              data-testid={frameTestId}
            />
            {loadedSrc !== src && (
              <div className={styles.frameStandIn} aria-hidden="true">
                Loading {name}…
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
