import { useEffect } from 'react'
import { MotionTilesLogo } from './MotionTilesLogo'
import { EnterGridButton } from './EnterGridButton'
import styles from './MotionTilesLanding.module.css'

// The Motion Tiles landing: the intro that gates the heavy webgl2 grid behind an
// explicit Enter. It imports nothing from @rive-app/react-webgl2 statically, so
// it stays in the main bundle and the runtime does not parse until the grid
// mounts. Copy written against docs/voice/voice-analysis.md (register-shifted for
// portfolio prose: present tense, physical first, the last line does the work).
export function MotionTilesLanding({ onEnter }) {
  // Prefetch the lazy grid chunk while the user reads the landing. The same
  // specifier MotionTilesSection's React.lazy uses resolves to the same chunk,
  // so by Enter the fetch is done (or in flight) and the Suspense fallback
  // rarely paints. A dynamic import only downloads and parses; nothing mounts
  // and no GL context is created until the user actually enters. Fire-and-
  // forget: a failed prefetch just means Enter falls back to fetching then.
  //
  // Once the chunk resolves, prefetch the grid's .riv assets the same way. The
  // resolved module exports RIV_PREFETCH_MANIFEST (the exact URLs its mount
  // path fetches, ~400 kB across ~19 files), so warming them here means Enter
  // paints the mosaic whole instead of trickling in tile by tile on a cold
  // cache. Reading each body to completion (arrayBuffer) is what commits the
  // response to the HTTP cache — an unread body may never finish downloading.
  // Skipped under the OS data-saver setting: prefetch is a bandwidth bet, and
  // that flag is the user declining the bet. The cancelled flag only stops
  // NEW fetches from starting if the landing unmounts; in-flight ones finish
  // harmlessly (if the user entered, the grid wants these exact files anyway).
  useEffect(() => {
    let cancelled = false
    import('./MotionTilesGrid')
      .then((m) => {
        if (cancelled || navigator.connection?.saveData) return
        for (const url of m.RIV_PREFETCH_MANIFEST) {
          fetch(url, { priority: 'low' })
            .then((r) => r.arrayBuffer())
            .catch(() => {})
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return (
    <div className={styles.landing}>
      <div className={styles.inner}>
        <MotionTilesLogo />
        <p className={styles.body}>
          A grid of tiles, every one moving on the same tokens. Change a preset and
          they all retime together. Drag the stagger and the change crosses the
          field in a wave.
        </p>
        <p className={styles.body}>
          Token Lab tunes one component. Here the same vocabulary drives a whole
          field: set the grid size, thin the motion out, reshuffle the arrangement.
        </p>
        <p className={styles.body}>
          The tiles are Rive. The clock is React. None of it is hardcoded: the
          bindings were wired by Claude Code working the Rive MCP, and that's part
          of the demonstration.
        </p>
        <p className={styles.body}>
          Hidden among the tiles is Clawd, the Claude Code mascot, here as a
          thank-you to the tools. Clawd is Anthropic's trademark. Motion Tiles is
          an independent, non-commercial project with no affiliation, no
          endorsement.
        </p>
        <EnterGridButton onEnter={onEnter} />
      </div>
    </div>
  )
}
