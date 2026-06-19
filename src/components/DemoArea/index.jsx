import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavState } from '../../context/NavigationContext'
import { navDurationSeconds } from '../../utils/feedbackDuration'
import { DemoOverlayContext } from './overlayContext'
import styles from './DemoArea.module.css'

// ─── DemoArea ─────────────────────────────────────────────────────────────────
//
// The right column. Shows exactly one destination at a time, decided entirely by
// navigation state: a Token Lab category, the Principles grid, or the hero when
// nothing is selected. The hero is the absence of a destination, not a flag.
//
// Transition: a layered crossfade. The incoming layer mounts on top and fades
// from 0 to 1; the outgoing layer holds fully visible underneath and is removed
// only once the incoming layer is opaque, so its departure is hidden behind the
// new content. No gap, no visible exit. Both directions use the same mechanic.
//
// The crossfade reads --feedback-nav-duration (a fixed value), NOT the editable
// --motion-* tokens. Explore mode can drag those to near zero; navigation chrome
// must not be collapsible into an imperceptible jump. See motion.css.

export function DemoArea({ categoryContent, principlesContent, hero }) {
  const { destination } = useNavState()
  const reduce = useReducedMotion()
  const activeKey = destination ?? 'hero'

  // Frozen content snapshot per key. During the crossfade BOTH layers are
  // mounted; without freezing, React would feed the new destination's children
  // into the exiting layer too, so any stateful demo (or any layoutId element)
  // would briefly exist in two places and lose state / corrupt the projection
  // tree. We write the slot only for the active key, so the exiting layer keeps
  // rendering what it had when it was active. Same pattern the old TabPanel used.
  const frozen = useRef({})
  frozen.current[activeKey] =
    activeKey === 'hero'
      ? hero
      : activeKey === 'principles'
        ? principlesContent
        : (categoryContent[activeKey] ?? null)

  // Monotonic z-index so the newest layer always paints on top of the one it is
  // replacing, regardless of AnimatePresence's DOM ordering. Bumped only when
  // the active key actually changes. Mutating a ref during render is the same
  // idiom the frozen-content snapshot above uses.
  const prevKeyRef = useRef(null)
  const zCounter = useRef(0)
  const zMap = useRef({})
  if (prevKeyRef.current !== activeKey) {
    zCounter.current += 1
    zMap.current[activeKey] = zCounter.current
    prevKeyRef.current = activeKey
  }

  const navDur = navDurationSeconds(reduce)

  // The overlay mount node, captured by a callback ref into state so consumers
  // re-render once it exists. Overlay demos only open on user click, well after
  // mount, so the node is always present by then.
  const [overlayNode, setOverlayNode] = useState(null)

  return (
    <div className={styles.demoArea}>
      <DemoOverlayContext.Provider value={overlayNode}>
        <AnimatePresence initial={false}>
          <motion.div
            key={activeKey}
            className={styles.layer}
            style={{ zIndex: zMap.current[activeKey] }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // Hold fully visible, then remove once the incoming layer is opaque.
            // delay = navDur keeps the outgoing layer mounted under the incoming
            // fade; duration 0 makes its actual removal instant and hidden.
            exit={{ opacity: 0, transition: { delay: navDur, duration: 0 } }}
            transition={{ duration: navDur, ease: 'easeInOut' }}
          >
            {frozen.current[activeKey]}
          </motion.div>
        </AnimatePresence>
      </DemoOverlayContext.Provider>

      {/* Overlay mount for scoped Drawer/Modal demos. Rendered after the layers
          so it stacks above them, fills the column (inset: 0), and is
          click-through when empty (see .overlayRoot). */}
      <div ref={setOverlayNode} className={styles.overlayRoot} />
    </div>
  )
}
