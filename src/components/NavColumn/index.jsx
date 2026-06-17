import { useNavState, useNavActions } from '../../context/NavigationContext'
import { SECTIONS, CATEGORIES, FILTERS } from '../../data/navigation'
import styles from './NavColumn.module.css'

// ─── NavColumn ──────────────────────────────────────────────────────────────
//
// The middle column. A single-open accordion holding the two tools. A vertical
// column (not the old horizontal tab strip) so each category owns a full-width
// row: long labels wrap inside their row instead of competing for horizontal
// space, and adding a category adds a row.
//
// Two sections behave differently because their content models differ:
//   Token Lab  — disclosure only. Expands to four category rows; the hero stays
//                until a category is clicked.
//   Principles — disclosure AND destination. Opening it shows the grid and
//                reveals the Classic / Extended filters.
// That asymmetry lives in the reducer (see NavigationContext); this component
// just renders the current state and dispatches the section/leaf clicks.

const PRINCIPLE_FILTERS = [
  { id: FILTERS.CLASSIC,  label: 'Classic'  },
  { id: FILTERS.EXTENDED, label: 'Extended' },
]

export function NavColumn() {
  const { section, destination, expandedSection, principleFilter } = useNavState()
  const { selectCategory, toggleSection, setFilter } = useNavActions()

  const tokenLabOpen   = expandedSection === SECTIONS.TOKEN_LAB
  const principlesOpen = expandedSection === SECTIONS.PRINCIPLES

  // Stable ids so each header's aria-controls points at the region it expands.
  const tokenLabBodyId   = 'nav-section-token-lab'
  const principlesBodyId = 'nav-section-principles'

  return (
    <nav className={styles.nav} aria-label="Tools and categories">
      {/* ── Token Lab ─────────────────────────────────────────────────── */}
      <SectionHeader
        label="Token Lab"
        open={tokenLabOpen}
        bodyId={tokenLabBodyId}
        // "Active" (the current tool) only once a category is selected; the
        // header itself loads nothing. aria-current lives on the selected
        // category row, not the header, so it is not flagged current here.
        active={section === SECTIONS.TOKEN_LAB && destination !== null}
        current={false}
        onClick={() => toggleSection(SECTIONS.TOKEN_LAB)}
      />
      <AccordionBody id={tokenLabBodyId} open={tokenLabOpen}>
        {CATEGORIES.map(cat => (
          <NavRow
            key={cat.id}
            label={cat.label}
            active={destination === cat.id}
            tabbable={tokenLabOpen}
            onClick={() => selectCategory(cat.id)}
          />
        ))}
      </AccordionBody>

      {/* ── Principles ────────────────────────────────────────────────── */}
      <SectionHeader
        label="Principles"
        open={principlesOpen}
        bodyId={principlesBodyId}
        // The Principles header IS the destination (the grid), so it is both
        // active styling AND the current location for assistive tech.
        active={section === SECTIONS.PRINCIPLES}
        current={section === SECTIONS.PRINCIPLES}
        onClick={() => toggleSection(SECTIONS.PRINCIPLES)}
      />
      <AccordionBody id={principlesBodyId} open={principlesOpen}>
        {PRINCIPLE_FILTERS.map(f => (
          <NavRow
            key={f.id}
            label={f.label}
            active={principleFilter === f.id}
            tabbable={principlesOpen}
            onClick={() => setFilter(f.id)}
          />
        ))}
      </AccordionBody>
    </nav>
  )
}

function SectionHeader({ label, open, active, current, bodyId, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.header} ${active ? styles.headerActive : ''}`}
      aria-expanded={open}
      aria-controls={bodyId}
      aria-current={current ? 'true' : undefined}
      onClick={onClick}
    >
      <span className={styles.caret} data-open={open} aria-hidden="true" />
      <span className={styles.headerLabel}>{label}</span>
    </button>
  )
}

// The expand/collapse uses the grid-template-rows 0fr <-> 1fr technique: a pure
// CSS height animation with no JS measurement and no Framer Motion, so it
// creates no ProjectionNode and cannot interfere with the demo-area crossfade.
// Reads --feedback-nav-duration and is disabled under prefers-reduced-motion
// (see the stylesheet). aria-hidden + the row's own tabIndex keep the collapsed
// rows out of the a11y tree and the tab order. The id is the aria-controls
// target of the matching header.
function AccordionBody({ id, open, children }) {
  return (
    <div id={id} className={`${styles.body} ${open ? styles.bodyOpen : ''}`}>
      <div className={styles.bodyInner} aria-hidden={!open}>
        {children}
      </div>
    </div>
  )
}

// aria-current exposes the selected category/filter to assistive tech, so the
// active state is not communicated by color alone (WCAG 1.4.1).
function NavRow({ label, active, tabbable, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.row} ${active ? styles.rowActive : ''}`}
      onClick={onClick}
      tabIndex={tabbable ? 0 : -1}
      aria-current={active ? 'true' : undefined}
    >
      {label}
    </button>
  )
}
