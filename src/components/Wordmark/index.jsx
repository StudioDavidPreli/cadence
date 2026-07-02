// Cadence wordmark. Doubles as the home button: returns to the landing (hero),
// collapses both accordion sections, and clears the active destination. It does
// NOT reset token values — the tool bar owns reset, and a second reset path would
// fork the user's model. Lives inside NavigationProvider so it can read the nav
// actions.
//
// The mark is the pixel "Cadence" title inlined from
// public/titleSVGS/titleThemed.svg (that file stays the source of truth; re-run
// the same extraction if the artwork changes). It is inlined rather than loaded
// through <img> on purpose: the two fills read the CSS custom properties
// --hero-glyph (letterform) and --hero-outline (the dilated halo), and an <img>
// would only ever show the authored fallback colors. Inlined here, the fills
// resolve against the active theme. Those two properties are defined in
// src/tokens/color.css, mapped to --color-text-base and --color-accent.
//
// The <svg> is aria-hidden: the button already carries the accessible name, so
// the decorative pixel geometry must not be announced to a screen reader.

import { useNavActions } from '../../context/NavigationContext'
import styles from './Wordmark.module.css'

export function Wordmark() {
  const { returnHome } = useNavActions()
  return (
    <button
      type="button"
      className={styles.wordmark}
      onClick={returnHome}
      aria-label="Cadence, return to start"
    >
      {/* shapeRendering="crispEdges" disables edge anti-aliasing. The mark is
          108 abutting rects in horizontal bands; scaled down to a fractional
          device-pixel size, each shared edge would anti-alias independently and
          the partial coverage would not sum to full opacity, bleeding a hairline
          of the layer beneath through every row boundary (the horizontal "raster
          lines"). Snapping edges to the pixel grid removes the seams, and hard
          pixel edges are correct for a pixel-art mark. */}
      <svg
        className={styles.mark}
        viewBox="-48 -48 976 208"
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
      >
      <g id="outline" fill="var(--hero-outline, #598FF8)">
      <rect x="48" y="-48" width="48" height="8"/>
      <rect x="336" y="-48" width="32" height="8"/>
      <rect x="24" y="-40" width="96" height="8"/>
      <rect x="312" y="-40" width="80" height="8"/>
      <rect x="16" y="-32" width="112" height="8"/>
      <rect x="304" y="-32" width="96" height="8"/>
      <rect x="8" y="-24" width="128" height="8"/>
      <rect x="296" y="-24" width="112" height="8"/>
      <rect x="0" y="-16" width="144" height="8"/>
      <rect x="160" y="-16" width="64" height="8"/>
      <rect x="272" y="-16" width="136" height="8"/>
      <rect x="416" y="-16" width="64" height="8"/>
      <rect x="528" y="-16" width="32" height="8"/>
      <rect x="576" y="-16" width="32" height="8"/>
      <rect x="672" y="-16" width="64" height="8"/>
      <rect x="800" y="-16" width="64" height="8"/>
      <rect x="-8" y="-8" width="640" height="8"/>
      <rect x="648" y="-8" width="112" height="8"/>
      <rect x="776" y="-8" width="112" height="8"/>
      <rect x="-16" y="0" width="912" height="8"/>
      <rect x="-24" y="8" width="928" height="8"/>
      <rect x="-32" y="16" width="944" height="8"/>
      <rect x="-40" y="24" width="960" height="8"/>
      <rect x="-40" y="32" width="960" height="8"/>
      <rect x="-40" y="40" width="960" height="8"/>
      <rect x="-48" y="48" width="976" height="8"/>
      <rect x="-48" y="56" width="976" height="8"/>
      <rect x="-48" y="64" width="968" height="8"/>
      <rect x="-48" y="72" width="968" height="8"/>
      <rect x="-48" y="80" width="968" height="8"/>
      <rect x="-48" y="88" width="960" height="8"/>
      <rect x="-40" y="96" width="944" height="8"/>
      <rect x="-40" y="104" width="936" height="8"/>
      <rect x="-40" y="112" width="928" height="8"/>
      <rect x="-32" y="120" width="920" height="8"/>
      <rect x="-24" y="128" width="912" height="8"/>
      <rect x="-16" y="136" width="896" height="8"/>
      <rect x="-8" y="144" width="112" height="8"/>
      <rect x="120" y="144" width="624" height="8"/>
      <rect x="760" y="144" width="112" height="8"/>
      <rect x="16" y="152" width="64" height="8"/>
      <rect x="144" y="152" width="48" height="8"/>
      <rect x="208" y="152" width="16" height="8"/>
      <rect x="272" y="152" width="80" height="8"/>
      <rect x="400" y="152" width="64" height="8"/>
      <rect x="512" y="152" width="32" height="8"/>
      <rect x="576" y="152" width="32" height="8"/>
      <rect x="656" y="152" width="64" height="8"/>
      <rect x="784" y="152" width="64" height="8"/>
      </g>
      <g id="text" fill="var(--hero-glyph, #0C0C0E)">
      <rect x="48" y="0" width="48" height="16"/>
      <rect x="336" y="0" width="32" height="16"/>
      <rect x="32" y="16" width="32" height="16"/>
      <rect x="80" y="16" width="32" height="16"/>
      <rect x="336" y="16" width="32" height="16"/>
      <rect x="16" y="32" width="32" height="16"/>
      <rect x="160" y="32" width="64" height="16"/>
      <rect x="272" y="32" width="48" height="16"/>
      <rect x="336" y="32" width="32" height="16"/>
      <rect x="416" y="32" width="64" height="16"/>
      <rect x="528" y="32" width="32" height="16"/>
      <rect x="576" y="32" width="32" height="16"/>
      <rect x="672" y="32" width="64" height="16"/>
      <rect x="800" y="32" width="64" height="16"/>
      <rect x="0" y="48" width="32" height="16"/>
      <rect x="144" y="48" width="32" height="16"/>
      <rect x="208" y="48" width="32" height="16"/>
      <rect x="256" y="48" width="48" height="16"/>
      <rect x="320" y="48" width="48" height="16"/>
      <rect x="400" y="48" width="32" height="16"/>
      <rect x="464" y="48" width="32" height="16"/>
      <rect x="528" y="48" width="48" height="16"/>
      <rect x="592" y="48" width="32" height="16"/>
      <rect x="656" y="48" width="48" height="16"/>
      <rect x="720" y="48" width="32" height="16"/>
      <rect x="784" y="48" width="32" height="16"/>
      <rect x="848" y="48" width="32" height="16"/>
      <rect x="0" y="64" width="32" height="16"/>
      <rect x="80" y="64" width="16" height="16"/>
      <rect x="128" y="64" width="32" height="16"/>
      <rect x="208" y="64" width="32" height="16"/>
      <rect x="256" y="64" width="32" height="16"/>
      <rect x="320" y="64" width="32" height="16"/>
      <rect x="384" y="64" width="96" height="16"/>
      <rect x="528" y="64" width="32" height="16"/>
      <rect x="592" y="64" width="32" height="16"/>
      <rect x="640" y="64" width="48" height="16"/>
      <rect x="768" y="64" width="96" height="16"/>
      <rect x="0" y="80" width="32" height="16"/>
      <rect x="64" y="80" width="32" height="16"/>
      <rect x="128" y="80" width="32" height="16"/>
      <rect x="192" y="80" width="32" height="16"/>
      <rect x="256" y="80" width="32" height="16"/>
      <rect x="320" y="80" width="32" height="16"/>
      <rect x="384" y="80" width="32" height="16"/>
      <rect x="512" y="80" width="32" height="16"/>
      <rect x="576" y="80" width="32" height="16"/>
      <rect x="640" y="80" width="32" height="16"/>
      <rect x="704" y="80" width="32" height="16"/>
      <rect x="768" y="80" width="32" height="16"/>
      <rect x="16" y="96" width="64" height="16"/>
      <rect x="144" y="96" width="48" height="16"/>
      <rect x="208" y="96" width="16" height="16"/>
      <rect x="272" y="96" width="80" height="16"/>
      <rect x="400" y="96" width="64" height="16"/>
      <rect x="512" y="96" width="32" height="16"/>
      <rect x="576" y="96" width="32" height="16"/>
      <rect x="656" y="96" width="64" height="16"/>
      <rect x="784" y="96" width="64" height="16"/>
      </g>
      </svg>
    </button>
  )
}
