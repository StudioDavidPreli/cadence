import { useMemo, useState, useEffect } from 'react'
// Registers Prism's json grammar globally on import. CodeBlock's highlight
// module registers jsx for the app; css is in Prism's core. The preview needs
// json for DTCG, flat and the Flow library, and this is the one production
// surface that shows JSON, so the registration lives here rather than in the
// app-wide highlighter (the capture rig registers it too, and Prism treats a
// second registration as a no-op). prism-css-extras stays out on purpose: it
// rewrites the shared css grammar, and the rig's notes explain why that is
// unwanted in the app bundle.
import 'prismjs/components/prism-json'
import { Modal } from '../Modal'
import { tokenizeLines, renderRuns } from '../CodeBlock/highlight'
import { EXPORT_FORMATS, exportFormat, exportFile } from '../TokenLab/exportFormats'
import { downloadTextFile } from '../../utils/downloadTextFile'
import { trackEvent } from '../../utils/trackEvent'
import styles from './ExportModal.module.css'

// ─── ExportModal ──────────────────────────────────────────────────────────────
//
// The export dialog (2026-09-15, the tracker's "export modal" item). Before it,
// export was a four-segment toggle and two buttons in the tool bar's Export
// section. Six formats do not fit a 300px column (the fourth already clipped
// once, the FM restack of 2026-07-21), and a format chosen from an abbreviation
// with no sight of the file is a guess. So the tool bar keeps one button, and
// the choice happens here, where there is room to name each format, say who
// reads it, and show the file before it is written.
//
// Two columns: the format list on the left, a highlighted preview of the
// selected file on the right. The preview is the real output of the real
// stringifier for the live state, not a sample: what the user sees is what the
// download writes, byte for byte. Beneath, one line names what the file is of
// (the active preset, or "Custom" for an edited set) and whether the
// off-system appendix rides it, then Export and Copy.
//
// Viewport-anchored, like the import and audit reports: the tool bar is outside
// the demo column, so the demo-column overlay is the wrong frame. `chrome`, for
// the reports' reason: this dialog is the tool handing over a token set, so it
// must not be timed by that set. `wide`, for the preview column.
//
// The selected format persists across opens for the session (this component
// stays mounted; only the Modal's tree comes and goes), so a reader who exports
// CSS, edits, and exports again does not re-pick.

// How long "Copied" stands before the button reads "Copy" again. Tool chrome,
// like CodeBlock's flash hold, so a fixed number rather than a motion token.
const COPIED_HOLD_MS = 1500

// The format list. Its own component so the capture rig can render the same
// list the modal does (the rig's export scene steps through the formats with
// the file beneath). Buttons with aria-pressed inside a labelled group, the
// same contract the tool bar's segmented toggle carried.
export function ExportFormatPicker({ value, onChange, formats = EXPORT_FORMATS }) {
  return (
    <div className={styles.picker} role="group" aria-label="Export format">
      {formats.map(f => (
        <button
          key={f.key}
          type="button"
          className={`${styles.option} ${value === f.key ? styles.optionActive : ''}`}
          onClick={() => onChange(f.key)}
          aria-pressed={value === f.key}
        >
          <span className={styles.optionLabel}>
            {f.label}
            {/* A quiet tag on the two files Token Lab can read back, because
                "which of these can I import later" is the question the old
                toggle never answered. */}
            {f.reimports && <span className={styles.optionTag}>reads back</span>}
          </span>
          <span className={styles.optionDescription}>{f.description}</span>
        </button>
      ))}
    </div>
  )
}

export function ExportModal({ isOpen, onClose, rawState, deviations = [], presetLabel = null }) {
  const [key, setKey] = useState('dtcg')
  const [copied, setCopied] = useState(false)
  const format = exportFormat(key)

  // The file for the selected format and the live state. Only built while the
  // dialog is open: six stringifiers on every slider drag would be wasted work
  // for a dialog nobody is looking at.
  const file = useMemo(
    () => (isOpen ? exportFile(key, rawState, { deviations, presetLabel }) : null),
    [isOpen, key, rawState, deviations, presetLabel],
  )
  // Tokenizing is the expensive step, so it is memoized on the text, not run
  // per render. The preview re-highlights only when the file changes.
  const lines = useMemo(
    () => (file ? tokenizeLines(file.text, format.language) : []),
    [file, format.language],
  )

  // "Copied" must not outlive the dialog: closing and reopening within the hold
  // would show a stale confirmation for a click that happened in another open.
  useEffect(() => {
    if (!isOpen) setCopied(false)
  }, [isOpen])

  function handleExport() {
    if (!file) return
    downloadTextFile(file.filename, file.text, file.mime)
    // Count the export (fire-and-forget; see trackEvent). Downloads and copies
    // both count as "a spec left the building", per the capture doc.
    trackEvent({ type: 'export', format: file.wire })
  }

  async function handleCopy() {
    if (!file) return
    try {
      await navigator.clipboard.writeText(file.text)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_HOLD_MS)
      // After the await: a failed copy put nothing on the clipboard, so it must
      // not count as an export either.
      trackEvent({ type: 'export', format: file.wire })
    } catch {
      // The clipboard API is unavailable in insecure contexts; the download is
      // the reliable path, so a failed copy is a silent no-op.
    }
  }

  // The line beneath the preview: what the file is of, and whether the
  // off-system appendix rides it. Written per format from the table rather
  // than assumed, because a reader who took Button off the system and exports
  // the Flow library should be told the deviation is not in that file.
  const subject = presetLabel ? `${presetLabel} preset` : 'Custom values'
  const deviationNote = deviations.length === 0
    ? null
    : format.carriesDeviations
      ? `${deviations.length} off-system ${deviations.length === 1 ? 'deviation rides' : 'deviations ride'} this file as an appendix`
      : `Off-system deviations do not ride this format`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export tokens" wide chrome>
      <div className={styles.layout}>
        <ExportFormatPicker value={key} onChange={setKey} />

        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <span className={styles.filename}>{file?.filename ?? format.filename}</span>
            <span className={styles.lineCount}>{lines.length} lines</span>
          </div>
          {/* A focusable region so keyboard users can scroll a long file; the
              label names it for a screen reader instead of reading 200 lines
              of JSON as one run. */}
          <pre
            className={styles.pre}
            tabIndex={0}
            role="region"
            aria-label={`Preview of ${format.filename}`}
          >
            {lines.map((runs, i) => (
              <span key={i} className={styles.line}>{renderRuns(runs)}{'\n'}</span>
            ))}
          </pre>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.subjectLine}>
          <span className={styles.subject}>{subject}</span>
          {deviationNote && <span className={styles.deviationNote}>{deviationNote}</span>}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.exportButton} onClick={handleExport}>
            Export {format.label}
          </button>
          <button type="button" className={styles.copyButton} onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
