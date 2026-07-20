import { Carousel } from '../../components/Carousel'
import styles from './FollowThrough.module.css'

// P05 Follow Through & Overlapping Action. The Carousel owns the principle:
// when a slide settles, its trailing elements (the dot indicator, the slide's
// own internal motion) continue past the primary translation and settle a beat
// later. The demo is the Carousel in compact mode inside a draggable stage —
// the follow-through lives in the component's own settle, not in surrounding
// choreography.
//
// motionMode="spring": this principle IS follow-through, and a real physics
// spring is the truest follow-through there is, so the demo runs the spring
// rather than the overshoot bezier. Under reduced motion the Carousel falls back
// to the flattened bezier (it reads tokens.reducedMotion), so this stays honest
// to the app's reduced-motion policy; the card's own View-motion gate governs
// whether it plays at all.
export function FollowThrough() {
  return (
    <div className={styles.carouselDemo}>
      <Carousel compact motionMode="spring" />
    </div>
  )
}
