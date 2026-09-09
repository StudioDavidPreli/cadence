// The in-page reader: a .riv's bytes go through the app's own Rive runtime and
// come out as the raw shape lintModel.normalizeInventory expects. Nothing else
// in this folder touches the runtime.
//
// Posture, settled by the item 9 probe (docs/briefings/ITEM9_RIV_LINTER_KICKOFF.md):
//
// - The file arrives as an ArrayBuffer and is passed as `buffer`, never as an
//   object URL, so a lint issues no request at all: the e2e asserts a network
//   log that is empty outright.
// - `enableRiveAssetCDN: false` plus an asset loader that claims every asset.
//   With the runtime's defaults a file with hosted assets fetches them from
//   Rive's CDN (public.uat.rive.app) at load; the loader callback is also the
//   only surface that enumerates assets, so claiming them is how the report
//   learns what the file carries.
// - One load on a detached canvas reads every artboard's state machines and
//   inputs (`contents`), the view models, the enums, and the file's default
//   artboard (`activeArtboard` of a load that names none). Each artboard's
//   default view model is only readable from a load of that artboard, so
//   those cost one extra load each, capped; the rest are listed as unread.
// - No autoplay, no autoBind: nothing draws, nothing binds, the instance is
//   cleaned up before the next load.
import { Rive } from '@rive-app/react-webgl2'
import riveRuntimePkg from '@rive-app/webgl2/package.json'
import { tapConsole } from '../../utils/consoleTap'

export const RUNTIME_VERSION = riveRuntimePkg.version

// Per-artboard default view models cost a load each; past this many the
// report says which artboards it did not read rather than stalling on a
// 40-artboard file.
export const PER_ARTBOARD_CAP = 12

const LOAD_TIMEOUT_MS = 20_000

export function loadInstance(buffer, canvas, { artboard, assets, autoplay = false, stateMachines, autoBind = false } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The runtime did not finish loading the file.')), LOAD_TIMEOUT_MS)
    const r = new Rive({
      // A fresh copy per load: the runtime keeps its own view of the bytes and
      // a shared buffer across sequential loads is the one thing the probe did
      // not exercise.
      buffer: buffer.slice(0),
      canvas,
      autoplay,
      useOffscreenRenderer: true,
      enableRiveAssetCDN: false,
      autoBind,
      ...(artboard ? { artboard } : {}),
      ...(stateMachines ? { stateMachines } : {}),
      assetLoader: (asset, bytes) => {
        assets?.push({
          name: asset.name,
          fileExtension: asset.fileExtension,
          cdnUuid: asset.cdnUuid,
          isImage: asset.isImage,
          isFont: asset.isFont,
          isAudio: asset.isAudio,
          bytes: bytes?.length ?? 0,
        })
        return true
      },
      onLoad: () => { clearTimeout(timer); resolve(r) },
      onLoadError: () => { clearTimeout(timer); reject(new Error('The runtime could not read this file. It may not be a .riv, or it may be newer than the runtime this page carries.')) },
    })
  })
}

// buffer → raw read (the shape lintModel.normalizeInventory takes).
//
// `runtimeMessages` is what the runtime wrote to the console during the main
// load and the default artboard's view-model lookup, deduplicated: the one
// line it does emit ("Could not find a View Model linked to Artboard X") is
// what a consumer sees in their own console. It is heard through the boot
// tap (utils/consoleTap.js), because the runtime's printer bound
// console.error when the module started and a wrapper installed here would
// never be called. The per-artboard loads below are excluded on purpose:
// asking every nested artboard for its default view model provokes that
// line for each one that has none, which is normal, and would bury the
// message that matters. Tested 2026-09-08: the runtime says nothing about a
// color property bound to a number.
export async function readRiv(buffer) {
  const canvas = document.createElement('canvas')
  const assets = []
  const said = new Map()
  const stopListening = tapConsole((level, args) => {
    const line = args.map(a => (typeof a === 'string' ? a : a?.message ?? String(a))).join(' ')
    said.set(`${level}: ${line}`, (said.get(`${level}: ${line}`) ?? 0) + 1)
  })
  let instance
  try {
    instance = await loadInstance(buffer, canvas, { assets })
  } catch (err) {
    stopListening()
    throw err
  }
  const raw = { assets, unreadArtboards: [] }
  try {
    raw.defaultArtboard = instance.activeArtboard
    const contents = instance.contents ?? {}
    raw.artboards = (contents.artboards ?? []).map(a => ({
      name: a.name,
      animations: a.animations,
      stateMachines: (a.stateMachines ?? []).map(s => ({
        name: s.name,
        inputs: (s.inputs ?? []).map(i => ({ name: i.name, type: String(i.type) })),
      })),
    }))
    raw.viewModels = []
    for (let i = 0; i < instance.viewModelCount; i++) {
      const vm = instance.viewModelByIndex(i)
      const entry = {
        name: vm.name,
        instances: vm.instanceNames,
        properties: vm.properties.map(p => ({ name: p.name, type: String(p.type) })),
      }
      // A nested view model's own properties are reachable through an
      // instance; its name is not readable anywhere (probe finding).
      const childProps = entry.properties.filter(p => p.type === 'viewModel')
      if (childProps.length) {
        try {
          const inst = vm.defaultInstance() ?? vm.instance()
          entry.children = childProps.map(p => {
            const child = inst?.viewModel(p.name)
            return { property: p.name, childProperties: child ? child.properties.map(q => ({ name: q.name, type: String(q.type) })) : null }
          })
        } catch {
          entry.children = childProps.map(p => ({ property: p.name, childProperties: null }))
        }
      }
      raw.viewModels.push(entry)
    }
    raw.enums = (instance.enums?.() ?? []).map(e => ({ name: e.name, values: e.values }))
    raw.defaultViewModel = instance.defaultViewModel()?.name ?? null
  } finally {
    instance.cleanup()
    stopListening()
  }
  raw.runtimeMessages = [...said].map(([text, count]) => ({ text, count }))

  raw.perArtboardDefaultVM = {}
  const toRead = raw.artboards.slice(0, PER_ARTBOARD_CAP)
  raw.unreadArtboards = raw.artboards.slice(PER_ARTBOARD_CAP).map(a => a.name)
  for (const a of toRead) {
    if (a.name === raw.defaultArtboard) {
      raw.perArtboardDefaultVM[a.name] = raw.defaultViewModel
      continue
    }
    try {
      const r = await loadInstance(buffer, canvas, { artboard: a.name })
      try { raw.perArtboardDefaultVM[a.name] = r.defaultViewModel()?.name ?? null }
      finally { r.cleanup() }
    } catch {
      raw.unreadArtboards.push(a.name)
    }
  }
  return raw
}
