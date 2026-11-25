import { BasisTitle } from './BasisTitle'
import { PracticePage } from './PracticePage'
import { BASIS } from './inPracticeModel'
import styles from './InPractice.module.css'

export { ClndrPractice } from './ClndrPractice'

// ─── In Practice › Basis ─────────────────────────────────────────────────────
//
// Basis running Cadence's presets, framed. The page follows Measure and
// rivLint: a Rive title, a guidance box (what Basis is, then the workflow), and
// in place of a tool, the product in use. Decision record:
// docs/decisions/in-practice-2026-10-14.md. The page itself, frame and all, is
// PracticePage; this is Basis's words.
//
// `preset` comes from TokenLab, already resolved: the tool bar's active
// built-in, or the last one it had while the bar reads Custom (framePreset).
export function BasisPractice({ preset }) {
  return (
    <PracticePage
      product={BASIS}
      preset={preset}
      name="Basis"
      title={<BasisTitle />}
      guideLabel="About Basis and how to compare presets"
      frameTitle={`Basis chart and ledger, ${preset} preset`}
      frameTestId="basis-frame"
    >
      {/* What Basis is, then the workflow in Measure's guidance form: three
          bold imperatives, each with its reason. The presets live in the
          tool bar, so the page tells the visitor where to find them rather
          than repeat them. */}
      <p className={styles.guideRow}>
        Basis is a ledger of simulated companies, each figure fed by a live
        public source and carrying the request that produced it. Every
        duration, curve, delay and spring in it comes from cadence-tokens.
        Link to the <a className={styles.link} href={BASIS.linkOut} target="_blank" rel="noopener noreferrer">full sheet</a>.
      </p>
      <p className={styles.guideRow}>
        <strong>Load a preset.</strong> Standard, Snappy and Cinematic sit
        in the Presets row at the top of the tool bar. The frame reloads
        with whichever one is loaded.
      </p>
      <p className={styles.guideRow}>
        <strong>Sort a column.</strong> Click a header, or tab to it and
        press Enter. Rows travel to their new places in a short stagger,
        and the rising ones lift as they pass. The charted companies stay
        selected; hover one and its line lights with it.
      </p>
      <p className={styles.guideRow}>
        <strong>Switch and sort again.</strong> Same table, same move,
        different timing. An edited slider reads as Custom, which Basis
        cannot run; the frame keeps the last preset it had.
      </p>
    </PracticePage>
  )
}
