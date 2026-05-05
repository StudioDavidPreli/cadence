// PrincipleAnimation isolates useRive to a single wrapper component per Rive
// React documentation. This ensures the canvas context is correctly cleaned up
// when the component unmounts (tab change, card collapse, uiMode toggle to UI
// component view) and re-initialized when it mounts again. Do not move useRive
// usage to parent components — that breaks the canvas lifecycle.

import { useRive, useViewModel, useViewModelInstance } from '@rive-app/react-canvas'
import { useTheme } from '../../context/ThemeContext'
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
}

// Map ThemeContext theme values to the view model instance names defined in the
// .riv files. ThemeContext uses 'high-contrast', not 'hc'.
const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast': 'Contrast',
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
// changes. This is confirmed in the @rive-app/react-canvas source. No separate
// useEffect is needed for binding — the hook handles it.

function RiveCanvas({ src, stateMachine, theme, className }) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
    autoBind: false,
  })

  const viewModel = useViewModel(rive, { name: 'ViewModel1' })

  // Passing { rive } causes the hook to call rive.bindViewModelInstance when
  // the instance is found, and to rebind automatically when name changes (i.e.
  // when theme changes). No manual useEffect required.
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  return (
    <div className={[styles.animationContainer, className].filter(Boolean).join(' ')}>
      <RiveComponent className={styles.riveCanvas} />
    </div>
  )
}
