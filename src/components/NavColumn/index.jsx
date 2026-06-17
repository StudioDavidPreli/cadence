import { useNavState, useNavActions } from '../../context/NavigationContext'
import { RailDrawer } from '../RailDrawer'
import { SECTIONS, CATEGORIES, FILTERS } from '../../data/navigation'
import styles from './NavColumn.module.css'

// ─── NavColumn ──────────────────────────────────────────────────────────────
//
// The navigation column. Above 1024px it is a single-open accordion inline in
// its own column. At/below 1024px (controlled by the parent via `collapsed`) it
// becomes a "Navigation" rail that opens the same accordion as a drawer.
//
// Collapse and drawer state are owned by TokenLab, not here, so the Tokens and
// Navigation drawers are mutually exclusive: opening one closes the other. This
// component just renders the form the parent asks for.

const PRINCIPLE_FILTERS = [
  { id: FILTERS.CLASSIC,  label: 'Classic'  },
  { id: FILTERS.EXTENDED, label: 'Extended' },
]

export function NavColumn({ collapsed, open, onToggle, onClose }) {
  if (!collapsed) {
    return (
      <nav className={styles.nav} aria-label="Tools and categories">
        <NavAccordion />
      </nav>
    )
  }

  return (
    <RailDrawer
      label="Navigation"
      drawerId="nav-drawer"
      open={open}
      onToggle={onToggle}
      onClose={onClose}
    >
      {/* Choosing a destination closes the drawer; toggling a section open does
          not (the user is about to pick within it). */}
      <NavAccordion onNavigate={onClose} />
    </RailDrawer>
  )
}

// ─── NavAccordion ─────────────────────────────────────────────────────────────
// The two-section accordion, shared by the inline column and the drawer. In the
// drawer, onNavigate closes it when a destination is chosen — but NOT when the
// Token Lab header is toggled, since that is pure disclosure (the user is about
// to pick a category). In the inline column onNavigate is undefined (no close).
function NavAccordion({ onNavigate }) {
  const { section, destination, expandedSection, principleFilter } = useNavState()
  const { selectCategory, toggleSection, setFilter } = useNavActions()

  const tokenLabOpen   = expandedSection === SECTIONS.TOKEN_LAB
  const principlesOpen = expandedSection === SECTIONS.PRINCIPLES

  const tokenLabBodyId   = 'nav-section-token-lab'
  const principlesBodyId = 'nav-section-principles'

  const pickCategory    = id => { selectCategory(id); onNavigate?.() }
  const pickFilter      = f  => { setFilter(f); onNavigate?.() }
  const clickPrinciples = () => { toggleSection(SECTIONS.PRINCIPLES); onNavigate?.() }
  const clickTokenLab   = () => toggleSection(SECTIONS.TOKEN_LAB) // disclosure only

  return (
    <>
      {/* ── Token Lab ─────────────────────────────────────────────────── */}
      <SectionHeader
        label="Token Lab"
        open={tokenLabOpen}
        bodyId={tokenLabBodyId}
        active={section === SECTIONS.TOKEN_LAB && destination !== null}
        current={false}
        onClick={clickTokenLab}
      />
      <AccordionBody id={tokenLabBodyId} open={tokenLabOpen}>
        {CATEGORIES.map(cat => (
          <NavRow
            key={cat.id}
            label={cat.label}
            active={destination === cat.id}
            tabbable={tokenLabOpen}
            onClick={() => pickCategory(cat.id)}
          />
        ))}
      </AccordionBody>

      {/* ── Principles ────────────────────────────────────────────────── */}
      <SectionHeader
        label="Principles"
        open={principlesOpen}
        bodyId={principlesBodyId}
        active={section === SECTIONS.PRINCIPLES}
        current={section === SECTIONS.PRINCIPLES}
        onClick={clickPrinciples}
      />
      <AccordionBody id={principlesBodyId} open={principlesOpen}>
        {PRINCIPLE_FILTERS.map(f => (
          <NavRow
            key={f.id}
            label={f.label}
            active={principleFilter === f.id}
            tabbable={principlesOpen}
            onClick={() => pickFilter(f.id)}
          />
        ))}
      </AccordionBody>
    </>
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
