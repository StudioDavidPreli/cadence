import { Carousel } from '../../components/Carousel'
import styles from './FollowThrough.module.css'

// P05 Follow Through & Overlapping Action. The Carousel owns the principle:
// when a slide settles, its trailing elements (the dot indicator, the slide's
// own internal motion) continue past the primary translation and settle a beat
// later. The demo is the Carousel in compact mode inside a draggable stage —
// the follow-through lives in the component's own settle, not in surrounding
// choreography.
export function FollowThrough() {
  return (
    <div className={styles.carouselDemo}>
      <Carousel compact />
    </div>
  )
}
