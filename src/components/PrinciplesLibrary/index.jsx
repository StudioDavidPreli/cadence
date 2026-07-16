import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { PrincipleCard } from '../PrincipleCard'
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

// ─── Principles data ──────────────────────────────────────────────────────────
const PRINCIPLES = [
  {
    id: 1, title: 'Squash & Stretch', category: 'classic',
    summary: 'Objects compress on impact and stretch on release, implying weight and flexibility.',
    componentSummary: 'Press compresses. Release returns. The button has weight.',
    animationQuote: 'Squash and stretch is by far the most important discovery.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The press compresses. The release returns. A button with no give reads as image, not interface.',
    componentQuoteAttribution: null,
    tokens: 'scale.base · duration.fast · ease.standard · ease.overshoot',
  },
  {
    id: 2, title: 'Anticipation', category: 'classic',
    summary: 'Countermotion is what makes an action read as caused, not arbitrary.',
    componentSummary: 'The drawer lifts before it leaves. The exit announces itself.',
    animationQuote: 'A dancer jumping off the floor has to bend the knees first; a golfer making a swing has to swing the club back first.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Interfaces that skip the windup feel abrupt. A small reverse motion prepares the eye for the move.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.enter · ease.exit',
  },
  {
    id: 3, title: 'Staging', category: 'classic',
    summary: 'Direct attention to what matters. Clear the stage before the performance.',
    componentSummary: 'The modal opens. The backdrop dims. The page narrows to one thing.',
    animationQuote: 'The presentation of any idea so that it is completely and unmistakably clear.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The backdrop is not decoration. It is the stage management that tells the user where to look.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.enter',
  },
  {
    id: 4, title: 'Straight Ahead & Pose to Pose', gridTitle: 'Pose to Pose', category: 'classic',
    summary: 'Two approaches to animation: frame by frame versus key poses with fills between.',
    componentSummary: 'Steps mark the poses. The bar fills between. Both are the same idea.',
    animationQuote: 'Straight ahead produces surprise. Pose to pose produces structure. Neither alone is enough.',
    animationQuoteAttribution: null,
    componentQuote: 'Steppers define the poses. The fill animation is the frames between. Both are the same argument.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · delay.short · delay.medium',
  },
  {
    id: 5, title: 'Follow Through', category: 'classic',
    summary: 'Not everything stops at the same time. Secondary elements continue past the primary action.',
    componentSummary: 'Slide snaps. Dot catches up. The lag is how the system admits to mass.',
    animationQuote: 'When an object stops, all parts of it do not stop at the same time.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The slide arrives. The indicator follows. Secondary motion is how the interface says: that was real.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.overshoot',
  },
  {
    id: 6, title: 'Slow In & Slow Out', category: 'classic',
    summary: 'Objects accelerate from rest and decelerate to rest. Nothing starts or stops instantly.',
    componentSummary: 'The bar fills, then settles at the end. Tokens is adjusted with the tool bar.',
    animationQuote: 'More drawings near the beginning and end of an action, fewer in the middle.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Linear motion belongs to machines. Easing curves are how software admits it has mass.',
    componentQuoteAttribution: null,
    tokens: 'ease.standard · ease.linear · duration.slow',
  },
  {
    id: 7, title: 'Arc', category: 'classic',
    summary: 'Natural movement follows curved paths, not straight lines.',
    componentSummary: 'The tooltip leaves the trigger and arcs into place. Not a straight line.',
    animationQuote: 'Most natural action tends to follow an arched trajectory.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'A tooltip that rises straight up arrives as a notification. One that arcs arrives as an answer.',
    componentQuoteAttribution: null,
    tokens: 'duration.base · ease.enter',
  },
  {
    id: 8, title: 'Secondary Action', category: 'classic',
    summary: 'A supporting action that reinforces the main action without competing with it.',
    componentSummary: 'The menu opens. The chevron rotates with it. The rotation confirms.',
    animationQuote: 'Supporting gestures enrich the main action. They do not compete with it.',
    animationQuoteAttribution: null,
    componentQuote: 'The chevron rotates as the menu opens. The chevron is not the story. It confirms the story.',
    componentQuoteAttribution: null,
    tokens: 'duration.fast · ease.standard',
  },
  {
    id: 9, title: 'Timing', category: 'classic',
    summary: 'Duration determines weight and personality. More time means heavier, slower, more considered.',
    componentSummary: 'The character of the component changes when varying the easing duration.',
    animationQuote: 'A variety of slow and fast timing within a scene adds texture and interest to the movement.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Have a known purpose for every animation in your interface.',
    componentQuoteAttribution: 'Val Head, Designing Interface Animation',
    tokens: 'duration.fast · duration.base · duration.slow',
  },
  {
    id: 10, title: 'Exaggeration', category: 'classic',
    summary: 'Amplify an action beyond reality to clarify or heighten its emotional truth.',
    componentSummary: 'The badge count climbs. The number overshoots before it lands.',
    animationQuote: 'Exaggeration is not extreme distortion, but a caricature of facial features, expressions, poses, attitudes and actions.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: "The notification doesn't just appear. It overshoots, and that overshoot is the alert.",
    componentQuoteAttribution: null,
    tokens: 'scale.expressive · ease.overshoot · duration.slow',
  },
  {
    id: 11, title: 'Solid Drawing', category: 'classic',
    summary: 'Understand three-dimensional form, weight, and balance even in 2D.',
    componentSummary: 'The card lifts. Shadow grows. What was flat is now above the page.',
    animationQuote: 'Form, weight, volume solidity and the illusion of 3D apply to animation as it does to academic drawing.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'A flat element scales up. Shadow increases. Something that was on the page is now above it.',
    componentQuoteAttribution: null,
    tokens: 'scale.lift · duration.base · ease.standard',
  },
  {
    id: 12, title: 'Appeal', category: 'classic',
    summary: 'The quality that makes an audience want to watch. Charm, clarity, magnetism.',
    componentSummary: 'Shapes drift, settle, drift again. Tuned easing. The grid holds the eye.',
    animationQuote: 'Where the live action actor has charisma, the animated character has appeal.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Appeal is what happens when every other principle is already working. It cannot be added later.',
    componentQuoteAttribution: null,
    tokens: 'All tokens in concert.',
  },
  {
    id: 13, title: 'Systematization', category: 'extended',
    summary: 'Parts integrate into a coherent whole. The system is legible because its parts follow rules.',
    componentSummary: 'One slider moves. Every component responds. The system has one voice.',
    animationQuote: 'A face is recognizable because every part knows what every other part is doing.',
    animationQuoteAttribution: null,
    componentQuote: 'Motion needs to live in the design system as a first-class citizen. Added at the end, it stays at the edges.',
    componentQuoteAttribution: null,
    tokens: 'The whole token set.',
  },
  {
    id: 14, title: 'Hierarchy of Motion', category: 'extended',
    summary: 'One element drives another. Authority flows from parent to child.',
    componentSummary: 'The parent moves. The children follow. Authority flows downward.',
    animationQuote: 'The conductor moves. The orchestra follows. Reverse the hierarchy and the music breaks down.',
    animationQuoteAttribution: null,
    componentQuote: 'Parent elements carry authority. Children respond. When the hierarchy is wrong, the interface feels disobedient.',
    componentQuoteAttribution: null,
    tokens: 'duration.base · ease.standard',
  },
  {
    id: 15, title: 'Economy', category: 'extended',
    summary: 'The minimum motion needed to communicate the intended meaning.',
    componentSummary: 'Three layers, three speeds. Depth from the smallest set of moves.',
    animationQuote: 'Three layers of parallax suggest an entire world. Thirty layers just suggest thirty layers.',
    animationQuoteAttribution: null,
    componentQuote: 'Motion earns its place by what it communicates. Motion added to empty time communicates nothing.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.standard',
  },
  {
    id: 16, title: 'Token Fidelity', category: 'extended',
    summary: 'Deviation reads as incongruous. The motion is showing you a system problem.',
    componentSummary: 'Wrong token. The motion reads off. Corrected through the system.',
    animationQuote: 'A character drawn with two left hands. The error is not in the drawing. It is in the reference.',
    animationQuoteAttribution: null,
    componentQuote: 'Hardcoded values drift. Token values hold. The system is only as reliable as its sources of truth.',
    componentQuoteAttribution: null,
    tokens: 'The referenced token.',
  },
  {
    id: 17, title: 'Reduced Motion', category: 'extended',
    summary: 'The system must meet the user where they are. Accessibility is a design constraint that improves the whole system.',
    componentSummary: 'Toggle flips. Motions soften and fall to rest. The system meets the user.',
    animationQuote: 'Two actors. One gestures wildly. The other stands still. Neither is wrong. They are just not yet meeting.',
    animationQuoteAttribution: null,
    componentQuote: "We don't need to eliminate animation. We need to apply it more thoughtfully.",
    componentQuoteAttribution: 'Val Head, A List Apart',
    tokens: 'All tokens, conditional.',
  },
  {
    id: 18, title: 'Shared Vocabulary', category: 'extended',
    summary: 'Motion values that cannot be named cannot be systematized. Named presets are the minimum unit of design-engineering communication.',
    componentSummary: 'The preset is Snappy. The numbers are the same. The name is the unit.',
    animationQuote: 'A hanzi spoken. A tree grown. The word and the thing were the same thing all along.',
    animationQuoteAttribution: null,
    componentQuote: 'A preset named "Snappy" is communicable. A preset named "300 60 120 200" is not.',
    componentQuoteAttribution: null,
    tokens: 'All named presets.',
  },
]

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
export function PrinciplesLibrary({ filter = 'all' }) {
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
  const [iconsPaused, setIconsPaused] = useState(false)

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
  useEffect(() => {
    if (overlay && !introAlreadySeen()) setIntroOpen(true)
  }, [overlay])

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
          onClick={() => setIconsPaused(prev => !prev)}
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
