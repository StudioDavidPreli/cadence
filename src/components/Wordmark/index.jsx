// Cadence wordmark. Doubles as the home button: returns to the landing (hero),
// collapses both accordion sections, and clears the active destination. It does
// NOT reset token values — the tool bar owns reset, and a second reset path would
// fork the user's model. Lives inside NavigationProvider so it can read the nav
// actions.
//
// The mark is the pixel "Cadence" title inlined from
// public/titleSVGS/title2.svg (that file stays the source of truth; re-run
// the same extraction if the artwork changes). It is inlined rather than loaded
// through <img> on purpose: the two fills read the CSS custom properties
// --hero-glyph (letterform) and --hero-outline (the extruded shadow layer), and
// an <img> would only ever show the authored fallback colors. Inlined here, the
// fills resolve against the active theme. Those two properties are defined in
// src/tokens/color.css, mapped to --color-text-base and --color-accent.
//
// The <svg> is aria-hidden: the button already carries the accessible name, so
// the decorative pixel geometry must not be announced to a screen reader.
//
// The mark artwork depends on where the user is: the Principles section swaps the
// pixel title for the script wordmark (ThemedMark). That means the button now
// reads nav STATE (section), not just the actions, so it re-renders on navigation
// — a deliberate trade for a small component. Everything else (home behavior,
// accessible name) is identical between the two marks.

import { useNavActions, useNavState } from '../../context/NavigationContext'
import { SECTIONS } from '../../data/navigation'
import { ThemedMark } from './ThemedMark'
import { MotionTilesTitle } from '../MotionTiles/MotionTilesTitle'
import styles from './Wordmark.module.css'

export function Wordmark() {
  const { returnHome } = useNavActions()
  const { section } = useNavState()
  const inPrinciples = section === SECTIONS.PRINCIPLES
  // Motion Tiles swaps in its own per-theme title art. It stays inside this
  // button, so the top-left title returns to the landing on click here too, with
  // the same accessible name as the other two marks.
  const inMotionTiles = section === SECTIONS.MOTION_TILES
  return (
    <button
      type="button"
      className={styles.wordmark}
      onClick={returnHome}
      aria-label="Cadence, return to start"
    >
      {inMotionTiles ? (
        <MotionTilesTitle />
      ) : inPrinciples ? (
        <ThemedMark />
      ) : (
      /* shapeRendering="crispEdges" disables edge anti-aliasing. The mark is
          118 abutting rects in horizontal bands (the extruded shadow layer
          behind the letterforms); scaled down to a fractional device-pixel
          size, each shared edge would anti-alias independently and the partial
          coverage would not sum to full opacity, bleeding a hairline of the
          layer beneath through every row boundary (the horizontal "raster
          lines"). Snapping edges to the pixel grid removes the seams, and hard
          pixel edges are correct for a pixel-art mark. */
      <svg
        className={styles.mark}
        viewBox="0 0 976 208"
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
      >
      {/* Extruded shadow layer, drawn first so the letterforms sit on top. Bound
          to --hero-outline (--color-accent), the same token the old dilated
          outline used, so the accent-on-theme contrast reasoning is unchanged. */}
      <g id="textExtruded" fill="var(--hero-outline, #96C1E9)">
      <rect x="80" y="48" width="48" height="16"/>
      <rect x="368" y="48" width="32" height="16"/>
      <rect x="64" y="64" width="32" height="16"/>
      <rect x="112" y="64" width="32" height="16"/>
      <rect x="368" y="64" width="32" height="16"/>
      <rect x="48" y="80" width="32" height="16"/>
      <rect x="192" y="80" width="64" height="16"/>
      <rect x="304" y="80" width="48" height="16"/>
      <rect x="368" y="80" width="32" height="16"/>
      <rect x="448" y="80" width="64" height="16"/>
      <rect x="560" y="80" width="32" height="16"/>
      <rect x="608" y="80" width="32" height="16"/>
      <rect x="704" y="80" width="64" height="16"/>
      <rect x="832" y="80" width="64" height="16"/>
      <rect x="32" y="96" width="32" height="16"/>
      <rect x="176" y="96" width="32" height="16"/>
      <rect x="240" y="96" width="32" height="16"/>
      <rect x="288" y="96" width="48" height="16"/>
      <rect x="352" y="96" width="48" height="16"/>
      <rect x="432" y="96" width="32" height="16"/>
      <rect x="496" y="96" width="32" height="16"/>
      <rect x="560" y="96" width="48" height="16"/>
      <rect x="624" y="96" width="32" height="16"/>
      <rect x="688" y="96" width="48" height="16"/>
      <rect x="752" y="96" width="32" height="16"/>
      <rect x="816" y="96" width="32" height="16"/>
      <rect x="880" y="96" width="32" height="16"/>
      <rect x="32" y="112" width="32" height="16"/>
      <rect x="112" y="112" width="16" height="16"/>
      <rect x="160" y="112" width="32" height="16"/>
      <rect x="240" y="112" width="32" height="16"/>
      <rect x="288" y="112" width="32" height="16"/>
      <rect x="352" y="112" width="32" height="16"/>
      <rect x="416" y="112" width="96" height="16"/>
      <rect x="560" y="112" width="32" height="16"/>
      <rect x="624" y="112" width="32" height="16"/>
      <rect x="672" y="112" width="48" height="16"/>
      <rect x="800" y="112" width="96" height="16"/>
      <rect x="32" y="128" width="32" height="16"/>
      <rect x="96" y="128" width="32" height="16"/>
      <rect x="160" y="128" width="32" height="16"/>
      <rect x="224" y="128" width="32" height="16"/>
      <rect x="288" y="128" width="32" height="16"/>
      <rect x="352" y="128" width="32" height="16"/>
      <rect x="416" y="128" width="32" height="16"/>
      <rect x="544" y="128" width="32" height="16"/>
      <rect x="608" y="128" width="32" height="16"/>
      <rect x="672" y="128" width="32" height="16"/>
      <rect x="736" y="128" width="32" height="16"/>
      <rect x="800" y="128" width="32" height="16"/>
      <rect x="48" y="144" width="64" height="16"/>
      <rect x="176" y="144" width="48" height="16"/>
      <rect x="240" y="144" width="16" height="16"/>
      <rect x="304" y="144" width="80" height="16"/>
      <rect x="432" y="144" width="64" height="16"/>
      <rect x="544" y="144" width="32" height="16"/>
      <rect x="608" y="144" width="32" height="16"/>
      <rect x="688" y="144" width="64" height="16"/>
      <rect x="816" y="144" width="64" height="16"/>
      </g>
      <g id="text" fill="var(--hero-glyph, #0C0C0E)">
      <rect x="96" y="48" width="48" height="16"/>
      <rect x="384" y="48" width="32" height="16"/>
      <rect x="80" y="64" width="32" height="16"/>
      <rect x="128" y="64" width="32" height="16"/>
      <rect x="384" y="64" width="32" height="16"/>
      <rect x="64" y="80" width="32" height="16"/>
      <rect x="208" y="80" width="64" height="16"/>
      <rect x="320" y="80" width="48" height="16"/>
      <rect x="384" y="80" width="32" height="16"/>
      <rect x="464" y="80" width="64" height="16"/>
      <rect x="576" y="80" width="32" height="16"/>
      <rect x="624" y="80" width="32" height="16"/>
      <rect x="720" y="80" width="64" height="16"/>
      <rect x="848" y="80" width="64" height="16"/>
      <rect x="48" y="96" width="32" height="16"/>
      <rect x="192" y="96" width="32" height="16"/>
      <rect x="256" y="96" width="32" height="16"/>
      <rect x="304" y="96" width="48" height="16"/>
      <rect x="368" y="96" width="48" height="16"/>
      <rect x="448" y="96" width="32" height="16"/>
      <rect x="512" y="96" width="32" height="16"/>
      <rect x="576" y="96" width="48" height="16"/>
      <rect x="640" y="96" width="32" height="16"/>
      <rect x="704" y="96" width="48" height="16"/>
      <rect x="768" y="96" width="32" height="16"/>
      <rect x="832" y="96" width="32" height="16"/>
      <rect x="896" y="96" width="32" height="16"/>
      <rect x="48" y="112" width="32" height="16"/>
      <rect x="128" y="112" width="16" height="16"/>
      <rect x="176" y="112" width="32" height="16"/>
      <rect x="256" y="112" width="32" height="16"/>
      <rect x="304" y="112" width="32" height="16"/>
      <rect x="368" y="112" width="32" height="16"/>
      <rect x="432" y="112" width="96" height="16"/>
      <rect x="576" y="112" width="32" height="16"/>
      <rect x="640" y="112" width="32" height="16"/>
      <rect x="688" y="112" width="48" height="16"/>
      <rect x="816" y="112" width="96" height="16"/>
      <rect x="48" y="128" width="32" height="16"/>
      <rect x="112" y="128" width="32" height="16"/>
      <rect x="176" y="128" width="32" height="16"/>
      <rect x="240" y="128" width="32" height="16"/>
      <rect x="304" y="128" width="32" height="16"/>
      <rect x="368" y="128" width="32" height="16"/>
      <rect x="432" y="128" width="32" height="16"/>
      <rect x="560" y="128" width="32" height="16"/>
      <rect x="624" y="128" width="32" height="16"/>
      <rect x="688" y="128" width="32" height="16"/>
      <rect x="752" y="128" width="32" height="16"/>
      <rect x="816" y="128" width="32" height="16"/>
      <rect x="64" y="144" width="64" height="16"/>
      <rect x="192" y="144" width="48" height="16"/>
      <rect x="256" y="144" width="16" height="16"/>
      <rect x="320" y="144" width="80" height="16"/>
      <rect x="448" y="144" width="64" height="16"/>
      <rect x="560" y="144" width="32" height="16"/>
      <rect x="624" y="144" width="32" height="16"/>
      <rect x="704" y="144" width="64" height="16"/>
      <rect x="832" y="144" width="64" height="16"/>
      </g>
      </svg>
      )}
    </button>
  )
}
