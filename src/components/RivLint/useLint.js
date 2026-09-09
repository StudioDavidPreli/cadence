// The page's state: a file in, a report out, and a second slot for the file
// or report it is compared with. Everything pure is in lintModel.js and the
// runtime work in readRiv.js; this hook sequences them and keeps React
// informed. The only requests it can make are for one of the site's own
// samples (a .riv under /rive/ and the report the page produced from it
// earlier); a dropped file never leaves the page.
import { useCallback, useMemo, useState } from 'react'
import { readRiv, RUNTIME_VERSION } from './readRiv'
import {
  buildReport, parseReport, lint, handoff, diffInventories, checkContract, defaultArtboardOf,
} from './lintModel'
import { renderComparison } from './renderCompare'

export const STATUS = {
  IDLE: 'idle',
  READING: 'reading',
  DONE: 'done',
  ERROR: 'error',
}

export const COMPARE_MODE = {
  DIFF: 'diff',
  CONTRACT: 'contract',
}

const today = () => new Date().toISOString().slice(0, 10)

async function readSubject(file) {
  const buffer = await file.arrayBuffer()
  const raw = await readRiv(buffer)
  const report = buildReport(raw, { file: file.name, size: file.size, runtime: RUNTIME_VERSION, date: today() })
  return { buffer, raw, report, name: file.name }
}

export function useLint() {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [error, setError] = useState(null)
  const [subject, setSubject] = useState(null)   // { buffer, raw, report, name, sample? }
  const [compare, setCompare] = useState(null)   // { inventory, name, kind: 'riv' | 'report', date? }
  const [compareStatus, setCompareStatus] = useState(STATUS.IDLE)
  const [compareError, setCompareError] = useState(null)
  const [mode, setMode] = useState(COMPARE_MODE.DIFF)
  const [render, setRender] = useState(null)          // [{ instance, a, b, diff | error }] | null
  const [renderStatus, setRenderStatus] = useState(STATUS.IDLE)
  const [renderError, setRenderError] = useState(null)

  const lintFile = useCallback(async file => {
    setStatus(STATUS.READING)
    setError(null)
    setCompare(null)
    setCompareStatus(STATUS.IDLE)
    setRender(null)
    setRenderStatus(STATUS.IDLE)
    try {
      setSubject(await readSubject(file))
      setStatus(STATUS.DONE)
    } catch (err) {
      setSubject(null)
      setError(err?.message ?? String(err))
      setStatus(STATUS.ERROR)
    }
  }, [])

  // A sample: one of the site's own files and the report the page made from
  // it earlier, loaded as the compare slot in contract mode so the workflow
  // shows itself on the first click.
  const lintSample = useCallback(async sample => {
    setStatus(STATUS.READING)
    setError(null)
    setCompare(null)
    try {
      const [rivRes, reportRes] = await Promise.all([fetch(sample.riv), fetch(sample.report)])
      if (!rivRes.ok || !reportRes.ok) throw new Error('The sample could not be fetched.')
      const buffer = await rivRes.arrayBuffer()
      const stored = await reportRes.json()
      const raw = await readRiv(buffer)
      const name = sample.riv.split('/').pop()
      const report = buildReport(raw, { file: name, size: buffer.byteLength, runtime: RUNTIME_VERSION, date: today() })
      setSubject({ buffer, raw, report, name, sample })
      setCompare({ inventory: parseReport(stored), name: `${name}, the report from ${stored.meta?.date ?? 'earlier'}`, kind: 'report', date: stored.meta?.date })
      setCompareStatus(STATUS.DONE)
      setMode(COMPARE_MODE.CONTRACT)
      setStatus(STATUS.DONE)
    } catch (err) {
      setSubject(null)
      setError(err?.message ?? String(err))
      setStatus(STATUS.ERROR)
    }
  }, [])

  // The compare slot takes a .riv (read the same way) or a report JSON. The
  // two are told apart by content, not by name: a .riv opens with the bytes
  // "RIVE", a report with "{", and a file saved under a bare name (a browser
  // download, say) is still one or the other.
  const compareWith = useCallback(async file => {
    setCompareStatus(STATUS.READING)
    setCompareError(null)
    try {
      const buffer = await file.arrayBuffer()
      const head = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength))
      const isRive = head.length === 4 && String.fromCharCode(...head) === 'RIVE'
      if (!isRive) {
        let parsed
        try { parsed = JSON.parse(new TextDecoder().decode(buffer)) } catch { parsed = null }
        const inventory = parseReport(parsed)
        if (!inventory) throw new Error('That is neither a .riv nor a report this page produced.')
        setCompare({ inventory, name: file.name, kind: 'report', date: parsed.meta?.date })
      } else {
        const raw = await readRiv(buffer)
        const report = buildReport(raw, { file: file.name, size: file.size, runtime: RUNTIME_VERSION, date: today() })
        // The bytes stay with the slot so the render comparison can draw
        // this file beside the subject.
        setCompare({ inventory: report.inventory, name: file.name, kind: 'riv', buffer })
      }
      setRender(null)
      setRenderStatus(STATUS.IDLE)
      setCompareStatus(STATUS.DONE)
    } catch (err) {
      setCompare(null)
      setCompareError(err?.message ?? String(err))
      setCompareStatus(STATUS.ERROR)
    }
  }, [])

  const clearCompare = useCallback(() => {
    setCompare(null)
    setCompareStatus(STATUS.IDLE)
    setCompareError(null)
    setRender(null)
    setRenderStatus(STATUS.IDLE)
  }, [])

  // Draw the subject and the compared .riv instance by instance and compare
  // the pixels. The scene is the subject's default artboard, its first state
  // machine, and its default view model's instances (or the file's first
  // view model's), so the question is the consumer's: with the same instance
  // bound, does the same artboard still draw the same thing?
  const runRender = useCallback(async () => {
    if (!subject || !compare?.buffer) return
    setRenderStatus(STATUS.READING)
    setRenderError(null)
    try {
      const inv = subject.report.inventory
      const { artboard } = defaultArtboardOf(inv)
      if (!artboard) throw new Error('The file has no artboard to draw.')
      const vmName = artboard.defaultViewModel || inv.viewModels[0]?.name || null
      const vm = inv.viewModels.find(v => v.name === vmName) ?? null
      const instances = vm && vm.instances.length ? vm.instances : ['']
      const scene = { artboard: artboard.name, stateMachine: artboard.stateMachines[0]?.name ?? null, viewModel: vm?.name ?? null, instances }
      setRender({ scene, rows: await renderComparison(compare.buffer, subject.buffer, scene) })
      setRenderStatus(STATUS.DONE)
    } catch (err) {
      setRender(null)
      setRenderError(err?.message ?? String(err))
      setRenderStatus(STATUS.ERROR)
    }
  }, [subject, compare])

  const inventory = subject?.report.inventory ?? null
  const findings = useMemo(() => (inventory ? lint(inventory) : []), [inventory])
  const facts = useMemo(() => (inventory ? handoff(inventory) : null), [inventory])
  const comparison = useMemo(() => {
    if (!inventory || !compare) return null
    return mode === COMPARE_MODE.CONTRACT
      ? { mode, ...checkContract(compare.inventory, inventory) }
      : { mode, entries: diffInventories(compare.inventory, inventory) }
  }, [inventory, compare, mode])

  return {
    status, error, subject, inventory, findings, facts,
    compare, compareStatus, compareError, mode, setMode, comparison,
    render, renderStatus, renderError, runRender,
    lintFile, lintSample, compareWith, clearCompare,
  }
}
