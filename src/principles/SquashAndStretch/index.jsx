import { Button } from '../../components/Button'
import styles from './SquashAndStretch.module.css'

// P01 Squash & Stretch. The Button owns the principle: one scale value
// (scale.pressBase, read from the token system) is both the squash on the way down
// (ease.standard) and the stretch on the release, which rides ease.overshoot
// back past rest. The demo is deliberately bare — a single Button in a stage
// frame — because the principle lives entirely in the component's own press
// animation, not in any surrounding choreography.
export function SquashAndStretch() {
  return (
    <div className={styles.demoArea}>
      <Button>Press me</Button>
    </div>
  )
}
