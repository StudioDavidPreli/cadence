import { useState } from 'react'
import { Toggle } from '../../components/Toggle'
import { BUILT_IN_PRESETS, stateToTokens } from 'cadence-tokens'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { useDemoMotionAllowed } from '../../components/DemoMotionGate/motionGateContext'
import styles from './Timing.module.css'

// P09 Timing. Two Toggles, one per preset (Standard, Cinematic). Identical
// component, different duration personalities — the only variable is timing.
// Flipping each toggle shows how the same interaction reads as brisk (Standard)
// or deliberate (Cinematic) purely from its duration tokens.

// Pre-resolved token shapes for the two presets. We resolve once at module load
// (not per render) because BUILT_IN_PRESETS is static and stateToTokens is a
// pure transform. find() returns the matching preset object; we feed its
// `state` to stateToTokens to get the React-shape tokens that
// MotionTokensProvider expects.
const STANDARD_TOKENS = stateToTokens(
  BUILT_IN_PRESETS.find(p => p.id === 'standard').state
)

// Demo-scoped exaggeration. The real presets differ by only 100 ms on the
// `fast` token the Toggle animates (Standard 100 ms, Cinematic 200 ms) — too
// small to read as a personality shift in a single thumb flip. This demo slows
// the Cinematic slot by a fixed factor so the contrast is unmistakable: brisk
// vs deliberate. The factor lives here, never in the Cinematic preset itself —
// TokenLab consumes that preset at its true values, and only this teaching demo
// amplifies. Same demo-scoped exaggeration pattern as Systematization and
// Reduced Motion (which bump scale.lift to 1.08 for the same legibility reason).
// Tune the factor to taste; 4× turns Cinematic's 200 ms fast into ~800 ms.
const CINEMATIC_DEMO_SLOWDOWN = 4

// Scales the whole duration family by a factor, leaving easing and scale
// untouched. Scaling the family (not just `fast`) keeps the tokens internally
// consistent — same reasoning as Systematization's tempo slider.
function scaleDurations(tokens, factor) {
  return {
    ...tokens,
    duration: {
      fast:   tokens.duration.fast   * factor,
      base:   tokens.duration.base   * factor,
      slow:   tokens.duration.slow   * factor,
      slower: tokens.duration.slower * factor,
    },
  }
}

const CINEMATIC_TOKENS = scaleDurations(
  stateToTokens(BUILT_IN_PRESETS.find(p => p.id === 'cinematic').state),
  CINEMATIC_DEMO_SLOWDOWN
)

// One Toggle scoped to a specific preset's motion tokens. Toggle owns its own
// on/off state internally; we mirror it here via onChange so the adjacent
// label can display "On" / "Off" reactively. The duplication is harmless: the
// two booleans only ever flip together because the parent never sets state
// except in response to the Toggle's onChange.
function TogglePresetSlot({ presetLabel, presetTokens }) {
  const [on, setOn] = useState(false)
  // Like every library demo, this slot flattens under OS reduce-motion; the
  // card's "View motion" gate restores the preset's real timing on request.
  // motionAllowed folds both signals (no OS preference, or gate toggled on),
  // so the provider opts out exactly when motion is permitted. The former
  // blanket respectReducedMotion={false} was revoked 2026-07-17; see
  // docs/decisions/reduced-motion-2026-05-06.md (addendum).
  const motionAllowed = useDemoMotionAllowed()
  return (
    <MotionTokensProvider tokens={presetTokens} respectReducedMotion={!motionAllowed}>
      <div className={styles.timingRow}>
        <span className={styles.timingPresetLabel}>{presetLabel}</span>
        <Toggle label={on ? 'On' : 'Off'} mode="expressive" onChange={setOn} />
      </div>
    </MotionTokensProvider>
  )
}

export function Timing() {
  return (
    <div className={styles.timingDemo}>
      <TogglePresetSlot presetLabel="Standard"  presetTokens={STANDARD_TOKENS} />
      <TogglePresetSlot presetLabel="Cinematic" presetTokens={CINEMATIC_TOKENS} />
    </div>
  )
}
