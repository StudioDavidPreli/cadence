// The guide's data model: one pure function joining the cadence-tokens package
// (values, provenance) with the site's consumption map, returning everything
// the renderer needs as plain strings and arrays. Pure and tested so the
// renderer stays dumb, and generated so the exit criterion of build-order item
// 5 holds: a token added to the package appears here with no hand edit (the
// rows iterate the export document, never a hand-kept list; the package's own
// provenance completeness test guarantees the new row arrives with a story).
//
// The guide documents the SHIPPED system: values come from the three built-in
// presets via the same stateToExport the export buttons use, not from the
// user's live slider state. A reader mid-experiment in Token Lab still sees
// the published numbers here, which is what a reference is for.

import {
  BUILT_IN_PRESETS,
  stateToExport,
  provenance,
  EASING_CURVES,
  AMBIENT_PRESETS,
  AMBIENT_BASE_PERIOD,
  tokenKeyToCssSuffix,
} from 'cadence-tokens'
import { TOKEN_COMPONENT_MAP } from '../../data/tokenConsumption'

const PRESET_ORDER = BUILT_IN_PRESETS.map(p => p.id)
export const PRESET_LABELS = Object.fromEntries(BUILT_IN_PRESETS.map(p => [p.id, p.label]))

// A bezier array formatted as its CSS function, annotated with the named curve
// it equals (if any) so the table reads "Standard · cubic-bezier(…)" rather
// than four bare numbers.
function fmtBezier(arr) {
  const named = Object.entries(EASING_CURVES).find(([, c]) =>
    c.fm.length === arr.length && c.fm.every((v, i) => v === arr[i])
  )
  const css = `cubic-bezier(${arr.join(', ')})`
  return named ? `${named[1].label} · ${css}` : css
}

const fmtMs = n => `${n}ms`
const fmtNum = n => String(n)

// Per-family formatting and naming. `cssFamily` is the CSS property segment
// (easing's runtime family is `ease`, the one naming seam the export already
// documents); `fmt` renders a value for the table.
const INTERACTION_FAMILIES = [
  { id: 'duration', title: 'Duration', exportKey: 'duration', cssFamily: 'duration', provFamily: 'duration', fmt: fmtMs },
  { id: 'easing',   title: 'Easing',   exportKey: 'easing',   cssFamily: 'ease',     provFamily: 'easing',   fmt: fmtBezier },
  { id: 'delay',    title: 'Delay',    exportKey: 'delay',    cssFamily: 'delay',    provFamily: 'delay',    fmt: fmtMs },
  { id: 'scale',    title: 'Scale',    exportKey: 'scale',    cssFamily: 'scale',    provFamily: 'scale',    fmt: fmtNum },
  { id: 'spring',   title: 'Spring',   exportKey: 'spring',   cssFamily: 'spring',   provFamily: 'spring',   fmt: fmtNum },
]

// Ambient rows: property names per buildRiveDefaults (the VM carries four of
// the values under the .riv property names; spread and the base period are
// clock-side and say so). The field itself is the consumer.
const AMBIENT_PROPERTY = {
  speed: 'PathEffectVM.speed',
  easing: 'PathEffectVM.easing',
  cell: 'PathEffectVM.cellSize',
  gap: 'PathEffectVM.gapSize',
  spread: 'clock (field stagger)',
}
const AMBIENT_CONSUMERS = ['Motion Tiles field']

export function buildGlossaryModel() {
  // One export document per preset; every interaction row reads across them.
  const exports_ = Object.fromEntries(
    BUILT_IN_PRESETS.map(p => [p.id, stateToExport(p.state)])
  )

  const families = INTERACTION_FAMILIES.map(family => {
    const keys = Object.keys(exports_[PRESET_ORDER[0]][family.exportKey])
    return {
      id: family.id,
      title: family.title,
      rows: keys.map(key => {
        const provKey = `${family.provFamily}.${key}`
        return {
          key,
          property: `--motion-${family.cssFamily}-${tokenKeyToCssSuffix(key)}`,
          values: Object.fromEntries(
            PRESET_ORDER.map(id => [id, family.fmt(exports_[id][family.exportKey][key])])
          ),
          provenance: provenance[provKey] ?? null,
          consumers: TOKEN_COMPONENT_MAP[provKey] ?? [],
        }
      }),
    }
  })

  // The duration scalar: a lone value, its own one-row family, the same
  // dedicated-branch treatment it gets everywhere else in the system.
  families.push({
    id: 'scalar',
    title: 'Duration scalar',
    rows: [{
      key: 'scalar',
      property: '--motion-duration-scalar',
      values: Object.fromEntries(
        PRESET_ORDER.map(id => [id, fmtNum(exports_[id].scalar)])
      ),
      provenance: provenance['scalar'] ?? null,
      consumers: ['DurationVisualizer'],
    }],
  })

  // The ambient vocabulary: base period first (the anchor), then the per-preset
  // value keys in the order the preset table carries them.
  const ambientKeys = Object.keys(AMBIENT_PRESETS[PRESET_ORDER[0]])
    .filter(k => k !== 'label' && k !== 'riveInstance')
  families.push({
    id: 'ambient',
    title: 'Ambient (Motion Tiles)',
    rows: [
      {
        key: 'basePeriod',
        property: 'clock (period = base / speed)',
        values: Object.fromEntries(
          PRESET_ORDER.map(id => [id, `${AMBIENT_BASE_PERIOD}s`])
        ),
        provenance: provenance['ambient.basePeriod'] ?? null,
        consumers: AMBIENT_CONSUMERS,
      },
      ...ambientKeys.map(key => ({
        key,
        property: AMBIENT_PROPERTY[key] ?? 'clock',
        values: Object.fromEntries(
          PRESET_ORDER.map(id => [id, fmtNum(AMBIENT_PRESETS[id][key])])
        ),
        provenance: provenance[`ambient.${key}`] ?? null,
        consumers: AMBIENT_CONSUMERS,
      })),
    ],
  })

  // The Components view: the consumption map inverted. Component names sort
  // alphabetically; each component's reads keep the map's family order (the
  // map is authored in family order, so iterating it preserves that).
  const byComponent = new Map()
  for (const [path, components] of Object.entries(TOKEN_COMPONENT_MAP)) {
    for (const name of components) {
      if (!byComponent.has(name)) byComponent.set(name, [])
      byComponent.get(name).push(path)
    }
  }
  const components = [...byComponent.keys()].sort().map(name => ({
    name,
    reads: byComponent.get(name),
  }))

  return { families, components }
}
