// ─── Drag-to-reorder: the pure model ──────────────────────────────────────────
//
// A short vertical list whose rows can be moved into a new order, by a pointer
// on the row's handle or by the keyboard on that same handle. Build-order item
// 13, the second Gesture demo. The argument it makes: while the pointer is
// down, a row's position is input, not animation, and the token vocabulary has
// nothing to say about that stretch of time. Let go and the row lands from
// whatever velocity the hand had, which only a spring can express. Move the
// same row with the keyboard and there is no hand, no velocity, nothing to
// follow, so the motion goes straight back to being timed.
//
// One list, two input modes, two motion models. This module is the part they
// share: the order, who is held, where the held row is, and what to say about
// it. It is one reducer on purpose. A pointer drag and a keyboard move are the
// same operation on the order (take a row out, put it back somewhere else) and
// differ only in how the target index arrives: the pointer computes it from a
// drag offset, the keyboard steps it by one. The component reads `held.source`
// when the row drops to choose the spring or the timed transition; nothing in
// here knows about either.
//
// Pure and DOM-free so it is testable the way measureModel and offSystem are.
// Ids only: the model never sees labels, pixels or elements. Geometry enters
// through one function, indexFromOffset, which takes the row pitch (row height
// plus gap) as an argument because the component measures it from the DOM the
// way Carousel measures its slide width. No pitch is typed anywhere.
//
// State shape:
//   order   ids in their current visual order. During a hold this is the LIVE
//           order, with the held row already in its target slot, so the rows
//           making room read their slot from it and animate there.
//   held    null, or { id, source, from, to }. source is 'pointer' or
//           'keyboard'. from is the slot the row left, to the slot it is over.
//   origin  the order as it stood at the grab, so CANCEL can restore it and
//           MOVE_TO can be computed from a fixed base rather than cumulatively.
//   last    the most recent event, { type, id, position, count }, position
//           1-based, so the live region can be rendered from state alone.
//
// A no-op action (a step at the edge, a move to the slot the row is already
// over, a drop with nothing held) returns the SAME state object. The component
// can rely on that: React skips the render, and the live region does not
// repeat itself.

export const SOURCES = Object.freeze(['pointer', 'keyboard'])

export function clampIndex(index, count) {
  if (count <= 0) return 0
  return Math.min(Math.max(index, 0), count - 1)
}

// Take the element at `from` out and put it back at `to`. Returns a new array,
// or the same array when nothing would change, so callers can compare by
// reference. Indices are clamped rather than thrown on: the reducer clamps
// before it gets here, and a bare caller should get the nearest sane answer.
export function move(list, from, to) {
  const count = list.length
  const a = clampIndex(from, count)
  const b = clampIndex(to, count)
  if (count === 0 || a === b) return list
  const next = list.slice()
  const [item] = next.splice(a, 1)
  next.splice(b, 0, item)
  return next
}

// The slot a dragged row is over, from how far the pointer has travelled since
// the grab. The row started in slot `from`; every full pitch of travel is one
// slot, rounded, so the row changes slot when its centre crosses a neighbour's
// centre. Clamped to the list, so dragging past the end holds the end slot.
// A non-positive pitch (the component has not measured yet) leaves the row in
// its own slot rather than dividing by zero.
export function indexFromOffset({ from, offset, pitch, count }) {
  if (!(pitch > 0)) return clampIndex(from, count)
  return clampIndex(from + Math.round(offset / pitch), count)
}

// The y a row rests at for a given slot. Trivial, and kept as the one place a
// slot index becomes a pixel target, so the component never multiplies inline.
export function rowY(index, pitch) {
  return index * pitch
}

export function initialState(order) {
  return { order: order.slice(), held: null, origin: null, last: null }
}

function event(type, state, id, index) {
  return { type, id, position: index + 1, count: state.order.length }
}

// Actions:
//   GRAB    { id, source }   take hold of a row; ignored while another is held
//   MOVE_TO { index }        put the held row over a slot (pointer path)
//   STEP    { delta }        move the held row by whole slots (keyboard path)
//   DROP                     release where it is; the order stands
//   CANCEL                   release and restore the order from the grab
export function reorderReducer(state, action) {
  switch (action.type) {
    case 'GRAB': {
      if (state.held) return state
      const from = state.order.indexOf(action.id)
      if (from === -1) return state
      const source = SOURCES.includes(action.source) ? action.source : 'pointer'
      return {
        ...state,
        held: { id: action.id, source, from, to: from },
        origin: state.order,
        last: event('grab', state, action.id, from),
      }
    }

    case 'MOVE_TO': {
      const { held, origin } = state
      if (!held) return state
      const to = clampIndex(action.index, state.order.length)
      if (to === held.to) return state
      // From the origin, not the live order: the held row is the only one that
      // moves, so its position is always "origin with this row at `to`". A
      // cumulative move on the live order would drift if two updates ever
      // landed in one frame.
      return {
        ...state,
        order: move(origin, held.from, to),
        held: { ...held, to },
        last: event('move', state, held.id, to),
      }
    }

    case 'STEP': {
      if (!state.held) return state
      return reorderReducer(state, { type: 'MOVE_TO', index: state.held.to + action.delta })
    }

    case 'DROP': {
      const { held } = state
      if (!held) return state
      return { ...state, held: null, origin: null, last: event('drop', state, held.id, held.to) }
    }

    case 'CANCEL': {
      const { held, origin } = state
      if (!held) return state
      return { ...state, order: origin, held: null, origin: null, last: event('cancel', state, held.id, held.from) }
    }

    default:
      return state
  }
}

// The keyboard map, on the handle. Space or Enter grabs the focused row or
// drops the held one. While a row is held, the arrows step it, Home and End
// send it to the ends, and Escape cancels. When nothing is held the arrows and
// Escape mean nothing here, and null lets the browser keep them. `id` is the
// row whose handle has focus.
export function keyToAction(key, state, id) {
  const held = Boolean(state.held)
  switch (key) {
    case ' ':
    case 'Enter':
      return held ? { type: 'DROP' } : { type: 'GRAB', id, source: 'keyboard' }
    case 'ArrowUp':
      return held ? { type: 'STEP', delta: -1 } : null
    case 'ArrowDown':
      return held ? { type: 'STEP', delta: 1 } : null
    case 'Home':
      return held ? { type: 'MOVE_TO', index: 0 } : null
    case 'End':
      return held ? { type: 'MOVE_TO', index: state.order.length - 1 } : null
    case 'Escape':
      return held ? { type: 'CANCEL' } : null
    default:
      return null
  }
}

// What the live region says after each event. Plain and short: a screen
// reader user is counting, not reading. `labelOf` turns an id into the row's
// visible label; identity by default so ids can be labels in a simple list.
export function announcement(state, labelOf = id => id) {
  const { last } = state
  if (!last) return ''
  const label = labelOf(last.id)
  const where = `${last.position} of ${last.count}`
  switch (last.type) {
    case 'grab':   return `${label} grabbed, ${where}. Arrows move it, Space drops it, Escape cancels.`
    case 'move':   return `${label} moved to ${where}.`
    case 'drop':   return `${label} dropped at ${where}.`
    case 'cancel': return `Reorder cancelled. ${label} is back at ${where}.`
    default:       return ''
  }
}
