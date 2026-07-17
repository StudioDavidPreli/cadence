// PrincipleAnimation isolates useRive to a single wrapper component per Rive
// React documentation. This ensures the canvas context is correctly cleaned up
// when the component unmounts (tab change, card collapse, uiMode toggle to UI
// component view) and re-initialized when it mounts again. Do not move useRive
// usage to parent components — that breaks the canvas lifecycle.

import { useRive, useViewModel, useViewModelInstance } from '@rive-app/react-webgl2'
import { useTheme } from '../../context/ThemeContext'
import { useHCContrastColors } from '../../hooks/useHCContrastColors'
import { useRiveSupersampling } from '../../hooks/useRiveSupersampling'
import styles from './PrincipleAnimation.module.css'

// Add entries here as .riv files are produced. `src` is relative to /public.
// `stateMachine` is the name of the state machine inside the .riv file —
// authored in Rive, not derivable from the principle title (P1's machine is
// named "squash&stretchSM" with the literal "&" character; future principles
// may not follow a clean naming convention either, so each entry declares
// its own).
const RIV_FILES = {
  1: { src: '/rive/squash-stretch.riv', stateMachine: 'squash&stretchSM' },
  2: { src: '/rive/anticipation.riv',   stateMachine: 'anticipationSM' },
  3: { src: '/rive/staging.riv',        stateMachine: 'stagingSM' },
  4: { src: '/rive/pose2pose.riv',     stateMachine: 'pose2poseSM' },
  5: { src: '/rive/follow-through.riv', stateMachine: 'followThroughSM' },
  6: { src: '/rive/slowinslowout.riv', stateMachine: 'slowInSlowOutSM' },
  7: { src: '/rive/arc.riv',          stateMachine: 'arcSM' },
  8: { src: '/rive/secondaryaction.riv', stateMachine: 'secondaryActionSM' },
  9:  { src: '/rive/timing.riv',          stateMachine: 'timingSM' },
  10: { src: '/rive/exaggeration.riv',   stateMachine: 'exaggerationSM' },
  11: { src: '/rive/solid-drawing.riv',  stateMachine: 'solidDrawingSM' },
  12: { src: '/rive/appeal.riv',         stateMachine: 'appealSM' },
  13: { src: '/rive/systematization.riv', stateMachine: 'systematizationSM' },
  14: { src: '/rive/hierarchyofmotion.riv', stateMachine: 'hierarchyOfMotionSM' },
  15: { src: '/rive/economy.riv',           stateMachine: 'economySM' },
  16: { src: '/rive/tokenfidelity.riv',     stateMachine: 'tokenFidelitySM' },
  17: { src: '/rive/reducedMotion.riv',     stateMachine: 'reducedMotionSM' },
  18: { src: '/rive/sharedvocabulary.riv',  stateMachine: 'sharedVocabularySM' },
}

// Map ThemeContext theme values to the view model instance names defined in the
// .riv files. Both high-contrast themes bind the single authored 'Contrast'
// instance; high-contrast-dark flips its stroke/fill at runtime via
// useHCContrastColors rather than needing a separate 'ContrastDark' instance.
const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast-light': 'Contrast',
  'high-contrast-dark': 'Contrast',
}

// ─── PrincipleAnimation ───────────────────────────────────────────────────────
//
// Routes to RiveCanvas when a .riv file exists for the given principleId, or to
// a text fallback when one does not. PrincipleCard uses this component
// unconditionally — the missing-animation case is handled here, not there.

export function PrincipleAnimation({ principleId, className }) {
  const { theme } = useTheme()
  const rivFile = RIV_FILES[principleId]

  if (!rivFile) {
    console.warn(
      `Rive file not found for principle ${principleId}. ` +
      `Place the .riv file at /public/rive/[filename] ` +
      `and add the entry to RIV_FILES in ` +
      `PrincipleAnimation/index.jsx (with the state machine name).`
    )
    return (
      <div className={[styles.fallback, className].filter(Boolean).join(' ')}>
        <span className={styles.fallbackText}>
          Animation in production for Principle {principleId}
        </span>
      </div>
    )
  }

  return (
    <RiveCanvas
      src={rivFile.src}
      stateMachine={rivFile.stateMachine}
      theme={theme}
      className={className}
    />
  )
}

// ─── RiveCanvas ───────────────────────────────────────────────────────────────
//
// Isolated useRive boundary. All Rive hook calls live here — not in the parent
// or in PrincipleCard. This matches the Rive React docs pattern for conditional
// rendering: Rive instances are tied to specific canvas elements and misbehave
// on unmount/remount if the hooks live at a higher level.
//
// Interaction model: the .riv file includes its own hitboxes and state machine
// triggers. The user clicks directly on the animation canvas. React does NOT
// need a play button, onClick handler, or any imperative state machine calls.
// React's only job here is theme synchronization via the view model instance.
//
// Theme binding: useViewModelInstance accepts a { rive } option that causes it
// to call rive.bindViewModelInstance(instance) automatically whenever name
// changes. This is confirmed in the @rive-app/react-webgl2 source. No separate
// useEffect is needed for binding — the hook handles it.

function RiveCanvas({ src, stateMachine, theme, className }) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
    autoBind: false,
  })

  // 2x supersampling: the webgl2 renderer's MSAA is coarser than the old
  // canvas runtime's rasterizer on this thin-stroke art. See the hook.
  useRiveSupersampling(rive)

  const viewModel = useViewModel(rive, { name: 'ViewModel1' })

  // Passing { rive } causes the hook to call rive.bindViewModelInstance when
  // the instance is found, and to rebind automatically when name changes (i.e.
  // when theme changes). No manual useEffect required.
  const instance = useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  // high-contrast-dark flips the shared 'Contrast' instance's stroke/fill.
  useHCContrastColors(instance, theme)

  return (
    <div className={[styles.animationContainer, className].filter(Boolean).join(' ')}>
      <RiveComponent className={styles.riveCanvas} />
    </div>
  )
}
