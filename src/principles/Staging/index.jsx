import { useState } from 'react'
import { Modal } from '../../components/Modal'
import styles from './Staging.module.css'

// P03 Staging. Scoped Modal inside a position:relative; overflow:hidden
// frame. Open trigger raises the panel; backdrop dims the frame. Local
// state is sufficient — when the card collapses, the demo unmounts and
// isOpen resets. Modal handles its own Escape and backdrop-click closes.
export function Staging() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={styles.modalDemo}>
      <button
        className={styles.drawerTrigger}
        onClick={() => setIsOpen(true)}
      >
        Open modal
      </button>
      <Modal
        scoped
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Discard changes?"
      >
        <p>
          The backdrop dims. The page narrows to one decision.
        </p>
      </Modal>
    </div>
  )
}
