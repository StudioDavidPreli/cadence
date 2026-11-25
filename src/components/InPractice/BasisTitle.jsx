// The Basis page's animated title (basistitles.riv, David's, 2026-10-15), on
// the display-title convention MeasureTitle follows: four authored per-theme
// instances of one view model, so React binds the active theme's instance and
// writes nothing (no shared Contrast instance, no HC flip, no color writes).
// The <h2> keeps the plain word as the accessible name; the canvas is
// aria-hidden.
//
// Names were read from the file's own contents and are pinned by the rivLint
// contract manifest (e2e/rivlint/manifest.json): artboard `basisTitles`, state
// machine `basisSM`, view model `BasisTitleVM` with darkMode / lightMode /
// contrastLight / contrastDark. The file name is all lowercase
// (`basistitles.riv`), unlike the camelCase titles beside it; the URL below
// matches the file on disk, and the Worker serves paths case-sensitively.
//
// Sizing: the artboard is 1360x506, authored large. The box shows it at
// 480 px wide, the width the Measure and rivLint titles occupy, so the three
// pages read as one family; Fit.Contain scales the art into that box.
//
// The mechanics (instance binding, posters, reduced motion) are PracticeTitle's.
import { PracticeTitle } from './PracticeTitle'

const TITLE = {
  word: 'Basis',
  surface: 'basisTitle',
  src: '/rive/basistitles.riv',
  artboard: 'basisTitles',
  stateMachine: 'basisSM',
  viewModel: 'BasisTitleVM',
}

export function BasisTitle() {
  return <PracticeTitle title={TITLE} />
}
