import { describe, it, expect } from 'vitest'
import {
  clampIndex, move, indexFromOffset, rowY,
  initialState, reorderReducer, keyToAction, announcement,
} from './reorderModel'

const IDS = ['snappy', 'standard', 'cinematic', 'custom']
const run = (state, ...actions) => actions.reduce(reorderReducer, state)

describe('move', () => {
  it('takes a row out and puts it back further down', () => {
    expect(move(IDS, 0, 2)).toEqual(['standard', 'cinematic', 'snappy', 'custom'])
  })

  it('takes a row out and puts it back further up', () => {
    expect(move(IDS, 3, 1)).toEqual(['snappy', 'custom', 'standard', 'cinematic'])
  })

  it('returns the same array when nothing would change', () => {
    expect(move(IDS, 1, 1)).toBe(IDS)
    expect(move([], 0, 0)).toEqual([])
  })

  it('clamps out-of-range indices to the ends', () => {
    expect(move(IDS, 0, 99)).toEqual(['standard', 'cinematic', 'custom', 'snappy'])
    expect(move(IDS, 99, 0)).toEqual(['custom', 'snappy', 'standard', 'cinematic'])
    expect(move(IDS, -5, -1)).toBe(IDS)
  })

  it('does not mutate its input', () => {
    const before = IDS.slice()
    move(IDS, 0, 3)
    expect(IDS).toEqual(before)
  })
})

describe('clampIndex', () => {
  it('holds an index inside the list and reads 0 for an empty one', () => {
    expect(clampIndex(-1, 4)).toBe(0)
    expect(clampIndex(4, 4)).toBe(3)
    expect(clampIndex(2, 4)).toBe(2)
    expect(clampIndex(7, 0)).toBe(0)
  })
})

describe('indexFromOffset', () => {
  const pitch = 48
  it('stays in its own slot until the row centre crosses a neighbour', () => {
    expect(indexFromOffset({ from: 1, offset: 0, pitch, count: 4 })).toBe(1)
    expect(indexFromOffset({ from: 1, offset: 23, pitch, count: 4 })).toBe(1)
    expect(indexFromOffset({ from: 1, offset: 25, pitch, count: 4 })).toBe(2)
    expect(indexFromOffset({ from: 1, offset: -25, pitch, count: 4 })).toBe(0)
  })

  it('counts whole pitches in either direction', () => {
    expect(indexFromOffset({ from: 0, offset: 2 * pitch, pitch, count: 4 })).toBe(2)
    expect(indexFromOffset({ from: 3, offset: -3 * pitch, pitch, count: 4 })).toBe(0)
  })

  it('clamps past either end of the list', () => {
    expect(indexFromOffset({ from: 3, offset: 10 * pitch, pitch, count: 4 })).toBe(3)
    expect(indexFromOffset({ from: 0, offset: -10 * pitch, pitch, count: 4 })).toBe(0)
  })

  it('holds the row in place before the pitch is measured', () => {
    expect(indexFromOffset({ from: 2, offset: 500, pitch: 0, count: 4 })).toBe(2)
    expect(indexFromOffset({ from: 2, offset: 500, pitch: NaN, count: 4 })).toBe(2)
    expect(indexFromOffset({ from: 2, offset: 500, pitch: undefined, count: 4 })).toBe(2)
  })
})

describe('rowY', () => {
  it('is slot times pitch', () => {
    expect(rowY(0, 48)).toBe(0)
    expect(rowY(3, 48)).toBe(144)
  })
})

describe('reorderReducer: grab', () => {
  it('holds a row in its own slot and snapshots the order', () => {
    const s = reorderReducer(initialState(IDS), { type: 'GRAB', id: 'standard', source: 'keyboard' })
    expect(s.held).toEqual({ id: 'standard', source: 'keyboard', from: 1, to: 1 })
    expect(s.origin).toEqual(IDS)
    expect(s.order).toEqual(IDS)
    expect(s.last).toEqual({ type: 'grab', id: 'standard', position: 2, count: 4 })
  })

  it('ignores a grab while another row is held', () => {
    const s = reorderReducer(initialState(IDS), { type: 'GRAB', id: 'standard', source: 'pointer' })
    expect(reorderReducer(s, { type: 'GRAB', id: 'custom', source: 'pointer' })).toBe(s)
  })

  it('ignores an id that is not in the list', () => {
    const s = initialState(IDS)
    expect(reorderReducer(s, { type: 'GRAB', id: 'nope', source: 'pointer' })).toBe(s)
  })

  it('falls back to pointer for an unknown source', () => {
    const s = reorderReducer(initialState(IDS), { type: 'GRAB', id: 'snappy', source: 'telepathy' })
    expect(s.held.source).toBe('pointer')
  })

  it('copies the initial order so the caller\'s array is never shared', () => {
    const s = initialState(IDS)
    expect(s.order).toEqual(IDS)
    expect(s.order).not.toBe(IDS)
  })
})

describe('reorderReducer: moving the held row', () => {
  const held = reorderReducer(initialState(IDS), { type: 'GRAB', id: 'standard', source: 'pointer' })

  it('MOVE_TO puts the held row over a slot and the others make room', () => {
    const s = reorderReducer(held, { type: 'MOVE_TO', index: 3 })
    expect(s.order).toEqual(['snappy', 'cinematic', 'custom', 'standard'])
    expect(s.held.to).toBe(3)
    expect(s.held.from).toBe(1)
    expect(s.last).toEqual({ type: 'move', id: 'standard', position: 4, count: 4 })
  })

  it('MOVE_TO computes from the origin, not cumulatively', () => {
    const s = run(held, { type: 'MOVE_TO', index: 3 }, { type: 'MOVE_TO', index: 0 })
    expect(s.order).toEqual(['standard', 'snappy', 'cinematic', 'custom'])
    const back = reorderReducer(s, { type: 'MOVE_TO', index: 1 })
    expect(back.order).toEqual(IDS)
  })

  it('MOVE_TO to the slot already held is a no-op by reference', () => {
    expect(reorderReducer(held, { type: 'MOVE_TO', index: 1 })).toBe(held)
  })

  it('MOVE_TO clamps beyond the list', () => {
    expect(reorderReducer(held, { type: 'MOVE_TO', index: 42 }).held.to).toBe(3)
    expect(reorderReducer(held, { type: 'MOVE_TO', index: -3 }).held.to).toBe(0)
  })

  it('STEP moves one slot at a time and stops at the edges', () => {
    const down = reorderReducer(held, { type: 'STEP', delta: 1 })
    expect(down.order).toEqual(['snappy', 'cinematic', 'standard', 'custom'])
    const bottom = reorderReducer(down, { type: 'STEP', delta: 1 })
    expect(bottom.held.to).toBe(3)
    expect(reorderReducer(bottom, { type: 'STEP', delta: 1 })).toBe(bottom)
    const top = run(held, { type: 'STEP', delta: -1 })
    expect(top.held.to).toBe(0)
    expect(reorderReducer(top, { type: 'STEP', delta: -1 })).toBe(top)
  })

  it('MOVE_TO and STEP do nothing when nothing is held', () => {
    const s = initialState(IDS)
    expect(reorderReducer(s, { type: 'MOVE_TO', index: 2 })).toBe(s)
    expect(reorderReducer(s, { type: 'STEP', delta: 1 })).toBe(s)
  })
})

describe('reorderReducer: letting go', () => {
  const moved = run(
    initialState(IDS),
    { type: 'GRAB', id: 'custom', source: 'keyboard' },
    { type: 'STEP', delta: -1 },
    { type: 'STEP', delta: -1 },
  )

  it('DROP keeps the new order and clears the hold', () => {
    const s = reorderReducer(moved, { type: 'DROP' })
    expect(s.order).toEqual(['snappy', 'custom', 'standard', 'cinematic'])
    expect(s.held).toBeNull()
    expect(s.origin).toBeNull()
    expect(s.last).toEqual({ type: 'drop', id: 'custom', position: 2, count: 4 })
  })

  it('CANCEL restores the order from the grab', () => {
    const s = reorderReducer(moved, { type: 'CANCEL' })
    expect(s.order).toEqual(IDS)
    expect(s.held).toBeNull()
    expect(s.last).toEqual({ type: 'cancel', id: 'custom', position: 4, count: 4 })
  })

  it('DROP and CANCEL are no-ops when nothing is held', () => {
    const s = initialState(IDS)
    expect(reorderReducer(s, { type: 'DROP' })).toBe(s)
    expect(reorderReducer(s, { type: 'CANCEL' })).toBe(s)
  })

  it('a drop in the original slot leaves the order as it was', () => {
    const s = run(initialState(IDS), { type: 'GRAB', id: 'snappy', source: 'pointer' }, { type: 'DROP' })
    expect(s.order).toEqual(IDS)
    expect(s.last.type).toBe('drop')
  })

  it('an unknown action is a no-op by reference', () => {
    const s = initialState(IDS)
    expect(reorderReducer(s, { type: 'WHAT' })).toBe(s)
  })
})

describe('the two input paths on one reducer', () => {
  it('a pointer drag: grab, offsets become slots, drop', () => {
    const pitch = 48
    let s = reorderReducer(initialState(IDS), { type: 'GRAB', id: 'snappy', source: 'pointer' })
    for (const offset of [5, 20, 30, 60, 100, 130]) {
      s = reorderReducer(s, {
        type: 'MOVE_TO',
        index: indexFromOffset({ from: s.held.from, offset, pitch, count: s.order.length }),
      })
    }
    expect(s.held).toEqual({ id: 'snappy', source: 'pointer', from: 0, to: 3 })
    expect(s.order).toEqual(['standard', 'cinematic', 'custom', 'snappy'])
    s = reorderReducer(s, { type: 'DROP' })
    expect(s.order).toEqual(['standard', 'cinematic', 'custom', 'snappy'])
    expect(s.held).toBeNull()
  })

  it('a keyboard move lands on the same order through keyToAction', () => {
    let s = initialState(IDS)
    const press = key => {
      const a = keyToAction(key, s, 'snappy')
      if (a) s = reorderReducer(s, a)
    }
    press(' ')
    expect(s.held.source).toBe('keyboard')
    press('ArrowDown'); press('ArrowDown'); press('ArrowDown')
    press('ArrowDown') // at the edge, no-op
    press(' ')
    expect(s.order).toEqual(['standard', 'cinematic', 'custom', 'snappy'])
    expect(s.held).toBeNull()
  })

  it('Escape mid-move returns the row and the order', () => {
    let s = initialState(IDS)
    const press = key => {
      const a = keyToAction(key, s, 'cinematic')
      if (a) s = reorderReducer(s, a)
    }
    press('Enter'); press('ArrowUp'); press('ArrowUp')
    expect(s.order[0]).toBe('cinematic')
    press('Escape')
    expect(s.order).toEqual(IDS)
    expect(s.held).toBeNull()
  })
})

describe('keyToAction', () => {
  const idle = initialState(IDS)
  const held = reorderReducer(idle, { type: 'GRAB', id: 'standard', source: 'keyboard' })

  it('Space and Enter grab when idle and drop when held', () => {
    expect(keyToAction(' ', idle, 'standard')).toEqual({ type: 'GRAB', id: 'standard', source: 'keyboard' })
    expect(keyToAction('Enter', idle, 'standard')).toEqual({ type: 'GRAB', id: 'standard', source: 'keyboard' })
    expect(keyToAction(' ', held, 'standard')).toEqual({ type: 'DROP' })
    expect(keyToAction('Enter', held, 'standard')).toEqual({ type: 'DROP' })
  })

  it('arrows, Home, End and Escape act only while held', () => {
    expect(keyToAction('ArrowUp', held, 'standard')).toEqual({ type: 'STEP', delta: -1 })
    expect(keyToAction('ArrowDown', held, 'standard')).toEqual({ type: 'STEP', delta: 1 })
    expect(keyToAction('Home', held, 'standard')).toEqual({ type: 'MOVE_TO', index: 0 })
    expect(keyToAction('End', held, 'standard')).toEqual({ type: 'MOVE_TO', index: 3 })
    expect(keyToAction('Escape', held, 'standard')).toEqual({ type: 'CANCEL' })
    for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape']) {
      expect(keyToAction(key, idle, 'standard')).toBeNull()
    }
  })

  it('leaves every other key to the browser', () => {
    expect(keyToAction('Tab', held, 'standard')).toBeNull()
    expect(keyToAction('a', idle, 'standard')).toBeNull()
  })
})

describe('announcement', () => {
  const labels = { snappy: 'Snappy', standard: 'Standard', cinematic: 'Cinematic', custom: 'Custom' }
  const labelOf = id => labels[id]

  it('says nothing before anything has happened', () => {
    expect(announcement(initialState(IDS), labelOf)).toBe('')
  })

  it('narrates grab, move, drop and cancel with a 1-based position', () => {
    let s = reorderReducer(initialState(IDS), { type: 'GRAB', id: 'standard', source: 'keyboard' })
    expect(announcement(s, labelOf)).toBe('Standard grabbed, 2 of 4. Arrows move it, Space drops it, Escape cancels.')
    s = reorderReducer(s, { type: 'STEP', delta: 1 })
    expect(announcement(s, labelOf)).toBe('Standard moved to 3 of 4.')
    expect(announcement(reorderReducer(s, { type: 'DROP' }), labelOf)).toBe('Standard dropped at 3 of 4.')
    expect(announcement(reorderReducer(s, { type: 'CANCEL' }), labelOf)).toBe('Reorder cancelled. Standard is back at 2 of 4.')
  })

  it('uses the id as the label by default', () => {
    const s = reorderReducer(initialState(IDS), { type: 'GRAB', id: 'custom', source: 'pointer' })
    expect(announcement(s)).toMatch(/^custom grabbed, 4 of 4\./)
  })
})
