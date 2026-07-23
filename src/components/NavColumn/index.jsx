import { useRef } from 'react'
import { useNavState, useNavActions } from '../../context/NavigationContext'
import { RailDrawer } from '../RailDrawer'
import { NavBackground } from './NavBackground'
import { BACKGROUND_ENABLED } from './backgroundFlag'
import {
  SECTIONS,
  CATEGORIES,
  FILTERS,
  TOKEN_LAB_GUIDE,
  MOTION_TILES_LANDING,
  MOTION_TILES_GRID,
} from '../../data/navigation'
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
  const navRef = useRef(null)

  if (!collapsed) {
    return (
      <nav ref={navRef} className={styles.nav} aria-label="Tools and categories">
        {/* Background artwork, flagged off by default (?bg=1). Mounted only in
            the inline column: below 1024px the nav is a rail and drawer, not a
            column, and the artwork surface is defined as existing only above
            that breakpoint. Renders as a direct child of <nav> because its layer
            depends on this element's stacking context (see the module CSS). */}
        {BACKGROUND_ENABLED && <NavBackground navRef={navRef} />}
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
  const { selectCategory, toggleSection, setFilter, showMotionTilesLanding, enterMotionTilesGrid } = useNavActions()

  const tokenLabOpen     = expandedSection === SECTIONS.TOKEN_LAB
  const principlesOpen   = expandedSection === SECTIONS.PRINCIPLES
  const motionTilesOpen  = expandedSection === SECTIONS.MOTION_TILES

  const tokenLabBodyId    = 'nav-section-token-lab'
  const principlesBodyId  = 'nav-section-principles'
  const motionTilesBodyId = 'nav-section-motion-tiles'

  const pickCategory    = id => { selectCategory(id); onNavigate?.() }
  const pickFilter      = f  => { setFilter(f); onNavigate?.() }
  const clickPrinciples = () => { toggleSection(SECTIONS.PRINCIPLES); onNavigate?.() }
  // Opening Token Lab now shows the guide as its destination, so the header is a
  // destination like Principles. The drawer still stays open on toggle (the user
  // is about to pick a category from the revealed list); the guide shows behind
  // it and the Overview leaf is the explicit way back.
  const clickTokenLab   = () => toggleSection(SECTIONS.TOKEN_LAB)
  // Motion Tiles opens like Token Lab: the header discloses its leaves and shows
  // the landing, and the drawer stays open on toggle so the user can pick a leaf.
  const clickMotionTiles  = () => toggleSection(SECTIONS.MOTION_TILES)
  const pickMotionLanding = () => { showMotionTilesLanding(); onNavigate?.() }
  const pickMotionGrid    = () => { enterMotionTilesGrid();   onNavigate?.() }

  return (
    <>
      {/* ── Token Lab ─────────────────────────────────────────────────── */}
      <SectionHeader
        label="Token Lab"
        open={tokenLabOpen}
        bodyId={tokenLabBodyId}
        active={section === SECTIONS.TOKEN_LAB}
        current={section === SECTIONS.TOKEN_LAB}
        onClick={clickTokenLab}
      />
      <AccordionBody id={tokenLabBodyId} open={tokenLabOpen}>
        {/* Overview routes to the guide (the Token Lab landing). Sits above the
            four categories as the explicit way back to it after a demo. */}
        <NavRow
          label="Overview"
          active={destination === TOKEN_LAB_GUIDE}
          tabbable={tokenLabOpen}
          onClick={() => pickCategory(TOKEN_LAB_GUIDE)}
        />
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

      {/* ── Motion Tiles ──────────────────────────────────────────────── */}
      <SectionHeader
        label="Motion Tiles"
        open={motionTilesOpen}
        bodyId={motionTilesBodyId}
        active={section === SECTIONS.MOTION_TILES}
        current={section === SECTIONS.MOTION_TILES}
        onClick={clickMotionTiles}
      />
      <AccordionBody id={motionTilesBodyId} open={motionTilesOpen}>
        {/* Overview is the landing (the Enter gate); Grid jumps straight to the
            live grid, skipping the gate. Overview is also the in-app way back to
            the landing from the grid. */}
        <NavRow
          label="Overview"
          active={destination === MOTION_TILES_LANDING}
          tabbable={motionTilesOpen}
          onClick={pickMotionLanding}
        />
        <NavRow
          label="Grid"
          active={destination === MOTION_TILES_GRID}
          tabbable={motionTilesOpen}
          onClick={pickMotionGrid}
        />
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
