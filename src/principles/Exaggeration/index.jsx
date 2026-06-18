import { useState } from 'react'
import { Button } from '../../components/Button'
import { NotificationBadge } from '../../components/NotificationBadge'
import styles from './Exaggeration.module.css'

// P10 Exaggeration. The badge's overshoot on increment is the alert. Two
// triggers in the narrow demo column: New (climb) and Clear (return to
// rest). Disabling Clear at zero prevents a no-op press from looking like
// nothing happened.
export function Exaggeration() {
  const [count, setCount] = useState(0)
  return (
    <div className={styles.exaggerationDemo}>
      <NotificationBadge count={count} label="Inbox" />
      <div className={styles.exaggerationButtonRow}>
        <Button onClick={() => setCount(c => c + 1)}>New</Button>
        <Button onClick={() => setCount(0)}>Clear</Button>
      </div>
    </div>
  )
}
