import { ClndrTitle } from './ClndrTitle'
import { PracticePage } from './PracticePage'
import { CLNDR } from './inPracticeModel'
import styles from './InPractice.module.css'

// ─── In Practice › CLNDR ─────────────────────────────────────────────────────
//
// The studio's booking calendar running Cadence's presets, framed (2026-11-25).
// Contract: docs/embed.md in the booking-calendar repo. The frame takes real
// bookings, so nothing automated here presses anything inside it, and it may be
// framed only by cadence.davidpreli.com: on localhost the frame is refused.
// The first row is David's words; the rows are David's to change.
export function ClndrPractice({ preset }) {
  return (
    <PracticePage
      product={CLNDR}
      preset={preset}
      name="CLNDR"
      title={<ClndrTitle />}
      guideLabel="About CLNDR and how to compare presets"
      frameTitle={`CLNDR booking calendar, ${preset} preset`}
      frameTestId="clndr-frame"
      pageClassName={styles.clndrPage}
    >
      <p className={styles.guideRow}>
        CLNDR is a custom frontend for my studio practice running a cal.com api
        in html using three.js and rive. Link to the full
        page <a className={styles.link} href={CLNDR.linkOut} target="_blank" rel="noopener noreferrer">[here]</a>.
      </p>
      <p className={styles.guideRow}>
        <strong>Load a preset.</strong> Standard, Snappy and Cinematic sit
        in the Presets row at the top of the tool bar. The frame reloads
        with whichever one is loaded, and anything typed in the form is
        cleared.
      </p>
      <p className={styles.guideRow}>
        <strong>Change the month, then pick a day and a time.</strong> The
        arrows slide one month out and the next one in. Picking a time sends
        the month away and brings up the form. Book makes a real booking.
      </p>
      <p className={styles.guideRow}>
        <strong>Switch and do it again.</strong> Same calendar, same moves,
        different timing. An edited slider reads as Custom, which CLNDR
        cannot run; the frame keeps the last preset it had.
      </p>
    </PracticePage>
  )
}
