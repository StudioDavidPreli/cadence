import { Drawer } from '../../components/Drawer'
import styles from './Anticipation.module.css'

// P02 Anticipation. A scoped Drawer dips slightly downward before sliding up —
// that small reverse motion is the anticipation, preparing the eye for arrival.
//
// ── Why drawerOpen / setDrawerOpen are props, not local state ─────────────────
// This is the one demo whose open state is owned by PrincipleCard rather than
// held locally. The card resets the drawer in lockstep with its own collapse
// and Motion/UI toggle (see handleClose / handleStateToggle). Threading the
// state down preserves that coordinated reset; local state would leave the
// drawer open across a toggle. Keeping it threaded is a deliberate exception to
// the otherwise self-contained demos.
export function Anticipation({ drawerOpen, setDrawerOpen }) {
  return (
    <div className={styles.drawerDemo}>
      <button
        className={styles.drawerTrigger}
        onClick={() => setDrawerOpen(true)}
      >
        Open drawer
      </button>
      <Drawer
        scoped
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Anticipation"
      >
        The drawer dips slightly downward before sliding up. That small
        reverse motion is anticipation — preparing the eye for arrival.
      </Drawer>
    </div>
  )
}
