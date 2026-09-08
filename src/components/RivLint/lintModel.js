// The .riv linter's data model (build-order item 9): pure functions from the
// runtime's answers to a report, findings, a diff, and a contract check. No
// DOM, no Rive import; the page (session 2) does the loading and hands the
// plain objects here, so everything in this file runs under Vitest with the
// e2e manifest's 73 entries as fixtures.
//
// Three shapes move through it:
//
//   raw        what the runtime read, as the page (and the probe harness that
//              preceded it) records it: `contents` artboards with their state
//              machines and inputs, view models with instances and properties,
//              enums, the assets the loader callback saw, and each artboard's
//              default view model.
//   inventory  the normalized report body: input type codes turned into words,
//              assets classified, every list in a stable key-by-name form.
//   entry      the e2e manifest's shape (e2e/rivlint/manifest.json): the
//              inventory projected onto the keys the site's own gate pins.
//
// The rules carry no Cadence convention. David's call at the gate
// (2026-09-08): "no one cares about my own internal conventions; the tool
// lints against industry standards or a user's definition in a previous
// report." Each rule below is justified by the runtime's contract or Rive's
// published guidance; the house conventions live only in the e2e manifest,
// which is one user's contract run by that user's suite. The probe record
// behind every rule: docs/briefings/ITEM9_RIV_LINTER_KICKOFF.md.

// The runtime reports state machine input types as its StateMachineInputType
// enum, numeric. The words are what a consumer writes.
export const INPUT_TYPE_NAMES = { 56: 'number', 58: 'trigger', 59: 'boolean' }

// Names the editor assigns when the author never renames. A consumer addresses
// artboards, machines, timelines, view models and instances by these strings,
// so an unnamed one is a hygiene note (Rive's data-binding guidance asks for
// clear names; over a hundred hits in the probe set, hence a note, not a
// warning).
export const DEFAULT_NAME = /^(State Machine \d+|New Artboard|Artboard( \d+)?|ViewModel\d*|View Model \d+|Timeline \d+|Animation \d+|Instance( \d+)?|Trigger \d+|Number \d+|Boolean \d+)$/i

// Rive's own guidance is to subset glyphs; an embedded font past this is the
// size of the whole rest of a typical file.
export const LARGE_FONT_BYTES = 500_000

export const SEVERITY_ORDER = { fail: 0, warn: 1, note: 2 }

// ─── normalize ──────────────────────────────────────────────────────────────

function assetKind(a) {
  if (a.isImage) return 'image'
  if (a.isFont) return 'font'
  if (a.isAudio) return 'audio'
  return 'other'
}

// Embedded assets arrive with their bytes; hosted ones carry a CDN id and no
// bytes; referenced ones carry neither and need the consumer's asset loader.
function assetStorage(a) {
  if (a.cdnUuid) return 'hosted'
  if ((a.bytes ?? 0) > 0) return 'embedded'
  return 'referenced'
}

// raw → inventory. Tolerates the two ways the page can record per-artboard
// defaults (inline on the artboard, or the probe's map keyed by name) and
// leaves a section undefined when the raw read did not carry it, so a
// partial inventory (a bare manifest entry, say) stays honest about what it
// does not know rather than reading as empty.
export function normalizeInventory(raw) {
  const perArtboard = raw.perArtboardDefaultVM ?? {}
  const artboards = (raw.artboards ?? []).map(a => {
    const stateMachines = (a.stateMachines ?? []).map(s =>
      typeof s === 'string'
        ? { name: s, inputs: undefined }
        : {
            name: s.name,
            inputs: s.inputs?.map(i => ({
              name: i.name,
              type: INPUT_TYPE_NAMES[String(i.type)] ?? String(i.type),
            })),
          }
    )
    const inline = a.defaultViewModel
    const mapped = perArtboard[a.name]
    const defaultViewModel =
      inline !== undefined ? inline
      : mapped !== undefined ? (typeof mapped === 'string' && mapped.startsWith('ERR ') ? undefined : mapped)
      : undefined
    return { name: a.name, animations: [...(a.animations ?? [])], stateMachines, defaultViewModel }
  })
  const viewModels = (raw.viewModels ?? []).map(v => ({
    name: v.name,
    instances: [...(v.instances ?? [])],
    properties: (v.properties ?? []).map(p => ({ name: p.name, type: String(p.type) })),
    // Raw reads name the child's list `childProperties`; a report read back
    // names it `properties`. Both normalize to the same thing.
    children: v.children?.map(c => ({
      property: c.property,
      properties: (c.childProperties ?? c.properties)?.map(p => ({ name: p.name, type: String(p.type) })) ?? null,
    })),
  }))
  const enums = raw.enums?.map(e => ({ name: e.name, values: [...(e.values ?? [])] }))
  const assets = raw.assets?.map(a => ({
    name: a.name,
    extension: a.fileExtension ?? a.extension ?? '',
    kind: a.kind ?? assetKind(a),
    storage: a.storage ?? assetStorage(a),
    bytes: a.bytes ?? 0,
  }))
  // The file's default artboard is a property of the file, not a position in
  // the list (David, 2026-09-08): the editor's "set as default", the artboard
  // a load that names none gets. Undefined when the read did not carry it.
  const defaultArtboard = typeof raw.defaultArtboard === 'string' ? raw.defaultArtboard : undefined
  return { defaultArtboard, artboards, viewModels, enums, assets }
}

// The artboard a consumer gets without asking for one by name. Read from the
// file when the inventory carries it; otherwise the first listed, flagged as
// assumed so the page can say so.
export function defaultArtboardOf(inv) {
  if (inv.defaultArtboard !== undefined) {
    const a = inv.artboards.find(x => x.name === inv.defaultArtboard) ?? null
    return { artboard: a, assumed: false }
  }
  return { artboard: inv.artboards[0] ?? null, assumed: true }
}

// inventory → the e2e manifest's entry shape. Order and keys match what
// e2e/rivlint.spec.js records, so a downloaded report is a valid baseline row.
export function toManifestEntry(inv) {
  return {
    ...(inv.defaultArtboard !== undefined ? { defaultArtboard: inv.defaultArtboard } : {}),
    artboards: inv.artboards.map(a => ({
      name: a.name,
      animations: [...a.animations],
      stateMachines: a.stateMachines.map(s => s.name),
      defaultViewModel: a.defaultViewModel ?? null,
    })),
    viewModels: inv.viewModels.map(v => ({
      name: v.name,
      instances: [...v.instances],
      properties: v.properties.map(p => ({ name: p.name, type: p.type })),
    })),
  }
}

// The facts a consumer needs before any rule (David's addition at the gate):
// the default artboard, its machines and inputs, and every view model with
// its properties.
export function handoff(inv) {
  const { artboard: a, assumed } = defaultArtboardOf(inv)
  return {
    defaultArtboard: a && {
      name: a.name,
      assumed,
      stateMachines: a.stateMachines,
      defaultViewModel: a.defaultViewModel ?? null,
    },
    viewModels: inv.viewModels.map(v => ({
      name: v.name,
      instances: v.instances,
      properties: v.properties,
    })),
  }
}

// ─── rules ──────────────────────────────────────────────────────────────────

function duplicates(names) {
  const seen = new Map()
  for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1)
  return [...seen].filter(([, c]) => c > 1).map(([n, c]) => ({ name: n, count: c }))
}

const fmtMB = bytes => `${(bytes / 1e6).toFixed(1)} MB`

// inventory → findings, each { rule, severity, path, message }. Sections the
// inventory does not carry (a partial read) produce no findings rather than
// false ones. Sorted fail, warn, note, then by path.
export function lint(inv) {
  const out = []
  const add = (rule, severity, path, message) => out.push({ rule, severity, path, message })
  const { artboards, viewModels, enums, assets } = inv

  // fail: the runtime's autoBind follows the default artboard's pointer; with
  // view models present and none bound, the artboard draws with no instance.
  const { artboard: main } = defaultArtboardOf(inv)
  if (main && viewModels.length > 0 && main.defaultViewModel === null) {
    add('unbound-default-artboard', 'fail', `artboard "${main.name}"`,
      `The default artboard binds no view model, and the file has ${viewModels.length === 1 ? 'one' : viewModels.length}. A runtime that auto-binds finds nothing here and draws the artboard with no instance.`)
  }

  // fail: the runtime resolves a name to its first match; the rest are
  // unreachable by name.
  for (const d of duplicates(artboards.map(a => a.name))) {
    add('duplicate-name', 'fail', `artboard "${d.name}"`, `${d.count} artboards share this name. A runtime addressing artboards by name reaches only the first.`)
  }
  for (const a of artboards) {
    for (const d of duplicates(a.stateMachines.map(s => s.name))) {
      add('duplicate-name', 'fail', `artboard "${a.name}" / state machine "${d.name}"`, `${d.count} state machines in this artboard share this name; only the first is reachable.`)
    }
    for (const s of a.stateMachines) {
      if (!s.inputs) continue
      for (const d of duplicates(s.inputs.map(i => i.name))) {
        add('duplicate-name', 'fail', `artboard "${a.name}" / state machine "${s.name}" / input "${d.name}"`, `${d.count} inputs share this name; only the first is reachable.`)
      }
    }
  }
  for (const d of duplicates(viewModels.map(v => v.name))) {
    add('duplicate-name', 'fail', `view model "${d.name}"`, `${d.count} view models share this name; only the first is reachable.`)
  }
  for (const v of viewModels) {
    for (const d of duplicates(v.instances)) {
      add('duplicate-name', 'fail', `view model "${v.name}" / instance "${d.name}"`, `${d.count} instances share this name; only the first is reachable by name.`)
    }
    for (const d of duplicates(v.properties.map(p => p.name))) {
      add('duplicate-name', 'fail', `view model "${v.name}" / property "${d.name}"`, `${d.count} properties share this name; only the first is reachable.`)
    }
  }
  if (enums) {
    for (const d of duplicates(enums.map(e => e.name))) {
      add('duplicate-name', 'fail', `enum "${d.name}"`, `${d.count} enums share this name.`)
    }
  }

  // warn: costs the consumer must plan for.
  if (assets) {
    for (const a of assets) {
      if (a.storage === 'hosted') {
        add('hosted-asset', 'warn', `asset "${a.name}"`, `Hosted on Rive's CDN. A runtime fetches it over the network at load unless the consumer turns the CDN off.`)
      } else if (a.storage === 'referenced') {
        add('referenced-asset', 'warn', `asset "${a.name}"`, `Referenced, not embedded. It draws nothing unless the consumer supplies it through an asset loader.`)
      }
      if (a.storage === 'embedded' && a.kind === 'font' && a.bytes > LARGE_FONT_BYTES) {
        add('large-embedded-font', 'warn', `asset "${a.name}"`, `An embedded font of ${fmtMB(a.bytes)}. Rive's guidance is to subset the glyphs; most of this is characters the file never draws.`)
      }
    }
    const embedded = assets.filter(a => a.storage === 'embedded')
    for (const d of duplicates(embedded.map(a => `${a.name} ${a.bytes}`))) {
      const [name, bytes] = d.name.split(' ')
      add('duplicate-embedded-asset', 'warn', `asset "${name}"`, `Embedded ${d.count} times, ${fmtMB(Number(bytes) * d.count)} in total. One copy would do.`)
    }
  }

  // note: hygiene.
  for (const a of artboards) {
    if (DEFAULT_NAME.test(a.name)) add('default-name', 'note', `artboard "${a.name}"`, `Still carries the editor's default name.`)
    for (const s of a.stateMachines) {
      if (DEFAULT_NAME.test(s.name)) add('default-name', 'note', `artboard "${a.name}" / state machine "${s.name}"`, `Still carries the editor's default name.`)
      for (const i of s.inputs ?? []) {
        if (DEFAULT_NAME.test(i.name)) add('default-name', 'note', `artboard "${a.name}" / state machine "${s.name}" / input "${i.name}"`, `Still carries the editor's default name.`)
      }
    }
    for (const t of a.animations) {
      if (DEFAULT_NAME.test(t)) add('default-name', 'note', `artboard "${a.name}" / timeline "${t}"`, `Still carries the editor's default name.`)
    }
    if (a.stateMachines.length === 0) add('no-state-machine', 'note', `artboard "${a.name}"`, `No state machine. A runtime can only play its timelines directly.`)
  }
  for (const v of viewModels) {
    if (DEFAULT_NAME.test(v.name)) add('default-name', 'note', `view model "${v.name}"`, `Still carries the editor's default name.`)
    for (const i of v.instances) {
      if (DEFAULT_NAME.test(i)) add('default-name', 'note', `view model "${v.name}" / instance "${i}"`, `Still carries the editor's default name.`)
    }
    // The editor's implicit instance has the empty string for a name (seven of
    // the probe's files). It is an instance a consumer cannot ask for by name,
    // so it counts as none.
    if (v.instances.every(i => i.trim() === '')) add('no-named-instance', 'note', `view model "${v.name}"`, `No named instance. A consumer can only take the default instance and hope its values are the intended ones.`)
  }

  return out.sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity] || x.path.localeCompare(y.path))
}

// ─── diff ───────────────────────────────────────────────────────────────────

// Assets can legitimately share a name (a font embedded three times), so they
// key by name plus occurrence.
function keyByOccurrence(list, nameOf) {
  const seen = new Map()
  return list.map(item => {
    const n = nameOf(item)
    const k = seen.get(n) ?? 0
    seen.set(n, k + 1)
    return [k === 0 ? n : `${n} (${k + 1})`, item]
  })
}

function byName(list, nameOf = x => x.name) {
  return new Map(keyByOccurrence(list, nameOf))
}

// Two inventories → entries { path, change: 'appeared' | 'vanished' |
// 'changed', from, to }, keyed by name at every level so a renamed artboard
// reads as one vanished and one appeared (honest, if noisy). Sections either
// side does not carry are skipped: a bare manifest entry knows nothing about
// inputs, enums or assets, and the diff must not report that ignorance as a
// change.
export function diffInventories(a, b) {
  const out = []
  const push = (path, change, from, to) => out.push({ path, change, from, to })

  const diffSet = (path, xs, ys) => {
    const X = new Set(xs), Y = new Set(ys)
    for (const v of xs) if (!Y.has(v)) push(`${path} "${v}"`, 'vanished')
    for (const v of ys) if (!X.has(v)) push(`${path} "${v}"`, 'appeared')
  }
  const diffScalar = (path, from, to) => {
    if (from === undefined || to === undefined) return
    if (from !== to) push(path, 'changed', from, to)
  }
  // Keyed lists: vanished / appeared by key, then a per-pair callback.
  const diffKeyed = (path, xs, ys, nameOf, each) => {
    const X = byName(xs, nameOf), Y = byName(ys, nameOf)
    for (const k of X.keys()) if (!Y.has(k)) push(`${path} "${k}"`, 'vanished')
    for (const k of Y.keys()) if (!X.has(k)) push(`${path} "${k}"`, 'appeared')
    for (const [k, x] of X) if (Y.has(k)) each(`${path} "${k}"`, x, Y.get(k))
  }

  diffScalar('default artboard', a.defaultArtboard, b.defaultArtboard)
  diffKeyed('artboard', a.artboards, b.artboards, x => x.name, (p, x, y) => {
    diffSet(`${p} / timeline`, x.animations, y.animations)
    diffKeyed(`${p} / state machine`, x.stateMachines, y.stateMachines, s => s.name, (sp, sx, sy) => {
      if (!sx.inputs || !sy.inputs) return
      diffKeyed(`${sp} / input`, sx.inputs, sy.inputs, i => i.name, (ip, ix, iy) => diffScalar(`${ip} type`, ix.type, iy.type))
    })
    diffScalar(`${p} default view model`, x.defaultViewModel, y.defaultViewModel)
  })
  diffKeyed('view model', a.viewModels, b.viewModels, x => x.name, (p, x, y) => {
    diffSet(`${p} / instance`, x.instances, y.instances)
    diffKeyed(`${p} / property`, x.properties, y.properties, q => q.name, (qp, qx, qy) => diffScalar(`${qp} type`, qx.type, qy.type))
  })
  if (a.enums && b.enums) {
    diffKeyed('enum', a.enums, b.enums, x => x.name, (p, x, y) => diffSet(`${p} / value`, x.values, y.values))
  }
  if (a.assets && b.assets) {
    diffKeyed('asset', a.assets, b.assets, x => x.name, (p, x, y) => {
      diffScalar(`${p} storage`, x.storage, y.storage)
      diffScalar(`${p} kind`, x.kind, y.kind)
      if (x.storage === 'embedded' && y.storage === 'embedded') diffScalar(`${p} bytes`, x.bytes, y.bytes)
    })
  }
  return out
}

// ─── contract ───────────────────────────────────────────────────────────────

// A previous report as the expected definition, superset semantics (David's
// call): everything the contract names must still be present with the same
// type, each artboard's default view model must match, and anything the file
// gained is listed but does not fail. This is how a consumer's code breaks: a
// re-export that adds a property is harmless, one that loses or retypes
// anything is not.
export function checkContract(expected, actual) {
  const entries = diffInventories(expected, actual)
  const failures = entries.filter(e => e.change !== 'appeared')
  const additions = entries.filter(e => e.change === 'appeared')
  return { pass: failures.length === 0, failures, additions }
}

// ─── report i/o ─────────────────────────────────────────────────────────────

export const REPORT_FORMAT = 'cadence-riv-report/1'

// The download: { meta, inventory }. Projected onto the manifest's keys with
// toManifestEntry it is a valid e2e baseline row; dropped back on the page it
// is a diff or contract input. One shape, three uses.
export function buildReport(raw, meta) {
  return {
    meta: {
      format: REPORT_FORMAT,
      file: meta.file,
      size: meta.size,
      runtime: meta.runtime,
      date: meta.date,
    },
    inventory: normalizeInventory(raw),
  }
}

// Accepts the page's own download, a bare inventory, or a bare e2e manifest
// entry (artboards whose state machines are strings). Returns an inventory or
// null when the object is none of these. Unknown sections stay undefined.
export function parseReport(obj) {
  if (!obj || typeof obj !== 'object') return null
  const body = obj.inventory && obj.meta ? obj.inventory : obj
  if (!Array.isArray(body.artboards) || !Array.isArray(body.viewModels)) return null
  return normalizeInventory(body)
}
