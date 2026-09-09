// A pass-through tap on console.error and console.warn, installed once at
// boot, so a page can hear what the Rive runtime says (2026-09-08, rivLint's
// "the runtime said" line).
//
// Why at boot and not at the moment of reading: the runtime's messages
// ("Could not find a View Model linked to Artboard X") come from the WASM
// side through Emscripten's error printer, which binds
// `console.error.bind(console)` ONCE when the module initializes. The module
// initializes for the first canvas on the page (the nav logo), long before
// any tool page exists, so a wrapper installed later is never called: the
// printer holds the original function. A tap installed before the WASM
// pins (riveWasm.js imports this first) is the function the printer binds,
// and every later listener hears through it.
//
// The tap forwards everything unchanged and holds no messages itself; a
// listener is live only between subscribe and unsubscribe. Nothing here
// changes what reaches the browser console.
const listeners = new Set()
let installed = false

export function installConsoleTap() {
  if (installed || typeof console === 'undefined') return
  installed = true
  for (const level of ['error', 'warn']) {
    const original = console[level]
    console[level] = function tapped(...args) {
      for (const listener of listeners) {
        try { listener(level, args) } catch { /* a listener must not break logging */ }
      }
      return original.apply(this, args)
    }
  }
}

// listener(level, args) → unsubscribe
export function tapConsole(listener) {
  installConsoleTap()
  listeners.add(listener)
  return () => listeners.delete(listener)
}
