import { lazy, Suspense } from 'react'
import { useNavState, useNavActions } from '../../context/NavigationContext'
import { MOTION_TILES_GRID } from '../../data/navigation'
import { MotionTilesLanding } from './MotionTilesLanding'
import styles from './MotionTilesSection.module.css'

// The Motion Tiles tool region, rendered in the app shell's demo-area track when
// the section is active. It is two views selected by the navigation destination:
// the landing (the Enter gate) and the live grid.
//
// The lazy boundary is the whole point. MotionTilesGrid is the only importer of
// @rive-app/react-webgl2, so React.lazy code-splits that runtime into a chunk
// that loads only when the grid actually mounts, which is after the user clicks
// Enter (destination -> grid). Token Lab and Principles never pull the runtime,
// and merely opening the Motion Tiles section (the landing) does not either. See
// docs/decisions/motion-tiles-integration-2026-07-13.md.
const MotionTilesGrid = lazy(() =>
  import('./MotionTilesGrid').then((m) => ({ default: m.MotionTilesGrid })),
)

export function MotionTilesSection() {
  const { destination } = useNavState()
  const { enterMotionTilesGrid } = useNavActions()

  // Deep links to #/motion-tiles/grid land here with destination === grid and
  // skip the landing, opting straight into the runtime cost by choice.
  if (destination !== MOTION_TILES_GRID) {
    return <MotionTilesLanding onEnter={enterMotionTilesGrid} />
  }

  return (
    <Suspense fallback={<div className={styles.fallback}>Loading the grid…</div>}>
      <MotionTilesGrid />
    </Suspense>
  )
}
