import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProblemLoopScene } from './ProblemLoopScene'
import { SpringVsOvershootScene } from './SpringVsOvershootScene'
import { PrincipleTriggerScene } from './PrincipleTriggerScene'
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

// ─── Capture rig entry ────────────────────────────────────────────────────────
// Mounted by main.jsx instead of the app when the build carries VITE_CAPTURE=1
// and the URL carries ?capture=<scene>. See main.jsx for the gate and the
// tree-shaking argument; see src/caseStudyMedia/README.md for how to run it.
//
// Scenes registry: one entry per clip on the visual-aid checklist that needs
// a self-driving control. V04 (spring stiffness) and V09 (plant growth) are
// expected to join V02 here, reusing useTokenRamp with their own targets.
const SCENES = {
  'problem-loop': { component: ProblemLoopScene, theme: 'high-contrast-dark' },
  'spring-vs-overshoot': { component: SpringVsOvershootScene, theme: 'dark' },
  'hierarchy-of-motion': { component: HierarchyOfMotionScene, theme: 'dark' },
  'solid-drawing': { component: SolidDrawingScene, theme: 'dark' },
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
