// The Glossary: the generated style guide (build-order item 5; renamed from
// Guide 2026-09-03, David's call, so a third leaf of defined terms can join
// later). Two views over one data model: Tokens (per family, with values per
// preset, provenance, and consumers) and Components (the inverse read).
// Everything on the page comes from buildGlossaryModel, which joins the
// cadence-tokens package with the consumption map, so a token added to the
// package appears here with no hand edit.
//
// Both views are tall, so every section is a disclosure: heading closed by
// default, click to twirl down (David's call, same session). The expand is the
// nav accordion's grid-template-rows technique — pure CSS on the fixed
// --feedback-nav-duration, no ProjectionNode, held static under reduced
// motion.
//
// This section replaces the whole right region like MotionTilesSection does,
// and it owns its own scroll. It sits outside MotionTokensProvider on purpose:
// the glossary documents the shipped presets, not the user's live slider
// state, and its only motion is chrome.
//
// Copy on this page is drafted against archive/voice/voice-analysis.md and
// awaits David's voice pass (session 3 of the item). Em-dash count: zero.

import { useMemo, useState } from 'react'
import { useNavState } from '../../context/NavigationContext'
import { GLOSSARY_COMPONENTS } from '../../data/navigation'
import { buildGlossaryModel, PRESET_LABELS } from './glossaryModel'
import { TokensTitle, ComponentsTitle } from './GlossaryTitle'
import styles from './Glossary.module.css'

// The provenance legend, rendered once at the top of the Tokens view. The
// wording mirrors packages/tokens/src/provenance.js (approved 2026-09-03).
const TAG_LEGEND = [
  { tag: 'measured', text: 'Extracted from a source by measurement. The claim is specific and falsifiable.' },
  { tag: 'derived', text: 'Adopted from a named reference system. Derivation is on role and lineage, never a claim of value equality.' },
  { tag: 'tuned', text: 'Authored for Cadence by eye and ear against the running components. No external source; the values are their own record.' },
]

export function GlossarySection() {
  const { destination } = useNavState()
  const model = useMemo(() => buildGlossaryModel(), [])

  return (
    // tabIndex + role + name: the glossary is a scrollable region whose content
    // can outgrow the viewport, so it needs a tab stop for keyboard scrolling
    // (axe scrollable-region-focusable, serious). The focus ring is chrome, on
    // --color-accent like every focus ring here.
    <div
      className={styles.scroll}
      tabIndex={0}
      role="region"
      aria-label="Glossary"
    >
      <article className={styles.page}>
        {destination === GLOSSARY_COMPONENTS
          ? <ComponentsView components={model.components} />
          : <TokensView families={model.families} />}
      </article>
    </div>
  )
}

// One disclosure section: an h3 heading whose button toggles the body. Closed
// by default so each view reads as a scannable index; the count keeps the
// closed row informative. Content carries no focusable elements, so
// aria-hidden alone is enough to keep the closed body out of the a11y tree.
function Disclosure({ id, title, count, children }) {
  const [open, setOpen] = useState(false)
  const bodyId = `glossary-body-${id}`
  return (
    <section className={styles.disclosure}>
      <h3 className={styles.heading}>
        <button
          type="button"
          className={styles.headingButton}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(o => !o)}
        >
          <span className={styles.caret} data-open={open} aria-hidden="true" />
          <span className={styles.headingLabel}>{title}</span>
          <span className={styles.count}>{count}</span>
        </button>
      </h3>
      <div id={bodyId} className={`${styles.body} ${open ? styles.bodyOpen : ''}`}>
        <div className={styles.bodyInner} aria-hidden={!open}>
          {children}
        </div>
      </div>
    </section>
  )
}

function TokensView({ families }) {
  return (
    <>
      <TokensTitle />
      <p className={styles.lede}>
        Every value the system carries, with where it came from and who reads
        it. This page is generated from the same package the site runs
        (cadence-tokens), so it cannot drift from the tool.
      </p>

      <section className={styles.legend} aria-label="Provenance legend">
        {TAG_LEGEND.map(({ tag, text }) => (
          <p key={tag} className={styles.legendRow}>
            <span className={styles.tag}>[{tag}]</span> {text}
          </p>
        ))}
      </section>

      {families.map(family => (
        <Disclosure
          key={family.id}
          id={`family-${family.id}`}
          title={family.title}
          count={family.rows.length}
        >
          {family.rows.map(row => <TokenRow key={row.key} row={row} />)}
        </Disclosure>
      ))}
    </>
  )
}

function TokenRow({ row }) {
  const prov = row.provenance
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <code className={styles.property}>{row.property}</code>
        {prov && <span className={styles.tag}>[{prov.tag}]</span>}
      </div>

      <dl className={styles.values}>
        {Object.entries(row.values).map(([presetId, value]) => (
          <div key={presetId} className={styles.value}>
            <dt className={styles.valueLabel}>{PRESET_LABELS[presetId] ?? presetId}</dt>
            <dd className={styles.valueNumber}>{value}</dd>
          </div>
        ))}
      </dl>

      {prov && (
        <p className={styles.note}>
          {prov.note} <span className={styles.source}>Source: {prov.source}.</span>
        </p>
      )}
      {prov?.presets && <p className={styles.presetsNote}>{prov.presets}</p>}

      <p className={styles.consumers}>
        {row.consumers.length > 0
          ? <>Read by {row.consumers.join(', ')}.</>
          : 'No demo component reads this token directly.'}
      </p>
    </div>
  )
}

function ComponentsView({ components }) {
  return (
    <>
      <ComponentsTitle />
      <p className={styles.lede}>
        The same map read the other way: each demo component, and the tokens
        its source actually reads. A component is listed under a token only if
        the read is in its code, so this view is greppable against the
        repository.
      </p>

      {components.map(component => (
        <Disclosure
          key={component.name}
          id={`component-${component.name.replace(/\s/g, '-')}`}
          title={component.name}
          count={component.reads.length}
        >
          <ul className={styles.readsList}>
            {component.reads.map(path => (
              <li key={path}><code className={styles.readPath}>{path}</code></li>
            ))}
          </ul>
        </Disclosure>
      ))}
    </>
  )
}
