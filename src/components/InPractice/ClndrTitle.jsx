// CLNDR's animated title (clndrTitle.riv, David's, 2026-11-25). Names were read
// from the file with Rive's runtime and are pinned by the rivLint contract
// manifest (e2e/rivlint/manifest.json): artboard `clndrTitle`, state machine
// `clndrSM`, view model `ClndrTitleVM` with darkMode / lightMode /
// contrastLight / contrastDark.
//
// Sizing: the artboard is 920x355, shown 480 px wide like its siblings. The
// proportion is this title's own, so it brings its own box class.
import { PracticeTitle } from './PracticeTitle'
import styles from './InPractice.module.css'

const TITLE = {
  word: 'CLNDR, studio booking',
  surface: 'clndrTitle',
  src: '/rive/clndrTitle.riv',
  artboard: 'clndrTitle',
  stateMachine: 'clndrSM',
  viewModel: 'ClndrTitleVM',
}

export function ClndrTitle() {
  return <PracticeTitle title={TITLE} boxClassName={styles.clndrTitleAnim} />
}
