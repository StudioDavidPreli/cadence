import { useMemo } from 'react'
import { auditTokens } from '../../tokens/tokenAudit'
import styles from './TokenAuditReport.module.css'

// ─── TokenAuditReport ─────────────────────────────────────────────────────────
// The body of the audit modal. Presentational: it takes a token set and renders
// what auditTokens says about it. The file mechanics (building the markdown,
// triggering the download, writing the clipboard) stay in TokenLab, which already
// owns downloadTextFile for the four export formats, so this component never
// learns about Blobs. Same division ImportReport uses.
//
// What is deliberately NOT here: the table of audited values. The markdown export
// prints every token it judged, because that document leaves the tool and has to
// stand on its own for whoever reads it next. On screen the values are twenty
// centimetres away on the sliders, so repeating them would pad the dialog with
// the one thing the user can already see.
//
// ── Severity without hue ──────────────────────────────────────────────────────
// Findings and notes are separated by section, by a marker, and by weight, never
// by color. Two rules push that way and they agree. Error surfaces in this
// project carry no accent (docs/decisions/error-surfaces-2026-07-18.md), and
// --color-accent means active, connected, currently affecting the system, which
// a finding is not. That leaves every row on --color-text-base, which also keeps
// the whole panel over the 4.5:1 bar in all four themes without a new token.
//
// A measurement whose reference is exceeded is stated in words rather than
// colored, for the same reason: the audit reports where the set landed, and
// coloring it would be the tool editorializing about a legitimate choice.
export function TokenAuditReport({ state, onDownload, onCopy, copied = false }) {
  // Recomputed only when the token set changes. The audit is cheap, but the modal
  // re-renders on every parent render while open, and the result feeds three
  // separate lists below.
  const { findings, measurements, counts } = useMemo(() => auditTokens(state), [state])

  const problems = findings.filter(f => f.severity === 'finding')
  const notes = findings.filter(f => f.severity === 'note')

  return (
    <div className={styles.report}>
      <p className={styles.summary}>
        {counts.finding === 0
          ? 'Nothing in this set contradicts itself.'
          : `${counts.finding} ${counts.finding === 1 ? 'finding' : 'findings'}, ${counts.note} ${counts.note === 1 ? 'note' : 'notes'}.`}
      </p>

      {problems.length > 0 && (
        <AuditSection title="Findings">
          {problems.map(f => <AuditRow key={f.id} entry={f} />)}
        </AuditSection>
      )}

      {notes.length > 0 && (
        <AuditSection title="Notes">
          {notes.map(f => <AuditRow key={f.id} entry={f} note />)}
        </AuditSection>
      )}

      {measurements.length > 0 && (
        <AuditSection title="Measurements" listClassName={styles.measureList}>
          {measurements.map(m => (
            <li key={m.id} className={styles.measureRow}>
              <div className={styles.measureHead}>
                <span className={styles.measureLabel}>{m.label}</span>
                <span className={styles.measureValue}>{m.display}</span>
              </div>
              {m.reference && (
                <span className={styles.measureReference}>
                  vs {m.reference.display} {m.reference.label}
                  {m.reference.exceeded && ', exceeded'}
                </span>
              )}
            </li>
          ))}
        </AuditSection>
      )}

      {/* Mirrors the Export section's pair: the primary action fills the row, the
          clipboard action sits compact at its right. */}
      <div className={styles.actions}>
        <button type="button" className={styles.downloadButton} onClick={onDownload}>
          Download report
        </button>
        <button type="button" className={styles.copyButton} onClick={onCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

// listClassName swaps the list's layout: findings and notes stack (the default
// flex column), measurements use a three-column grid so their labels, values, and
// references align across rows.
function AuditSection({ title, children, listClassName }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <ul className={listClassName ?? styles.list}>{children}</ul>
    </div>
  )
}

// The marker is decorative: the section heading above already names the severity,
// so it is hidden from assistive tech rather than announced twice per row.
function AuditRow({ entry, note = false }) {
  return (
    <li className={styles.row}>
      <span className={note ? styles.markerNote : styles.marker} aria-hidden="true" />
      <div className={styles.rowBody}>
        <div className={styles.message}>{entry.message}</div>
        <code className={styles.paths}>{entry.paths.join('  ')}</code>
      </div>
    </li>
  )
}
