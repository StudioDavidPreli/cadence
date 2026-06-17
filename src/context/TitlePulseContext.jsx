import { createContext, useContext, useState, useCallback } from 'react'

// ─── TitlePulseContext ──────────────────────────────────────────────────────
//
// A one-shot signal that lets a demo deep in the principles tab tell the
// controls panel's "Tokens" title to pulse once. The only caller today is the
// P06 (Slow In & Slow Out) demo, which fires it on card expand so the user
// sees that the demo's "Tokens" curve originates in the panel of the same name.
// This is a P06-specific cue, NOT a general rule for every card.
//
// Shape: a monotonic counter (pulseId). The title re-plays its pulse animation
// whenever the counter changes (the same key-bump-to-replay pattern used by
// Spinner). The counter starts at 0 and the title stays static until the first
// pulse fires, so nothing animates on initial load.
//
// Why two contexts, same reasoning as ActiveTokenContext: the trigger function
// is stable (useCallback with no deps), so the demo that only fires the pulse
// pays zero re-render cost when the counter changes. Only the title, which
// reads the value, re-renders.
const TitlePulseValueContext   = createContext(0)
const TitlePulseTriggerContext = createContext(() => {})

export function TitlePulseProvider({ children }) {
  const [pulseId, setPulseId] = useState(0)
  const pulseTitle = useCallback(() => setPulseId(n => n + 1), [])
  return (
    <TitlePulseTriggerContext.Provider value={pulseTitle}>
      <TitlePulseValueContext.Provider value={pulseId}>
        {children}
      </TitlePulseValueContext.Provider>
    </TitlePulseTriggerContext.Provider>
  )
}

// Read the pulse counter. Re-renders on every pulse. Use in the title.
export function useTitlePulse() {
  return useContext(TitlePulseValueContext)
}

// Fire a single pulse. Stable function, never causes a re-render in the caller.
export function usePulseTitle() {
  return useContext(TitlePulseTriggerContext)
}
