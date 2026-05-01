import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { PrincipleCard } from '../PrincipleCard'
import styles from './PrinciplesLibrary.module.css'

// ─── Principles data ──────────────────────────────────────────────────────────
const PRINCIPLES = [
  {
    id: 1, title: 'Squash & Stretch', category: 'classic',
    summary: 'Objects compress on impact and stretch on release, implying weight and flexibility.',
    componentSummary: 'The button compresses on press, returns on release. Squash and stretch as interaction feedback — the press has weight.',
    animationQuote: 'Squash and stretch is by far the most important discovery.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The press compresses. The release returns. A button with no give reads as image, not interface.',
    componentQuoteAttribution: null,
    tokens: 'scale.base · duration.fast · ease.spring',
  },
  {
    id: 2, title: 'Anticipation', category: 'classic',
    summary: 'A small movement opposite to the main action prepares the viewer for what is coming.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'A dancer jumping off the floor has to bend the knees first; a golfer making a swing has to swing the club back first.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Interfaces that skip the windup feel abrupt. A small reverse motion prepares the eye for arrival.',
    componentQuoteAttribution: null,
    tokens: 'duration.base · ease.spring',
  },
  {
    id: 3, title: 'Staging', category: 'classic',
    summary: 'Direct attention to what matters. Clear the stage before the performance.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'The presentation of any idea so that it is completely and unmistakably clear.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The backdrop is not decoration. It is the stage management that tells the user where to look.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.enter',
  },
  {
    id: 4, title: 'Straight Ahead & Pose to Pose', category: 'classic',
    summary: 'Two approaches to animation: frame by frame versus key poses with fills between.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Straight ahead produces surprise. Pose to pose produces structure. Neither alone is enough.',
    animationQuoteAttribution: null,
    componentQuote: 'Steppers define the poses. The fill animation is the frames between. Both are the same argument.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · delay.short · delay.medium',
  },
  {
    id: 5, title: 'Follow Through', category: 'classic',
    summary: 'Not everything stops at the same time. Secondary elements continue past the primary action.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'When an object stops, all parts of it do not stop at the same time.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The slide arrives. The indicator follows. Secondary motion is how the interface says: that was real.',
    componentQuoteAttribution: null,
    tokens: 'duration.base · ease.spring',
  },
  {
    id: 6, title: 'Slow In & Slow Out', category: 'classic',
    summary: 'Objects accelerate from rest and decelerate to rest. Nothing starts or stops instantly.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'More drawings near the beginning and end of an action, fewer in the middle.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Linear motion belongs to machines. Easing curves are how software admits it has mass.',
    componentQuoteAttribution: null,
    tokens: 'ease.standard · duration.slow',
  },
  {
    id: 7, title: 'Arc', category: 'classic',
    summary: 'Natural movement follows curved paths, not straight lines.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Most natural action tends to follow an arched trajectory.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'A tooltip that rises straight up arrives as a notification. One that arcs arrives as an answer.',
    componentQuoteAttribution: null,
    tokens: 'duration.fast · ease.enter',
  },
  {
    id: 8, title: 'Secondary Action', category: 'classic',
    summary: 'A supporting action that reinforces the main action without competing with it.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Supporting gestures enrich the main action. They do not compete with it.',
    animationQuoteAttribution: null,
    componentQuote: 'The chevron rotates as the menu opens. The chevron is not the story. It confirms the story.',
    componentQuoteAttribution: null,
    tokens: 'duration.fast · ease.standard',
  },
  {
    id: 9, title: 'Timing', category: 'classic',
    summary: 'Duration determines weight and personality. More time means heavier, slower, more considered.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'A variety of slow and fast timing within a scene adds texture and interest to the movement.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Have a known purpose for every animation in your interface.',
    componentQuoteAttribution: 'Val Head, Designing Interface Animation',
    tokens: 'duration.fast · duration.base · duration.slow',
  },
  {
    id: 10, title: 'Exaggeration', category: 'classic',
    summary: 'Amplify an action beyond reality to clarify or heighten its emotional truth.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Exaggeration is not extreme distortion, but a caricature of facial features, expressions, poses, attitudes and actions.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: "The notification doesn't just appear. It overshoots, and that overshoot is the alert.",
    componentQuoteAttribution: null,
    tokens: 'scale.expressive · ease.spring · duration.fast',
  },
  {
    id: 11, title: 'Solid Drawing', category: 'classic',
    summary: 'Understand three-dimensional form, weight, and balance even in 2D.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Form, weight, volume solidity and the illusion of 3D apply to animation as it does to academic drawing.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'A flat element scales up. Shadow increases. Something that was on the page is now above it.',
    componentQuoteAttribution: null,
    tokens: 'scale.lift · duration.base · ease.standard',
  },
  {
    id: 12, title: 'Appeal', category: 'classic',
    summary: 'The quality that makes an audience want to watch. Charm, clarity, magnetism.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Where the live action actor has charisma, the animated character has appeal.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Appeal is what happens when every other principle is already working. It cannot be added later.',
    componentQuoteAttribution: null,
    tokens: 'All tokens in concert.',
  },
  {
    id: 13, title: 'Systematization', category: 'extended',
    summary: 'Parts integrate into a coherent whole. The system is legible because its parts follow rules.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'A face is recognizable because every part knows what every other part is doing.',
    animationQuoteAttribution: null,
    componentQuote: 'Motion needs to live in the design system as a first-class citizen. Added at the end, it stays at the edges.',
    componentQuoteAttribution: null,
    tokens: 'The whole token set.',
  },
  {
    id: 14, title: 'Hierarchy of Motion', category: 'extended',
    summary: 'One element drives another. Authority flows from parent to child.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'The conductor moves. The orchestra follows. Reverse the hierarchy and the music breaks down.',
    animationQuoteAttribution: null,
    componentQuote: 'Parent elements carry authority. Children respond. When the hierarchy is wrong, the interface feels disobedient.',
    componentQuoteAttribution: null,
    tokens: 'duration.base · ease.standard',
  },
  {
    id: 15, title: 'Economy', category: 'extended',
    summary: 'The minimum motion needed to communicate the intended meaning.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Three layers of parallax suggest an entire world. Thirty layers just suggest thirty layers.',
    animationQuoteAttribution: null,
    componentQuote: 'Motion earns its place by what it communicates. Motion added to empty time communicates nothing.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.standard',
  },
  {
    id: 16, title: 'Token Fidelity', category: 'extended',
    summary: 'Animation values defined in a system should be used as intended. Deviation produces visible wrongness.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'A character drawn with two left hands. The error is not in the drawing. It is in the reference.',
    animationQuoteAttribution: null,
    componentQuote: 'Hardcoded values drift. Token values hold. The system is only as reliable as its sources of truth.',
    componentQuoteAttribution: null,
    tokens: 'The referenced token.',
  },
  {
    id: 17, title: 'Reduced Motion', category: 'extended',
    summary: 'The system must meet the user where they are. Accessibility is a design constraint that improves the whole system.',
    componentSummary: 'Component summary coming in Phase 2',
    animationQuote: 'Two actors. One gestures wildly. The other stands still. Neither is wrong. They are just not yet meeting.',
    animationQuoteAttribution: null,
    componentQuote: "We don't need to eliminate animation. We need to apply it more thoughtfully.",
    componentQuoteAttribution: 'Val Head, A List Apart',
    tokens: 'All tokens, conditional.',
  },
  {
    id: 18, title: 'Shared Vocabulary', category: 'extended',
    summary: 'Motion values that cannot be named cannot be systematized. Named presets are the minimum unit of design-engineering communication.',
    componentSummary: 'Component summary coming in Phase 2',
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

export function PrinciplesLibrary() {
  const tokens = useMotionTokens()
  const [selectedId, setSelectedId] = useState(null)
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

  const totalCards = PRINCIPLES.length

  return (
    <div className={styles.library}>
      <div className={styles.grid} ref={gridRef}>
        {PRINCIPLES.map((principle, index) => (
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
          />
        ))}
      </div>
    </div>
  )
}
