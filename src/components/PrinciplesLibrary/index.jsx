import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { PRINCIPLES, principleById } from '../../data/principles'
import { PrincipleCard } from '../PrincipleCard'
import { ExpandedPrincipleBody } from '../PrincipleCard/ExpandedPrincipleBody'
import { Modal } from '../Modal'
import { useDemoOverlay } from '../DemoArea/overlayContext'
import styles from './PrinciplesLibrary.module.css'

// ─── First-visit intro ────────────────────────────────────────────────────────
// The modal that fires the first time the library opens, explaining that the
// tool bar's tokens drive the components inside these cards. Persisted in
// localStorage so it shows once, with the header "How this works" button as the
// reopen path. Same try/catch storage pattern as ThemeContext — localStorage
// throws in private-mode / sandboxed contexts, so every access is guarded.
const INTRO_SEEN_KEY = 'cadence-principles-intro-v1'

function introAlreadySeen() {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === 'true'
  } catch {
    // Storage unavailable: treat as not-yet-seen so the explainer still shows.
    return false
  }
}

// ─── DeepLinkBody ─────────────────────────────────────────────────────────────
// The deep-link modal's content: the same ExpandedPrincipleBody the in-grid card
// renders, at the card's own 372×480 dimensions, plus the small pieces of demo
// state that body threads (uiMode / drawerOpen / showDemoMotion). State lives
// here rather than in PrinciplesLibrary so it resets on its own: this component
// mounts when the modal panel mounts and unmounts on close, so a reopened modal
// starts clean — the same "reset on unmount" the in-grid card gets from
// collapsing. Keyed by principle id at the call site so switching principles also
// remounts. onClose is the route-level close (closePrinciple), so the × / Escape
// / backdrop all rewrite the hash back to the plain grid.
function DeepLinkBody({ principle, tokens, prefersReducedMotion, onClose }) {
  const [uiMode, setUiMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showDemoMotion, setShowDemoMotion] = useState(false)

  // Mirrors PrincipleCard.handleStateToggle: flipping the Motion/UI view also
  // dismisses P02's drawer so it does not linger across the switch.
  const handleToggleState = () => {
    if (drawerOpen) setDrawerOpen(false)
    setUiMode(prev => !prev)
  }

  return (
    <div className={styles.deepLinkBody}>
      <ExpandedPrincipleBody
        principle={principle}
        tokens={tokens}
        prefersReducedMotion={prefersReducedMotion}
        uiMode={uiMode}
        onToggleState={handleToggleState}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        showDemoMotion={showDemoMotion}
        setShowDemoMotion={setShowDemoMotion}
        onClose={onClose}
      />
    </div>
  )
}

// ─── PrinciplesLibrary ────────────────────────────────────────────────────────
//
// CSS Grid of 18 principle cards. One card can be expanded at a time.
//
// ── Why CSS Grid with auto-fit ────────────────────────────────────────────────
// repeat(auto-fit, minmax(180px, 1fr)) gives responsive columns without any
// JavaScript width math. The browser computes column count at every container
// width. Framer Motion's layout prop FLIP-animates each card when the grid
// reflows — cards arrive together at ease.standard.
//
// ── Why grid-auto-flow: dense ─────────────────────────────────────────────────
// The expanded card takes a 2x2 footprint (grid-column/row span 2). This leaves
// a gap elsewhere in the row. dense packing fills that gap with later cards —
// the grid stays compact at the cost of strict visual ordering. Order is not
// fully preserved; this is a known tradeoff documented in CLAUDE.md.
//
// ── Column count awareness ────────────────────────────────────────────────────
// PrincipleCard needs the current column count to compute its expanded footprint
// (which direction to span — right vs. left for edge cards). The ResizeObserver
// reads grid-template-columns from getComputedStyle, which returns resolved pixel
// values ("220px 220px 220px ..."). Splitting by space gives the column count.
//
// ── No LayoutGroup needed ─────────────────────────────────────────────────────
// Cards use the layout prop with no layoutId. No FLIP scope to isolate.

// filter: 'all' | 'classic' | 'extended'. Subsets the grid by the principle's
// own `category` field. The nav column's Classic / Extended rows drive this;
// 'all' (the default) shows every principle.
//
// principleId / onCloseDeepLink: the deep-link route (#/principles/<filter>/
// <slug>). When principleId is set, the named principle opens as a modal over the
// otherwise-default grid; onCloseDeepLink (the route-level closePrinciple) rewrites
// the hash back to the plain grid. The grid itself is never expanded or scrolled
// by the link — the modal is the whole of the deep-link surface. See
// docs/decisions/principle-deep-links-2026-07-21.md.
export function PrinciplesLibrary({ filter = 'all', principleId = null, onCloseDeepLink }) {
  const tokens = useMotionTokens()
  const [selectedId, setSelectedId] = useState(null)

  // The demo column's overlay mount node. Passing it to Modal's portalTarget
  // centers the dialog inside the demo column instead of the viewport — the
  // same pattern Token Lab's Enter & Exit demo uses. useDemoOverlay returns
  // null until DemoArea's callback ref has captured the node (and outside a
  // DemoArea entirely), so it is null on the very first render.
  const overlay = useDemoOverlay()

  // Universal icon pause. One boolean drives every collapsed-card Rive icon at
  // once: each PrincipleIcon receives it as a prop and calls rive.pause()/play()
  // on its own instance. Held here (not per-card) so the whole grid stops and
  // resumes together. The expanded card's full PrincipleAnimation is unaffected
  // — this only governs the decorative grid icons.
  //
  // Reduced motion (2026-07-17): under the OS preference the grid starts
  // paused and the existing Pause/Play button is the explicit-playback
  // affordance. `pausedChoice` is the user's override (null until they press
  // the button); until then the effective state follows the preference, which
  // also covers framer's useReducedMotion resolving a tick after first
  // render. A user press always wins from then on, in either direction.
  const prefersReduced = useReducedMotion()
  const [pausedChoice, setPausedChoice] = useState(null)
  const iconsPaused = pausedChoice ?? prefersReduced

  // Intro modal. Auto-opens on the first visit, then the header button reopens
  // it. Dismissing (close button, backdrop, or Escape — all routed through
  // closeIntro) records the visit in localStorage; reopening does not clear it.
  const [introOpen, setIntroOpen] = useState(false)

  // Why an effect rather than a lazy `useState(() => !introAlreadySeen())`:
  // the auto-open must wait for `overlay` to exist. If it opened on the first
  // render (overlay still null), the Modal would mount viewport-fixed, then
  // re-render into the portal once the node arrived — restarting the enter
  // animation and flashing the dialog from the page center to the column
  // center. Gating the open on `overlay` makes the Modal mount into the column
  // on its first frame. Runs once the node is captured; the storage check keeps
  // it to genuine first visits.
  //
  // The intro is suppressed on deep-link entry (principleId set): two auto-open
  // modals cannot race, and a visitor who followed a principle link was sent to
  // that principle, not the guide. It is deliberately NOT marked seen, so their
  // next ordinary visit still gets the intro. Because the deps are [overlay],
  // closing the deep-link modal later in the same visit does not re-fire this.
  useEffect(() => {
    if (overlay && principleId == null && !introAlreadySeen()) setIntroOpen(true)
  }, [overlay, principleId])

  const closeIntro = () => {
    setIntroOpen(false)
    try {
      localStorage.setItem(INTRO_SEEN_KEY, 'true')
    } catch {
      // Best-effort persistence; ignore storage failures.
    }
  }

  // The principles actually rendered for the active filter. index, totalCards,
  // and the grid's auto-fit math all derive from THIS list, not the full set,
  // so the expanded-footprint geometry stays correct within a filtered grid.
  const visiblePrinciples =
    filter === 'all' ? PRINCIPLES : PRINCIPLES.filter(p => p.category === filter)

  // If the expanded card is filtered out from under the user, collapse it so a
  // stale selection can't leave an invisible card "expanded". Keyed on filter
  // so it only fires when the filter changes, not on every selection.
  useEffect(() => {
    setSelectedId(null)
  }, [filter])
  const [columnCount, setColumnCount] = useState(6)
  // cellWidth: pixel width of one grid column, read from the resolved
  // grid-template-columns. PrincipleCard uses it to compute the scale ratio
  // between its expanded (2-column) and collapsed (1-column) footprints for
  // the explicit-scale close animation. Default 190 is a reasonable estimate
  // for a typical panel before measurement runs; it is overwritten on mount.
  const [cellWidth, setCellWidth] = useState(190)
  const gridRef = useRef(null)

  // Read the actual column count and per-column width from the grid's computed
  // style. Both are derived from gridTemplateColumns, which auto-fit resolves
  // to a space-separated list of pixel values. Re-runs on any grid resize —
  // panel, window, or any layout shift that changes the number of auto-fit
  // columns or their resolved width.
  useLayoutEffect(() => {
    if (!gridRef.current) return

    const measure = () => {
      const computed = window.getComputedStyle(gridRef.current)
      const columns = computed.gridTemplateColumns.split(' ')
      setColumnCount(columns.length)
      setCellWidth(parseFloat(columns[0]))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(gridRef.current)
    return () => observer.disconnect()
  }, [])

  // Escape key dismissal.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const totalCards = visiblePrinciples.length

  // Deep-link modal (#/principles/<filter>/<slug>). principleId arrives from the
  // route; resolve it to a record. deepLinkOpen gates on overlay the same way the
  // intro does — a cold-loaded deep link mounts into the demo column on its first
  // frame instead of flashing viewport-fixed and restarting its enter animation.
  // An unresolved id (should not happen: parseHash only sets valid ids) or the
  // ordinary grid (null) leaves it closed. No separate open-state is needed: a
  // route close clears principleId, so deepLinkPrinciple goes null and the Modal
  // runs its own exit.
  const deepLinkPrinciple = principleId != null ? principleById(principleId) : null
  const deepLinkOpen = overlay != null && deepLinkPrinciple != null

  return (
    <div className={styles.library}>
      {/* Reopen affordance for the intro. Persistent so a returning visitor,
          past the one-time auto-open, can still find the explanation. */}
      <div className={styles.header}>
        {/* Universal pause for the grid icons. Sits to the left of "How this
            works". Label and aria-pressed reflect state: it reads "Pause" while
            the icons run and "Play" once stopped, so the way to resume is
            visible rather than implied. */}
        <button
          type="button"
          className={styles.pauseButton}
          onClick={() => setPausedChoice(!iconsPaused)}
          aria-pressed={iconsPaused}
        >
          {iconsPaused ? 'Play' : 'Pause'}
        </button>
        <button
          type="button"
          className={styles.infoButton}
          onClick={() => setIntroOpen(true)}
        >
          <span className={styles.infoGlyph} aria-hidden="true">i</span>
          How this works
        </button>
      </div>

      <Modal
        isOpen={introOpen}
        onClose={closeIntro}
        title="The tool bar drives these cards"
        scoped
        portalTarget={overlay}
      >
        <div className={styles.introBody}>
          <p>
            Every card here runs on the same tokens the tool bar controls.
            Move a duration or swap an easing curve and the buttons, toggles,
            and modals inside them answer on the new value.
          </p>
          <p>
            Open any card to watch one principle up close. The tool bar stays
            live the whole time.
          </p>
        </div>
      </Modal>

      {/* Deep-link modal. Same overlay portal and gating as the intro, but bare
          (no Modal header) because the body carries the principle's own title and
          × close. Keyed by id so switching principles remounts the body clean. */}
      <Modal
        isOpen={deepLinkOpen}
        onClose={onCloseDeepLink}
        title={deepLinkPrinciple?.title ?? ''}
        scoped
        portalTarget={overlay}
        hideHeader
        bare
      >
        {deepLinkPrinciple && (
          <DeepLinkBody
            key={deepLinkPrinciple.id}
            principle={deepLinkPrinciple}
            tokens={tokens}
            prefersReducedMotion={prefersReduced}
            onClose={onCloseDeepLink}
          />
        )}
      </Modal>

      <div className={styles.grid} ref={gridRef}>
        {visiblePrinciples.map((principle, index) => (
          <PrincipleCard
            key={principle.id}
            principle={principle}
            isExpanded={selectedId === principle.id}
            onSelect={() => setSelectedId(principle.id)}
            onClose={() => setSelectedId(null)}
            tokens={tokens}
            index={index}
            columnCount={columnCount}
            cellWidth={cellWidth}
            totalCards={totalCards}
            selectedId={selectedId}
            iconsPaused={iconsPaused}
          />
        ))}
      </div>
    </div>
  )
}
