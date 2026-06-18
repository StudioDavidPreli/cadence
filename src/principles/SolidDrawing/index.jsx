import { Card } from '../../components/Card'
import styles from './SolidDrawing.module.css'

// P11 Solid Drawing. The Card owns the principle: on select it lifts (scale +
// elevation) so it reads as a solid object with weight and depth rather than a
// flat rectangle. The lift respects the component's three-dimensional form.
export function SolidDrawing() {
  return (
    <div className={styles.cardDemo}>
      <Card
        className={styles.cardDemoCard}
        title="Solid drawing"
        description="Click to lift."
        tag="Demo"
      />
    </div>
  )
}
