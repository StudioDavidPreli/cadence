import { createContext, useContext } from 'react'

// ─── Motion preset epoch ──────────────────────────────────────────────────────
//
// An integer that increments when the token state changes ALL AT ONCE: a preset
// is loaded, or the defaults are restored. It never moves for a slider drag.
//
// That distinction is the whole reason this exists. Editing a duration and
// switching preset are different acts, and the background needs to tell them
// apart. A drag produces a continuous stream of values and must change nothing
// about the background, or the artwork would re-time sixty times a second while
// you are trying to look at something else. A preset switch is one deliberate
// choice with a name attached, and it is the moment where showing its
// consequence is worth something.
//
// ── Why a counter and not the preset's name ───────────────────────────────────
//
// Loading the same preset twice should re-run the reveal both times, and so
// should a reset that happens to land on values you were already at. The
// consumer is asking "has a discrete change happened", not "which preset is
// this", and a monotonic counter answers exactly that with no equality
// question. Nothing reads the number itself.
//
// ── Why a context and not a prop ──────────────────────────────────────────────
//
// TokenLab already renders NavColumn, so it IS an ancestor of the background and
// a prop would work. It would also thread one integer through NavColumn and
// NavBackground, two components that have no interest in motion presets, purely
// to hand it to a third. The context is the narrower change: the two ends know
// about each other and nothing in between has to.
//
// Value only, no setter context. Unlike ActiveTokenContext there is exactly one
// writer, TokenLab's own dispatch wrapper, and it already owns the state.
const MotionPresetEpochContext = createContext(0)

export const MotionPresetEpochProvider = MotionPresetEpochContext.Provider

/**
 * How many times a preset has been loaded or the defaults restored this session.
 *
 * Treat it as opaque: the only meaningful operation is noticing that it changed.
 * Returns 0 outside a provider, which is a stable value, so a consumer mounted
 * without TokenLab above it simply never sees a change.
 */
export function useMotionPresetEpoch() {
  return useContext(MotionPresetEpochContext)
}
