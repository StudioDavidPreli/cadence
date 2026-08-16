import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProblemLoopScene } from './ProblemLoopScene'
import { SpringVsOvershootScene } from './SpringVsOvershootScene'
import { PrincipleTriggerScene } from './PrincipleTriggerScene'
import { PrincipleCardFlipScene } from './PrincipleCardFlipScene'
import { ExportFormatsScene } from './ExportFormatsScene'
import { RiveEmbedScene } from './RiveEmbedScene'
import { PresetsExploreScene } from './PresetsExploreScene'
import { HierarchyOfMotion } from '../../principles/HierarchyOfMotion'
import { SolidDrawing } from '../../principles/SolidDrawing'
import { THEMES } from '../../context/ThemeContext'
import rigStyles from './CaptureRig.module.css'

// V01 demo-video scenes: one expanded-card principle demo each, remote
// trigger out of frame. Captured individually (David's spec, 2026-08-05).
const HierarchyOfMotionScene = () => (
  <PrincipleTriggerScene sceneName="hierarchy-of-motion" demo={HierarchyOfMotion} />
)
const SolidDrawingScene = () => (
  <PrincipleTriggerScene sceneName="solid-drawing" demo={SolidDrawing} />
)

// The card counterparts to those two: the whole expanded card rather than the
// demo alone, flipping Motion to UI from a trigger above the crop line
// (David's spec, 2026-08-13). Kept as separate keys so the demo-only framing
// above stays reproducible.
const SolidDrawingCardScene = () => (
  <PrincipleCardFlipScene sceneName="solid-drawing-card" slug="solid-drawing" />
)
const HierarchyOfMotionCardScene = () => (
  <PrincipleCardFlipScene sceneName="hierarchy-of-motion-card" slug="hierarchy-of-motion" />
)
const SquashAndStretchCardScene = () => (
  <PrincipleCardFlipScene sceneName="squash-and-stretch-card" slug="squash-and-stretch" />
)

// ─── Capture rig entry ────────────────────────────────────────────────────────
// Mounted by main.jsx instead of the app when the build carries VITE_CAPTURE=1
// and the URL carries ?capture=<scene>. See main.jsx for the gate and the
// tree-shaking argument; see src/caseStudyMedia/README.md for how to run it.
//
// Scenes registry: one entry per clip on the visual-aid checklist that needs
// a self-driving control. V04 (spring stiffness) and V09 (plant growth) are
// expected to join V02 here, reusing useTokenRamp with their own targets.
//
// Three scenes here are composed for a PLATE, not a full frame. export-formats
// draws an 864 x 978 box to match the green area of the 3D composite's scene
// map; rive-embed and presets-explore both draw 1728 x 864, the red area of
// riveBlockReference.png, centered in a 1920 x 1080 frame. Every other scene
// fills the window and is cropped by eye.
//
// rive-embed's `theme` here sets the CODE PANEL and the rig chrome only. The
// canvas runs its own four-theme cycle scoped to the Rive instance, which is
// the subject of that clip; see the scene's header for why the two are kept
// apart.
const SCENES = {
  'problem-loop': { component: ProblemLoopScene, theme: 'high-contrast-dark' },
  'spring-vs-overshoot': { component: SpringVsOvershootScene, theme: 'dark' },
  'hierarchy-of-motion': { component: HierarchyOfMotionScene, theme: 'dark' },
  'solid-drawing': { component: SolidDrawingScene, theme: 'dark' },
  'solid-drawing-card': { component: SolidDrawingCardScene, theme: 'dark' },
  'hierarchy-of-motion-card': { component: HierarchyOfMotionCardScene, theme: 'dark' },
  'squash-and-stretch-card': { component: SquashAndStretchCardScene, theme: 'dark' },
  'export-formats': { component: ExportFormatsScene, theme: 'dark' },
  'rive-embed': { component: RiveEmbedScene, theme: 'dark' },
  'presets-explore': { component: PresetsExploreScene, theme: 'dark' },
}

function UnknownScene({ requested }) {
  return (
    <div className={rigStyles.unknown}>
      <p>Unknown capture scene: "{requested}"</p>
      <p>Available: {Object.keys(SCENES).join(', ')}</p>
    </div>
  )
}

export function renderCaptureRig(rootEl, sceneName) {
  const scene = SCENES[sceneName]

  // The scene picks its theme by writing the same data-theme attribute the
  // ThemeProvider writes, but deliberately NOT localStorage: the rig must not
  // change what theme David's normal sessions open in. A &theme= URL param
  // overrides the scene default, so alternate-theme takes need no code edit.
  const themeParam = new URLSearchParams(window.location.search).get('theme')
  const theme = THEMES.includes(themeParam) ? themeParam : scene?.theme
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme)
  }

  const Scene = scene?.component
  createRoot(rootEl).render(
    <StrictMode>
      {Scene ? <Scene /> : <UnknownScene requested={sceneName} />}
    </StrictMode>,
  )
}
