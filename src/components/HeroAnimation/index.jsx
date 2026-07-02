// HeroAnimation isolates useRive for the landing animation, the same isolation
// pattern PrincipleAnimation/RiveCanvas uses: all Rive hook calls live in one
// wrapper so the canvas lifecycle is contained and cleans up when a destination
// takes over the demo area. Do not lift the Rive hooks to a parent.
//
// Interaction model matches the principle files: the .riv carries its own
// hitboxes and pointer listeners. A click reseeds the animation; mouse position
// drives its scale and speed. All of that is handled inside the state machine,
// so React passes nothing in — its only job is theme synchronization.

// hero3.riv is authored for the Rive Renderer, so it needs the WebGL2 runtime —
// the canvas runtime the principle files use cannot load it and renders blank.
// This is the one component in the app on @rive-app/react-webgl2; every other
// Rive canvas stays on @rive-app/react-canvas. The two runtimes each ship their
// own WASM and run independently; the hero and the principle grids never
// co-mount, so the two never share a moment on screen. Keep the two package
// versions in lockstep so the hook API stays identical across both.
import { useEffect } from 'react'
import {
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceColor,
} from '@rive-app/react-webgl2'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import styles from './HeroAnimation.module.css'

// The landing .riv. artboard and stateMachine are the author's choices in Rive —
// name them here to match. Instance convention matches the principle files
// (Light / Dark / Contrast) but the view model is named 'Hero3ViewModel', not
// 'ViewModel1' (bound below). This file carries a third bindable color,
// colorAccent, alongside colorPropertyFill / colorPropertyStroke; like the other
// two it is authored per instance, so no React write is needed (accent is amber
// in both HC themes, so it does not flip — see the HC effect below).
const HERO_RIV = { src: '/rive/hero3.riv', artboard: 'Hero3', stateMachine: 'hero3SM' }

// Both high-contrast themes bind the single 'Contrast' instance; high-contrast-
// dark flips its stroke/fill at runtime (see the effect in HeroAnimation).
const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast-light': 'Contrast',
  'high-contrast-dark': 'Contrast',
}

export function HeroAnimation() {
  const { theme } = useTheme()

  // prefers-reduced-motion: load the file but do not play it, so the hero holds
  // a static first frame instead of looping. Consistent with P17.
  const reduce = useReducedMotion()

  const { rive, RiveComponent } = useRive({
    src: HERO_RIV.src,
    artboard: HERO_RIV.artboard,
    stateMachines: HERO_RIV.stateMachine,
    autoplay: !reduce,
    autoBind: false,
  })

  // This file names its view model 'Hero3ViewModel', not the 'ViewModel1' the
  // principle files use — its instances (Dark / Light / Contrast) and color
  // properties still follow the shared convention.
  const viewModel = useViewModel(rive, { name: 'Hero3ViewModel' })
  // { rive } makes the hook bind the instance and rebind when the name (theme)
  // changes. No manual useEffect needed — same as RiveCanvas.
  const instance = useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  // high-contrast-dark flips the shared 'Contrast' instance's stroke/fill. The
  // rest of the app does this through the shared useHCContrastColors hook, but
  // that hook binds colors via the react-canvas runtime. This instance comes from
  // the react-webgl2 runtime, so its color binding must go through webgl2's own
  // useViewModelInstanceColor — mixing an instance from one runtime with the
  // color hook of the other is implicit coupling to avoid. Logic mirrors the
  // shared hook: both HC themes bind 'Contrast', so the colors are asserted per
  // theme (switching HC-light <-> HC-dark does not rebind). colorAccent is amber
  // in both HC themes, so it is not written here — it holds its authored value.
  const stroke = useViewModelInstanceColor('colorPropertyStroke', instance)
  const fill = useViewModelInstanceColor('colorPropertyFill', instance)
  useEffect(() => {
    if (!instance) return
    if (theme === 'high-contrast-dark') {
      stroke.setRgb(255, 255, 255)
      fill.setRgb(0, 0, 0)
    } else if (theme === 'high-contrast-light') {
      stroke.setRgb(0, 0, 0)
      fill.setRgb(255, 255, 255)
    }
    // Setter objects are re-created each render; theme + instance are the
    // meaningful triggers (writes are idempotent). Same reasoning as the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, theme])

  return (
    <div className={styles.hero}>
      {/* The Rive container. The title (Cadence) and byline (how things move)
          are baked into the artwork itself, so React renders no text here. */}
      <div className={styles.riveContainer}>
        {/* Graceful fallback: until rive loads (or if hero.riv is absent), show a
            quiet themed prompt. Once the file loads, the canvas paints over it.
            A missing asset therefore degrades to this prompt rather than erroring,
            so the build runs before the .riv is authored. */}
        {!rive && (
          <p className={styles.fallbackText}>
            Pick a tool to begin. Token Lab edits the system; Principles shows it at work.
          </p>
        )}
        {/* Clip wrapper. It fills the padded content box and owns the overflow
            clip, so scaling the canvas above 1 (--hero-art-scale) grows the art
            inside the padding rather than out over it. Without this inner box the
            clip would fall at .riveContainer's outer edge (overflow clips at the
            padding box), and the scale would erase the padding entirely. */}
        <div className={styles.canvasClip}>
          <RiveComponent className={styles.canvas} />
        </div>
      </div>

      {/* Short description beneath the artwork: states the tool's purpose, then
          tells a first-time visitor where to begin. This copy is canonical in
          docs/voice/voice-analysis.md, "Landing hero copy" — edit it there too. */}
      <div className={styles.description}>
        <p className={styles.descPurpose}>
          Motion designers know how something should move. Cadence shows how that
          becomes a system an engineer can build. Adjust the tokens that define
          timing and easing, and the interface answers in real time.
        </p>
        <p className={styles.descStart}>
          Start in Token Lab to change the values, or the Principles Library to
          watch the twelve principles run on them.
        </p>
      </div>
    </div>
  )
}
