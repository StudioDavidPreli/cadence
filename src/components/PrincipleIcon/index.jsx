// PrincipleIcon isolates useRive to a single wrapper component, mirroring
// PrincipleAnimation. The canvas lifecycle is tied to the component's
// mount/unmount — do not hoist these hooks into PrincipleCard. Two clean
// implementations are easier to read than one shared util at this scale.

import { useRive, useViewModel, useViewModelInstance } from '@rive-app/react-canvas'
import { useTheme } from '../../context/ThemeContext'
import styles from './PrincipleIcon.module.css'

// Catalog of collapsed-state icons. Add entries as principles_iconNN.riv files
// are produced. NN is the zero-padded principleId, 01 to 18.
const ICON_CONFIG = {
  1: {
    src: '/rive/principles_icon01.riv',
    stateMachine: 'squash&stretchIconSM',
  },
  2: {
    src: '/rive/principles_icon02.riv',
    stateMachine: 'anticipationIconSM',
  },
  3: {
    src: '/rive/principles_icon03.riv',
    stateMachine: 'stagingIconSM',
  },
  4: {
    src: '/rive/principles_icon04.riv',
    stateMachine: 'pose2poseIconSM',
  },
  5: {
    src: '/rive/principles_icon05.riv',
    stateMachine: 'followThroughIconSM',
  },
  6: {
    src: '/rive/principles_icon06.riv',
    stateMachine: 'slowInSlowOutIconSM',
  },
}

// Map ThemeContext theme values to the view model instance names defined in
// the .riv files. ThemeContext uses 'high-contrast', not 'hc' — see
// divergence note in the briefing.
const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast': 'Contrast',
}

// Module-level Set so missing-config warnings fire once per principleId across
// the lifetime of the app, not once per render. The grid mounts up to 18 of
// these and would otherwise spam the console on every theme toggle or reflow.
const warnedIds = new Set()

export function PrincipleIcon({ principleId, className }) {
  const { theme } = useTheme()
  const config = ICON_CONFIG[principleId]

  if (!config) {
    if (!warnedIds.has(principleId)) {
      warnedIds.add(principleId)
      console.warn(
        `PrincipleIcon: no icon configured for principle ${principleId}. ` +
        `Add an entry to ICON_CONFIG in PrincipleIcon/index.jsx ` +
        `when the .riv file is produced.`
      )
    }
    return (
      <div
        className={[styles.iconWrapper, className].filter(Boolean).join(' ')}
        aria-hidden="true"
      />
    )
  }

  return (
    <RiveIcon
      src={config.src}
      stateMachine={config.stateMachine}
      theme={theme}
      className={className}
    />
  )
}

// Isolated useRive boundary. All Rive hook calls live here so the canvas
// initializes once per mount and tears down cleanly on unmount. Same pattern
// PrincipleAnimation uses; copied rather than abstracted because divergence
// between icon and full-illustration concerns is unlikely at this scale.
//
// No interaction: this file does not call useStateMachineInput and attaches
// no pointer handlers. The wrapper sets pointer-events: none in CSS so clicks
// pass through to PrincipleCard's expand-on-click handler.

function RiveIcon({ src, stateMachine, theme, className }) {
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
    <div
      className={[styles.iconWrapper, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <RiveComponent className={styles.riveCanvas} />
    </div>
  )
}
