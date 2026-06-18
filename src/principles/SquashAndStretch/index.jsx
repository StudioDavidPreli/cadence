import { Button } from '../../components/Button'
import styles from './SquashAndStretch.module.css'

// P01 Squash & Stretch. The Button owns the principle: its press deformation
// (scale.press, read from the token system) is squash on the way down and the
// release back to rest is the stretch. The demo is deliberately bare — a single
// Button in a stage frame — because the principle lives entirely in the
// component's own press animation, not in any surrounding choreography.
export function SquashAndStretch() {
  return (
    <div className={styles.demoArea}>
      <Button>Press me</Button>
    </div>
  )
}
