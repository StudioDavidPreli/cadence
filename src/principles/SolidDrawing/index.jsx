import { useMemo } from 'react'
import { Card } from '../../components/Card'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import styles from './SolidDrawing.module.css'

// P11 Solid Drawing. The Card owns the principle: on select it lifts (scale +
// elevation) so it reads as a solid object with weight and depth rather than a
// flat rectangle. The lift respects the component's three-dimensional form.
//
// ── Why a demo-scoped scale.lift ──────────────────────────────────────────────
// The whole demonstration is the lift, so the start→finish difference has to be
// large enough to read as weighty. The production scale.lift is 1.02 (a 2 % grow)
// — correct on a real card, invisible here. This demo scopes it up so the card
// visibly grows on click. The smaller resting card (see the stylesheet) starts
// small and leaves room to grow into, which widens the perceived delta further.
// Same pattern as Systematization's scoped lift; this one is larger because the
// lift is the entire point, not one of several signals.
const DEMO_LIFT = 1.35

export function SolidDrawing() {
  const baseTokens = useMotionTokens()
  const tokens = useMemo(() => ({
    ...baseTokens,
    scale: { ...baseTokens.scale, lift: DEMO_LIFT },
  }), [baseTokens])

  return (
    <MotionTokensProvider tokens={tokens}>
      <div className={styles.cardDemo}>
        {/* Uniform scale-down on a wrapper, not on the Card: this shrinks the
            whole card proportionally so the original aspect is preserved exactly
            (reshaping the Card itself made it wide-and-short). The Card's own
            scale.lift animates inside the wrapper, so the two transforms compose:
            resting ≈ 0.65×, lifted ≈ 0.65 × 1.35 ≈ 0.88× of natural, both inside
            the frame with room to spare. The small start widens the felt delta. */}
        <div className={styles.cardScale}>
          <Card
            className={styles.cardDemoCard}
            title="Solid drawing"
            description="Click to lift."
            tag="Demo"
          />
        </div>
      </div>
    </MotionTokensProvider>
  )
}
