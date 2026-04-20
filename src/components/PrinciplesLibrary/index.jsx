import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { PrincipleCard } from '../PrincipleCard'
import styles from './PrinciplesLibrary.module.css'

// ─── Principles data ──────────────────────────────────────────────────────────
const PRINCIPLES = [
  { id: 1,  title: 'Squash & Stretch',             category: 'classic',
    summary: 'Objects compress on impact and stretch on release, implying weight and flexibility.' },
  { id: 2,  title: 'Anticipation',                  category: 'classic',
    summary: 'A small movement opposite to the main action prepares the viewer for what is coming.' },
  { id: 3,  title: 'Staging',                       category: 'classic',
    summary: 'Direct attention to what matters. Clear the stage before the performance.' },
  { id: 4,  title: 'Straight Ahead & Pose to Pose', category: 'classic',
    summary: 'Two approaches to animation: frame by frame versus key poses with fills between.' },
  { id: 5,  title: 'Follow Through',                category: 'classic',
    summary: 'Not everything stops at the same time. Secondary elements continue past the primary action.' },
  { id: 6,  title: 'Slow In & Slow Out',            category: 'classic',
    summary: 'Objects accelerate from rest and decelerate to rest. Nothing starts or stops instantly.' },
  { id: 7,  title: 'Arc',                           category: 'classic',
    summary: 'Natural movement follows curved paths, not straight lines.' },
  { id: 8,  title: 'Secondary Action',              category: 'classic',
    summary: 'A supporting action that reinforces the main action without competing with it.' },
  { id: 9,  title: 'Timing',                        category: 'classic',
    summary: 'Duration determines weight and personality. More time means heavier, slower, more considered.' },
  { id: 10, title: 'Exaggeration',                  category: 'classic',
    summary: 'Amplify an action beyond reality to clarify or heighten its emotional truth.' },
  { id: 11, title: 'Solid Drawing',                 category: 'classic',
    summary: 'Understand three-dimensional form, weight, and balance even in 2D.' },
  { id: 12, title: 'Appeal',                        category: 'classic',
    summary: 'The quality that makes an audience want to watch. Charm, clarity, magnetism.' },
  { id: 13, title: 'Systematization',               category: 'extended',
    summary: 'Parts integrate into a coherent whole. The system is legible because its parts follow rules.' },
  { id: 14, title: 'Hierarchy of Motion',           category: 'extended',
    summary: 'One element drives another. Authority flows from parent to child.' },
  { id: 15, title: 'Economy',                       category: 'extended',
    summary: 'The minimum motion needed to communicate the intended meaning.' },
  { id: 16, title: 'Token Fidelity',                category: 'extended',
    summary: 'Animation values defined in a system should be used as intended. Deviation produces visible wrongness.' },
  { id: 17, title: 'Reduced Motion',                category: 'extended',
    summary: 'The system must meet the user where they are. Accessibility is a design constraint that improves the whole system.' },
  { id: 18, title: 'Shared Vocabulary',             category: 'extended',
    summary: 'Motion values that cannot be named cannot be systematized. Named presets are the minimum unit of design-engineering communication.' },
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
  const gridRef = useRef(null)

  // Read the actual column count from the grid's computed style. This runs
  // whenever the grid element resizes — panel resize, window resize, or any
  // layout shift that changes the number of auto-fit columns.
  useLayoutEffect(() => {
    if (!gridRef.current) return

    const measure = () => {
      const computed = window.getComputedStyle(gridRef.current)
      const columns = computed.gridTemplateColumns.split(' ').length
      setColumnCount(columns)
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
            totalCards={totalCards}
            selectedId={selectedId}
          />
        ))}
      </div>
    </div>
  )
}
