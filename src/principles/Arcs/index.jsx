import { Tooltip } from '../../components/Tooltip'
import styles from './Arcs.module.css'

// P07 Arc. The Tooltip owns the principle: it rests above its trigger and
// travels to that rest position along a curved path, arcing through a
// mid-point higher than its endpoint rather than translating in a straight
// line. The arc lives in the component's own entrance motion.
export function Arcs() {
  return (
    <div className={styles.tooltipDemo}>
      <Tooltip text="Hello!" />
    </div>
  )
}
