import { MotionTilesLogo } from './MotionTilesLogo'
import { EnterGridButton } from './EnterGridButton'
import styles from './MotionTilesLanding.module.css'

// The Motion Tiles landing: the intro that gates the heavy webgl2 grid behind an
// explicit Enter. It imports nothing from @rive-app/react-webgl2, so it stays in
// the main bundle and the runtime does not load until onEnter routes to the grid.
// Copy written against docs/voice/voice-analysis.md (register-shifted for
// portfolio prose: present tense, physical first, the last line does the work).
export function MotionTilesLanding({ onEnter }) {
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
