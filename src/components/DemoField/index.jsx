import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { FIELD, generateField } from './generateField'
import styles from './DemoField.module.css'

// ─── DemoField ────────────────────────────────────────────────────────────────
//
// The Token Lab demo backdrop: a procedural field of tick marks, regular where
// the demos sit and progressively jittered, rotated, and thinned in open
// space. One field per category page, seeded by the destination key, so each
// page owns a reproducible drawing and the DemoArea crossfade transitions
// between two stable fields with no extra animation code.
//
// This is chrome, not demonstration: fully static, reads no --motion-* tokens,
// and its ink comes from the fixed per-theme --color-demo-field token, so
// nothing in the Token Lab controls can touch it. In the high-contrast themes
// the only available ink is pure black/white, so the component switches the
// generator to sparse mode (see generateField) instead of trying to whisper
// with a color that cannot.
//
// Mounting model: DemoArea renders this as the first child of the crossfade
// layer. The wrapper is position: sticky with height 0 (see the module CSS),
// which pins the field to the layer's visible box while the demo content
// scrolls over it. That choice is deliberate: freedom depends only on
// horizontal position, so scrolling cannot drift the calm zone, and the field
// never needs to know the content's height or re-render on scroll.

export function DemoField({ seed }) {
  const { theme } = useTheme()
  const hostRef = useRef(null)
  const [size, setSize] = useState(null)

  // Measure the crossfade layer (the wrapper's parent) rather than the
  // zero-height wrapper itself. ResizeObserver covers both the initial mount
  // and window/layout resizes; contentRect already excludes the reserved
  // scrollbar gutter, so the field spans exactly the content area.
  useLayoutEffect(() => {
    const layer = hostRef.current?.parentElement
    if (!layer) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({
        w: Math.round(entry.contentRect.width),
        h: Math.round(entry.contentRect.height),
      })
    })
    ro.observe(layer)
    return () => ro.disconnect()
  }, [])

  const sparse = theme.startsWith('high-contrast')

  // Regeneration is cheap (one pass over ~1000 grid vertices) and only runs
  // when the page, the layer size, or the sparse flag changes — never on
  // scroll, never on token edits.
  const marks = useMemo(
    () => (size ? generateField(seed, size.w, size.h, { sparse }) : []),
    [seed, size, sparse],
  )

  const arm = FIELD.markSize / 2

  return (
    <div ref={hostRef} className={styles.field} aria-hidden="true">
      {size && (
        <svg className={styles.svg} width={size.w} height={size.h}>
          <g
            stroke="var(--color-demo-field)"
            strokeWidth="1"
            opacity={FIELD.alpha}
          >
            {marks.map((m) => (
              <g
                key={m.key}
                transform={`translate(${m.x} ${m.y}) rotate(${m.rot})`}
                strokeWidth={m.sw}
              >
                <line x1={-arm} y1="0" x2={arm} y2="0" />
                <line x1="0" y1={-arm} x2="0" y2={arm} />
              </g>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
