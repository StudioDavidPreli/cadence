import { describe, it, expect, vi } from 'vitest'
import { tapConsole, installConsoleTap } from './consoleTap'

// One test, one install: the tap installs once per module and wraps whatever
// console.error is at that moment, so the spies go in first and stay for the
// whole test.
describe('consoleTap', () => {
  it('hears error and warn while subscribed, forwards unchanged, stops on unsubscribe, and reaches a printer bound before the listener existed', () => {
    const originalError = console.error
    const originalWarn = console.warn
    const errorSpy = vi.fn()
    const warnSpy = vi.fn()
    console.error = errorSpy
    console.warn = warnSpy
    try {
      installConsoleTap()
      // Emscripten's pattern: bind once at module start, call later. Bound
      // now, before any listener exists.
      const printer = console.error.bind(console)

      const heard = []
      const stop = tapConsole((level, args) => heard.push([level, args.join(' ')]))
      console.error('Could not find a View Model linked to Artboard r4c1.')
      console.warn('a', 'b')
      printer('late message')
      stop()
      console.error('after')

      expect(heard).toEqual([
        ['error', 'Could not find a View Model linked to Artboard r4c1.'],
        ['warn', 'a b'],
        ['error', 'late message'],
      ])
      // Everything still reached the console, including what was said after
      // the listener stopped.
      expect(errorSpy).toHaveBeenCalledTimes(3)
      expect(errorSpy).toHaveBeenLastCalledWith('after')
      expect(warnSpy).toHaveBeenCalledWith('a', 'b')
    } finally {
      console.error = originalError
      console.warn = originalWarn
    }
  })
})
