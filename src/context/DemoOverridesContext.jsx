import { createContext, useContext } from 'react'

// ─── DemoOverridesContext ─────────────────────────────────────────────────────
//
// The off-system edits (2026-09-09): per-demo token overrides, keyed by the
// DemoWrapper's componentName and then by runtime token path,
//   { Button: { 'duration.fast': 0.25 }, Card: { 'ease.overshoot': [...] } }
// in the runtime units the components read. Token Lab owns the state (it has
// to clear it on a preset load, fill it from an import, and flatten it into an
// export), and this context carries it down to the two consumers: DemoWrapper,
// which patches the live tokens for a detached demo and drops its connection
// border, and CodeBlock, which shows the literal in place of the read, the
// off-system comment, and the [RECONNECT] / [ADOPT] actions.
//
// Why a context rather than props: DemoWrapper is rendered by a dozen demo
// functions across the category screens, and CodeBlock sits two components
// below it. Threading three values through every one of them would touch every
// demo for a feature none of them know about. The value is null outside Token
// Lab, which is how CodeBlock knows it is read-only there (the QuoteBlock code
// views on the principle cards).
//
// The value is one object rebuilt when overrides change. Every consumer that
// reads it also renders from it, so there is nothing to gain from the
// value/setter split ActiveTokenContext uses.
const DemoOverridesContext = createContext(null)

export function DemoOverridesProvider({ value, children }) {
  return <DemoOverridesContext.Provider value={value}>{children}</DemoOverridesContext.Provider>
}

// { overrides, setOverride(demo, path, value), clearOverride(demo, path),
//   adoptOverride(demo, path) } or null outside Token Lab.
export function useDemoOverrides() {
  return useContext(DemoOverridesContext)
}
