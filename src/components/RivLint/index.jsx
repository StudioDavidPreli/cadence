// rivLint: the public .riv linter (build-order item 9). The name is David's
// (2026-09-08): lowercase r held even at the start of a sentence, and the
// title art sets it as .rivLint. Drop a .riv and get what
// the web runtime can read from it: the facts a consumer needs first, the
// findings, an inventory, a preview, and a diff or a contract check against a
// second file or an earlier report. Nothing about the file leaves the page.
//
// This section replaces the right region like Measure does, owns its own
// scroll, and sits outside MotionTokensProvider: nothing here reads a
// --motion-* token. The only motion is chrome on --feedback-* timing, and
// the preview never autoplays under reduced motion.
//
// No house convention is checked. The rules are the runtime's contract and
// Rive's published guidance (lintModel.js); "check against" takes the user's
// own earlier report as the definition. The site's own conventions live only
// in the e2e manifest.
//
// Copy on this page is drafted against archive/voice/voice-analysis.md and
// awaits David's voice pass. Em-dash count: zero.

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { INITIAL_STATE, stateToTokens } from 'cadence-tokens'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { Spinner } from '../Spinner'
import { useLint, STATUS, COMPARE_MODE } from './useLint'
import { RUNTIME_VERSION } from './readRiv'
import { toManifestEntry } from './lintModel'
import { Preview } from './Preview'
import { RivLintTitle } from './RivLintTitle'
import styles from './RivLint.module.css'

const SAMPLES_URL = '/rivlint-samples/samples.json'
const STANDARD_TOKENS = stateToTokens(INITIAL_STATE)

const SEVERITY_LABEL = { fail: 'Fail', warn: 'Warn', note: 'Note' }

function downloadTextFile(filename, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const fmtBytes = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${(n / 1e3).toFixed(0)} kB` : `${n} B`)

export function RivLintSection() {
  const l = useLint()
  const [samples, setSamples] = useState([])
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let live = true
    fetch(SAMPLES_URL)
      .then(r => (r.ok ? r.json() : { samples: [] }))
      .then(doc => { if (live) setSamples(doc.samples ?? []) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const onFile = file => { if (file) l.lintFile(file) }
  const onDrop = event => {
    event.preventDefault()
    setDragging(false)
    onFile(event.dataTransfer?.files?.[0])
  }

  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="rivLint">
      <article className={styles.page}>
        <RivLintTitle />
        <p className={styles.lede}>
          Drop a .riv and read what a runtime will find in it: the artboard
          it draws by default, the state machines and inputs, the view models
          and their properties, and the assets it will need. Then the
          findings, and a comparison with an earlier export or an earlier
          report. The file is read inside this page by the same runtime the
          site runs on. It is never uploaded.
        </p>

        <label
          className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept=".riv"
            className={styles.fileInput}
            data-testid="file"
            onChange={e => onFile(e.target.files?.[0])}
          />
          <span className={styles.dropLabel}>Drop a .riv here, or choose a file</span>
          <span className={styles.dropHint}>read with Rive runtime {RUNTIME_VERSION}</span>
        </label>

        {samples.length > 0 && (
          <div className={styles.samples}>
            <span className={styles.samplesLabel}>Or try one of this site&apos;s own, checked against its earlier report:</span>
            {samples.map(sample => (
              <button
                key={sample.id}
                type="button"
                className={styles.sampleButton}
                onClick={() => l.lintSample(sample)}
                data-testid={`sample-${sample.id}`}
              >
                {sample.label}
              </button>
            ))}
          </div>
        )}

        <StatusLine l={l} />

        {l.inventory && <Report l={l} />}
      </article>
    </div>
  )
}

// One live line under the drop zone. Errors read in plain text-base, no
// accent (the error-surfaces rule, 2026-07-18). While the runtime reads, the
// line leads with the site's Spinner on a local Standard provider, the same
// arrangement Measure uses; under reduced motion the words stand alone.
function StatusLine({ l }) {
  const reduce = useReducedMotion()
  const { status, error, subject, inventory, findings } = l
  const working = status === STATUS.READING
  let text = ''
  if (working) text = 'Reading the file through the runtime.'
  else if (status === STATUS.ERROR) text = `That file could not be read. ${error ?? ''}`.trim()
  else if (status === STATUS.DONE && inventory) {
    const counts = ['fail', 'warn', 'note'].map(s => findings.filter(f => f.severity === s).length)
    const summary = counts.every(c => c === 0)
      ? 'No findings.'
      : `${counts[0]} ${counts[0] === 1 ? 'failure' : 'failures'}, ${counts[1]} ${counts[1] === 1 ? 'warning' : 'warnings'}, ${counts[2]} ${counts[2] === 1 ? 'note' : 'notes'}.`
    const unread = subject.raw.unreadArtboards?.length
      ? ` ${subject.raw.unreadArtboards.length} artboards past the first ${inventory.artboards.length - subject.raw.unreadArtboards.length} were not opened for their default view model.`
      : ''
    text = `${subject.name}, ${fmtBytes(subject.report.meta.size)}: ${inventory.artboards.length} ${inventory.artboards.length === 1 ? 'artboard' : 'artboards'}, ${inventory.viewModels.length} ${inventory.viewModels.length === 1 ? 'view model' : 'view models'}, ${inventory.assets.length} ${inventory.assets.length === 1 ? 'asset' : 'assets'}. ${summary}${unread}`
  }
  return (
    <p
      className={styles.status}
      data-testid="status"
      data-state={status}
      data-fails={findings.filter(f => f.severity === 'fail').length}
      aria-live="polite"
    >
      {working && (
        <span className={styles.working}>
          {!reduce && (
            <MotionTokensProvider tokens={STANDARD_TOKENS} respectReducedMotion={false}>
              <Spinner size="small" />
            </MotionTokensProvider>
          )}
          <span>Just a moment.</span>
        </span>
      )}
      {working && ' '}
      {text}
    </p>
  )
}

function Report({ l }) {
  const { subject, inventory, findings, facts } = l
  const download = () => {
    downloadTextFile(`${subject.name.replace(/\.riv$/i, '')}.report.json`, JSON.stringify(subject.report, null, 2) + '\n')
  }
  return (
    <div className={styles.results}>
      <Handoff facts={facts} inventory={inventory} />
      <Findings findings={findings} />
      <p className={styles.cannotSee} data-testid="cannot-see">
        Text runs, nesting, scripts, listeners, converters and shape bindings
        are not readable from a .riv through the web runtime, nor the bytes of
        referenced or hosted assets. A property-to-shape binding that broke
        while the view model survived is invisible here. Read with runtime {RUNTIME_VERSION}.
      </p>
      <Inventory inventory={inventory} />
      <Preview buffer={subject.buffer} inventory={inventory} />
      <Compare l={l} />
      <section className={styles.block} aria-label="Download">
        <button type="button" className={styles.download} onClick={download} data-testid="download">
          Download {subject.name.replace(/\.riv$/i, '')}.report.json
        </button>
        <p className={styles.small}>
          The report is this inventory with the file name, size, runtime and
          date on top. Drop it back here later, with a re-export, to check the
          new file against it. Projected onto its artboards and view models it
          is also a row for a contract test like this site&apos;s own.
        </p>
      </section>
    </div>
  )
}

const InputList = ({ inputs }) => (
  inputs === undefined
    ? <span className={styles.factNote}>inputs not read</span>
    : inputs.length === 0
      ? <span className={styles.factNote}>no inputs</span>
      : <span className={styles.chips}>{inputs.map(i => <code key={i.name} className={styles.chip}>{i.name}: {i.type}</code>)}</span>
)

// The facts a consumer needs before any rule (David's addition at the gate).
function Handoff({ facts, inventory }) {
  const a = facts.defaultArtboard
  return (
    <section className={styles.block} aria-label="For the consumer" data-testid="handoff" data-default-artboard={a?.name ?? ''}>
      <div className={styles.blockHead}>
        <span className={styles.blockTitle}>What a runtime gets</span>
        <span className={styles.blockMeta}>the names a consumer writes</span>
      </div>
      {a ? (
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Default artboard</dt>
            <dd className={styles.factValue}>
              <code className={styles.chip}>{a.name}</code>
              {a.assumed && <span className={styles.factNote}>assumed from list order; the file was not asked</span>}
              {inventory.artboards.length > 1 && !a.assumed && (
                <span className={styles.factNote}>the one a load that names no artboard draws; {inventory.artboards.length - 1} more below</span>
              )}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Its default view model</dt>
            <dd className={styles.factValue}>
              {a.defaultViewModel
                ? <code className={styles.chip}>{a.defaultViewModel}</code>
                : <span>none{inventory.viewModels.length > 0 ? ', though the file has view models' : ''}</span>}
            </dd>
          </div>
          <div className={`${styles.fact} ${styles.factWide}`}>
            <dt className={styles.factLabel}>Its state machines</dt>
            <dd className={styles.factValue}>
              {a.stateMachines.length === 0
                ? <span>none</span>
                : a.stateMachines.map(s => (
                    <div key={s.name} className={styles.machine}>
                      <code className={styles.chip}>{s.name}</code> <InputList inputs={s.inputs} />
                    </div>
                  ))}
            </dd>
          </div>
        </dl>
      ) : (
        <p className={styles.small}>No artboards. A runtime has nothing to draw.</p>
      )}
      {facts.viewModels.length > 0 && (
        <div className={styles.vmList}>
          {facts.viewModels.map(v => (
            <div key={v.name} className={styles.vmRow}>
              <div className={styles.vmHead}>
                <code className={styles.chip}>{v.name}</code>
                <span className={styles.factNote}>
                  {v.instances.filter(i => i.trim()).length === 0
                    ? 'no named instance'
                    : `instances: ${v.instances.map(i => i || '(unnamed)').join(', ')}`}
                </span>
              </div>
              <span className={styles.chips}>
                {v.properties.length === 0
                  ? <span className={styles.factNote}>no properties</span>
                  : v.properties.map(p => <code key={p.name} className={styles.chipQuiet}>{p.name}: {p.type}</code>)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Findings({ findings }) {
  const counts = Object.fromEntries(['fail', 'warn', 'note'].map(s => [s, findings.filter(f => f.severity === s).length]))
  return (
    <section
      className={styles.block}
      aria-label="Findings"
      data-testid="findings"
      data-fails={counts.fail}
      data-warns={counts.warn}
      data-notes={counts.note}
    >
      <div className={styles.blockHead}>
        <span className={styles.blockTitle}>Findings</span>
        <span className={styles.blockMeta}>
          {findings.length === 0 ? 'none' : `${counts.fail} fail · ${counts.warn} warn · ${counts.note} note`}
        </span>
      </div>
      {findings.length === 0 ? (
        <p className={styles.small}>Nothing the rules could object to. The rules are the runtime&apos;s contract and Rive&apos;s published guidance, not anyone&apos;s house style.</p>
      ) : (
        <ul className={styles.findingList}>
          {findings.map((f, i) => (
            <li key={i} className={styles.finding} data-severity={f.severity} data-rule={f.rule}>
              <span className={`${styles.severity} ${styles[`sev_${f.severity}`]}`}>{SEVERITY_LABEL[f.severity]}</span>
              <span className={styles.findingBody}>
                <span className={styles.findingPath}>{f.path}</span>
                <span className={styles.findingMessage}>{f.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// One disclosure section, the Glossary's pattern: closed by default, the
// count keeps the closed row informative, no focusable content inside so
// aria-hidden alone keeps the closed body out of the a11y tree.
function Disclosure({ id, title, count, children }) {
  const [open, setOpen] = useState(false)
  const bodyId = `rivlint-body-${id}`
  return (
    <section className={styles.disclosure}>
      <h3 className={styles.heading}>
        <button
          type="button"
          className={styles.headingButton}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(o => !o)}
          data-testid={`disclosure-${id}`}
        >
          <span className={styles.caret} data-open={open} aria-hidden="true" />
          <span className={styles.headingLabel}>{title}</span>
          <span className={styles.count}>{count}</span>
        </button>
      </h3>
      <div id={bodyId} className={`${styles.body} ${open ? styles.bodyOpen : ''}`}>
        <div className={styles.bodyInner} aria-hidden={!open}>
          {children}
        </div>
      </div>
    </section>
  )
}

function Inventory({ inventory }) {
  const { artboards, viewModels, enums = [], assets = [] } = inventory
  return (
    <section className={styles.block} aria-label="Inventory" data-testid="inventory">
      <div className={styles.blockHead}>
        <span className={styles.blockTitle}>Inventory</span>
        <span className={styles.blockMeta}>everything the runtime enumerated</span>
      </div>
      <Disclosure id="artboards" title="Artboards" count={artboards.length}>
        {artboards.map(a => (
          <div key={a.name} className={styles.row}>
            <div className={styles.rowHead}>
              <code className={styles.chip}>{a.name}</code>
              {a.name === inventory.defaultArtboard && <span className={styles.tag}>default</span>}
              <span className={styles.factNote}>
                default view model: {a.defaultViewModel === undefined ? 'not read' : (a.defaultViewModel ?? 'none')}
              </span>
            </div>
            <div className={styles.rowLine}>
              <span className={styles.rowLabel}>timelines</span>
              <span className={styles.chips}>{a.animations.length ? a.animations.map(t => <code key={t} className={styles.chipQuiet}>{t}</code>) : <span className={styles.factNote}>none</span>}</span>
            </div>
            {a.stateMachines.map(s => (
              <div key={s.name} className={styles.rowLine}>
                <span className={styles.rowLabel}>state machine</span>
                <span className={styles.chips}><code className={styles.chipQuiet}>{s.name}</code> <InputList inputs={s.inputs} /></span>
              </div>
            ))}
          </div>
        ))}
      </Disclosure>
      <Disclosure id="view-models" title="View models" count={viewModels.length}>
        {viewModels.length === 0 && <p className={styles.small}>None. The file is driven by state machine inputs or timelines alone.</p>}
        {viewModels.map(v => (
          <div key={v.name} className={styles.row}>
            <div className={styles.rowHead}>
              <code className={styles.chip}>{v.name}</code>
              <span className={styles.factNote}>{v.instances.length} {v.instances.length === 1 ? 'instance' : 'instances'}: {v.instances.map(i => i || '(unnamed)').join(', ') || 'none'}</span>
            </div>
            <div className={styles.rowLine}>
              <span className={styles.rowLabel}>properties</span>
              <span className={styles.chips}>{v.properties.map(p => <code key={p.name} className={styles.chipQuiet}>{p.name}: {p.type}</code>)}</span>
            </div>
            {v.children?.map(c => (
              <div key={c.property} className={styles.rowLine}>
                <span className={styles.rowLabel}>in {c.property}</span>
                <span className={styles.chips}>
                  {c.properties
                    ? c.properties.map(p => <code key={p.name} className={styles.chipQuiet}>{p.name}: {p.type}</code>)
                    : <span className={styles.factNote}>a nested view model; its name is not readable, and its properties could not be reached</span>}
                  {c.properties && <span className={styles.factNote}>a nested view model; its own name is not readable</span>}
                </span>
              </div>
            ))}
          </div>
        ))}
      </Disclosure>
      <Disclosure id="enums" title="Enums" count={enums.length}>
        {enums.length === 0 && <p className={styles.small}>None.</p>}
        {enums.map(e => (
          <div key={e.name} className={styles.row}>
            <div className={styles.rowHead}><code className={styles.chip}>{e.name}</code></div>
            <div className={styles.rowLine}><span className={styles.rowLabel}>values</span><span className={styles.chips}>{e.values.map(v => <code key={v} className={styles.chipQuiet}>{v}</code>)}</span></div>
          </div>
        ))}
      </Disclosure>
      <Disclosure id="assets" title="Assets" count={assets.length}>
        {assets.length === 0 && <p className={styles.small}>None. Every shape is vector and every glyph is a path.</p>}
        {assets.map((a, i) => (
          <div key={`${a.name}-${i}`} className={styles.rowLine}>
            <code className={styles.chip}>{a.name}{a.extension ? `.${a.extension}` : ''}</code>
            <span className={styles.factNote}>{a.kind}, {a.storage}{a.storage === 'embedded' ? `, ${fmtBytes(a.bytes)}` : ''}</span>
          </div>
        ))}
      </Disclosure>
    </section>
  )
}

function Compare({ l }) {
  const { compare, compareStatus, compareError, mode, setMode, comparison, compareWith, clearCompare } = l
  const [dragging, setDragging] = useState(false)
  const onFile = file => { if (file) compareWith(file) }
  const onDrop = event => {
    event.preventDefault()
    setDragging(false)
    onFile(event.dataTransfer?.files?.[0])
  }
  return (
    <section className={styles.block} aria-label="Compare" data-testid="compare">
      <div className={styles.blockHead}>
        <span className={styles.blockTitle}>Compare with</span>
        <span className={styles.blockMeta}>an earlier export, or a report this page made</span>
      </div>
      <p className={styles.small}>
        This is the question a re-export raises too late: is the structure I
        bound to still in the file. Drop the earlier .riv, or the report you
        downloaded from it, and read what appeared, vanished, or changed type.
      </p>
      {!compare && (
        <label
          className={`${styles.drop} ${styles.dropSmall} ${dragging ? styles.dropActive : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept=".riv,.json"
            className={styles.fileInput}
            data-testid="compare-file"
            onChange={e => onFile(e.target.files?.[0])}
          />
          <span className={styles.dropLabel}>Drop a .riv or a report .json here</span>
        </label>
      )}
      {compareStatus === STATUS.READING && <p className={styles.small}>Reading.</p>}
      {compareStatus === STATUS.ERROR && <p className={styles.small}>That could not be read. {compareError}</p>}
      {compare && comparison && (
        <>
          <div className={styles.compareHead}>
            <span className={styles.factNote}>against <strong>{compare.name}</strong></span>
            <button type="button" className={styles.sampleButton} onClick={clearCompare}>Clear</button>
          </div>
          <fieldset className={styles.modes}>
            <legend className={styles.srOnly}>Comparison mode</legend>
            <label className={styles.checkField}>
              <input type="radio" name="compare-mode" value={COMPARE_MODE.DIFF} checked={mode === COMPARE_MODE.DIFF} onChange={() => setMode(COMPARE_MODE.DIFF)} />
              <span>Show the differences</span>
            </label>
            <label className={styles.checkField}>
              <input type="radio" name="compare-mode" value={COMPARE_MODE.CONTRACT} checked={mode === COMPARE_MODE.CONTRACT} onChange={() => setMode(COMPARE_MODE.CONTRACT)} />
              <span>Treat it as the contract: anything it names must still be here</span>
            </label>
          </fieldset>
          <CompareResult comparison={comparison} />
        </>
      )}
    </section>
  )
}

function CompareResult({ comparison }) {
  if (comparison.mode === COMPARE_MODE.CONTRACT) {
    const { pass, failures, additions } = comparison
    return (
      <div data-testid="compare-result" data-pass={pass} data-failures={failures.length} data-additions={additions.length}>
        <p className={styles.verdict}>
          {pass
            ? `Everything the contract names is still here${additions.length ? `, and the file gained ${additions.length} ${additions.length === 1 ? 'thing' : 'things'} it did not name` : ''}.`
            : `${failures.length} ${failures.length === 1 ? 'thing' : 'things'} the contract names ${failures.length === 1 ? 'is' : 'are'} missing or changed.`}
        </p>
        {failures.length > 0 && <ChangeList entries={failures} />}
        {additions.length > 0 && <ChangeList entries={additions} quiet />}
      </div>
    )
  }
  const { entries } = comparison
  return (
    <div data-testid="compare-result" data-entries={entries.length}>
      <p className={styles.verdict}>
        {entries.length === 0 ? 'No structural difference.' : `${entries.length} ${entries.length === 1 ? 'difference' : 'differences'}.`}
      </p>
      {entries.length > 0 && <ChangeList entries={entries} />}
    </div>
  )
}

const CHANGE_WORD = { appeared: 'appeared', vanished: 'vanished', changed: 'changed' }
function ChangeList({ entries, quiet }) {
  return (
    <ul className={`${styles.changeList} ${quiet ? styles.changeListQuiet : ''}`}>
      {entries.map((e, i) => (
        <li key={i} className={styles.change} data-change={e.change}>
          <span className={styles.changeKind}>{CHANGE_WORD[e.change]}</span>
          <span className={styles.findingPath}>{e.path}</span>
          {e.change === 'changed' && (
            <span className={styles.factNote}>{String(e.from)} to {String(e.to)}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

// Exported for the sample builder and tests; the page itself uses it only
// through the download's explanatory line.
export { toManifestEntry }
