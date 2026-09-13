// The render comparison (the kickoff's Q10, reshaped by David's second
// specimen, 2026-09-08): when the compare slot holds a .riv, draw both files
// instance by instance and compare the pixels. The structural read cannot see
// a property-to-shape binding; the runtime logs nothing when a color field is
// fed by a number (tested: it binds it and draws whatever falls out). The
// pixels see it. On the specimen, 7 to 13 percent of the canvas moved per
// instance, all inside the one face whose color binding was wrong, while the
// inventory read identical and the three instances still drew three distinct
// frames (so "all instances the same" is not the check; this is).
//
// Two halves: renderInstances runs the runtime (a detached canvas per load,
// autoBind off, the named instance bound by hand, the state machine applied at
// zero and one frame read); comparePixels and isFlat are pure and tested. Both
// files are drawn at the same size, on the same instance, at the same point in
// the machine, so a difference is the files', not the harness's. A difference
// is still only a difference: a binding, a value, or the art itself. The page
// says which of those it cannot tell apart.
//
// Why zero and not a beat (2026-09-13). The first version ran the machine for a
// wall-clock 200 ms and read whatever frame that landed on. Nothing about that
// beat belonged to the file. The runtime advances by however long the browser
// took to reach the next animation frame and stops drawing when the machine
// runs out of work, so the pose a file freezes on is a function of the frame
// rate: under a full parallel e2e run the same file compared against itself
// reported up to 11.7 percent of the canvas moved, one side caught before its
// first advance and the other after it. Waiting for the artboard to stop
// changing does not fix it either, and was tried: the two sides stop at
// different poses and each holds there, because a machine fed one long delta
// lands somewhere a machine fed many short ones does not. Measured across four
// parallel contexts, the same file against itself froze on two distinct poses
// per instance, both perfectly still.
//
// So the beat is gone. `play` applies the machine's entry state at an elapsed
// time of exactly zero and draws one frame; rendering is stopped before the
// runtime can schedule a second. That pose is a property of the file and the
// bound instance, and two reads of it are equal by construction on any
// machine, under any load. What it costs is written in the limitations: a
// difference that only appears later in the animation is not seen here, and a
// file whose first frame draws nothing is reported as exactly that rather than
// as a match.
import { loadInstance } from './readRiv'

export const RENDER_SIZE = 200

// Resolves after the browser has finished a frame, or after this long if none
// comes (a backgrounded tab never fires rAF). Nothing is advancing by then
// either way: it is a pause to let the drawn frame reach the canvas, not a beat.
const NO_FRAME_MS = 1000
const afterFrame = () => new Promise(resolve => {
  const timer = setTimeout(resolve, NO_FRAME_MS)
  requestAnimationFrame(() => setTimeout(() => { clearTimeout(timer); resolve() }, 0))
})

// Reads the drawn canvas into a plain RGBA array. The runtime draws through its
// offscreen renderer and blits to this canvas, so a 2D copy is the reliable
// read.
function readPixels(canvas, scratch) {
  const ctx = scratch.getContext('2d')
  ctx.clearRect(0, 0, scratch.width, scratch.height)
  ctx.drawImage(canvas, 0, 0)
  return ctx.getImageData(0, 0, scratch.width, scratch.height).data
}

// Pure: is every pixel of this frame the same color? Two frames that drew
// nothing compare equal, and reporting that as a match would be the comparison
// claiming a result it never had. The page says so instead.
export function isFlat(data) {
  for (let i = 4; i < data.length; i += 4) {
    if (data[i] !== data[0] || data[i + 1] !== data[1] || data[i + 2] !== data[2] || data[i + 3] !== data[3]) return false
  }
  return true
}

// buffer + { artboard, stateMachine, viewModel, instances } → per-instance
// frames, or an error string per instance the file could not draw.
export async function renderInstances(buffer, { artboard, stateMachine, viewModel, instances }) {
  const canvas = document.createElement('canvas')
  canvas.width = RENDER_SIZE
  canvas.height = RENDER_SIZE
  const scratch = document.createElement('canvas')
  scratch.width = RENDER_SIZE
  scratch.height = RENDER_SIZE
  const frames = {}
  for (const name of instances) {
    let r = null
    try {
      r = await loadInstance(buffer, canvas, { artboard, stateMachines: stateMachine })
      if (viewModel) {
        const model = r.viewModelByName(viewModel)
        const inst = name ? model?.instanceByName(name) : model?.defaultInstance()
        if (!inst) throw new Error(`no instance "${name}" on ${viewModel}`)
        r.bindViewModelInstance(inst)
      }
      if (stateMachine) {
        // `play` draws its first frame inline with an elapsed time of zero, so
        // the machine's entry state is applied (which is what carries the view
        // model onto the shapes) and nothing has advanced. `stopRendering`
        // cancels the animation frame that draw just scheduled, before it can
        // advance by whatever the browser's cadence turns out to be.
        r.play(stateMachine)
        r.stopRendering()
      } else {
        r.drawFrame()
      }
      await afterFrame()
      frames[name] = { data: readPixels(canvas, scratch), png: scratch.toDataURL('image/png') }
    } catch (err) {
      frames[name] = { error: err?.message ?? String(err) }
    } finally {
      r?.cleanup()
    }
  }
  return frames
}

// Pure: two RGBA arrays of the same size → the fraction of pixels that
// differ and the box they sit in. `fraction` is over the whole canvas.
export function comparePixels(a, b, width, height) {
  let differing = 0
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
      differing++
      const x = p % width, y = (p - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return {
    differing,
    fraction: differing / (width * height),
    box: differing ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
  }
}

// Draw both, compare each instance. Returns one row per instance:
// { instance, error } when a file would not draw it, otherwise { instance, a,
// b, diff, blank }, where blank marks a pair that drew nothing on either side
// and so proves nothing about the bindings.
export async function renderComparison(bufferA, bufferB, scene) {
  const [fa, fb] = [await renderInstances(bufferA, scene), await renderInstances(bufferB, scene)]
  return scene.instances.map(name => {
    const a = fa[name], b = fb[name]
    if (a.error || b.error) return { instance: name, error: a.error ?? b.error, a: a.png ?? null, b: b.png ?? null }
    return {
      instance: name,
      a: a.png,
      b: b.png,
      blank: isFlat(a.data) && isFlat(b.data),
      diff: comparePixels(a.data, b.data, RENDER_SIZE, RENDER_SIZE),
    }
  })
}
