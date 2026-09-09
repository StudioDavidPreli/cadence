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
// autoBind off, the named instance bound by hand, the first state machine
// advanced for a fixed beat, one frame read back); comparePixels is pure and
// tested. Both files are drawn at the same size, the same instance, the same
// beat, so a difference is the files', not the harness's. A difference is
// still only a difference: a binding, a value, or the art itself. The page
// says which of those it cannot tell apart.
import { loadInstance } from './readRiv'

export const RENDER_SIZE = 200
// How long the state machine runs before the frame is read. Long enough for
// an entry state to settle, short enough that an idle loop has not drifted
// far; the same beat for both files.
export const SETTLE_MS = 200

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Reads the drawn canvas into a plain RGBA array plus a PNG data URL for the
// page. The runtime draws through its offscreen renderer and blits to this
// canvas, so a 2D copy is the reliable read.
function snapshot(canvas) {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  const ctx = copy.getContext('2d')
  ctx.drawImage(canvas, 0, 0)
  return {
    data: ctx.getImageData(0, 0, copy.width, copy.height).data,
    png: copy.toDataURL('image/png'),
  }
}

// buffer + { artboard, stateMachine, viewModel, instances } → per-instance
// frames, or an error string per instance the file could not draw.
export async function renderInstances(buffer, { artboard, stateMachine, viewModel, instances }) {
  const canvas = document.createElement('canvas')
  canvas.width = RENDER_SIZE
  canvas.height = RENDER_SIZE
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
        r.play(stateMachine)
        await sleep(SETTLE_MS)
        r.pause(stateMachine)
      }
      r.drawFrame()
      await sleep(30)
      frames[name] = snapshot(canvas)
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

// Draw both, compare each instance. Returns [{ instance, a, b, diff | error }].
export async function renderComparison(bufferA, bufferB, scene) {
  const [fa, fb] = [await renderInstances(bufferA, scene), await renderInstances(bufferB, scene)]
  return scene.instances.map(name => {
    const a = fa[name], b = fb[name]
    if (a.error || b.error) return { instance: name, error: a.error ?? b.error, a: a.png ?? null, b: b.png ?? null }
    return { instance: name, a: a.png, b: b.png, diff: comparePixels(a.data, b.data, RENDER_SIZE, RENDER_SIZE) }
  })
}
