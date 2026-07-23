import { BackgroundArt } from '../BackgroundArt'
import { MARK_LIBRARY } from '../../background/library'

// The lazy chunk's contents. Everything the background system needs is imported
// HERE rather than in NavBackground, so the flag-off path pulls none of it into
// the main bundle: not the mark library, not the L-system, not the flattener.
//
// Splitting the boundary this way (a thin flagged wrapper that dynamically
// imports a module holding the real imports) is the same shape the Motion Tiles
// grid uses for its own chunk.
export default function NavBackgroundArt(props) {
  return <BackgroundArt {...props} library={MARK_LIBRARY} />
}
