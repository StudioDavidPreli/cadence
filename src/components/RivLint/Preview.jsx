// The preview (Q3): one artboard on a canvas, its first state machine, one
// named instance bound, so the user can see the file is the one they think
// it is. Nothing is driven; no input is fired. Under reduced motion the
// canvas draws one frame and waits for the play control, which is the only
// autoplay decision on the page (David's gate, 2026-09-08).
//
// The instance the preview binds is chosen from the artboard's default view
// model when the read carries one, else the file's first view model; bound
// explicitly (autoBind off), the same way the item 9 probe showed a file
// whose artboard lost its default pointer still draws when told what to
// bind.
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { loadInstance } from './readRiv'
import styles from './RivLint.module.css'

export function Preview({ buffer, inventory }) {
  const reduce = useReducedMotion()
  const canvasRef = useRef(null)
  const riveRef = useRef(null)
  const [artboard, setArtboard] = useState(() => inventory.defaultArtboard ?? inventory.artboards[0]?.name ?? '')
  const ab = inventory.artboards.find(a => a.name === artboard) ?? inventory.artboards[0]
  const vmName = ab?.defaultViewModel || inventory.viewModels[0]?.name || ''
  const vm = inventory.viewModels.find(v => v.name === vmName) ?? null
  const instances = vm ? vm.instances : []
  const [instance, setInstance] = useState(() => instances[0] ?? '')
  const [playing, setPlaying] = useState(!reduce)
  const [failed, setFailed] = useState(false)

  // A new file resets the selection to its default artboard.
  useEffect(() => {
    setArtboard(inventory.defaultArtboard ?? inventory.artboards[0]?.name ?? '')
    setFailed(false)
  }, [inventory])
  useEffect(() => { setInstance(instances[0] ?? '') }, [vmName, artboard]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPlaying(!reduce) }, [reduce])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !ab) return
    let live = true
    let r = null
    loadInstance(buffer, canvas, { artboard: ab.name, stateMachines: ab.stateMachines[0]?.name })
      .then(inst => {
        if (!live) { inst.cleanup(); return }
        r = inst
        riveRef.current = inst
        try {
          if (vm) {
            const model = inst.viewModelByName(vm.name)
            const bound = instance && instance.trim() ? model?.instanceByName(instance) : model?.defaultInstance()
            if (bound) inst.bindViewModelInstance(bound)
          }
        } catch { /* an unbindable instance still previews */ }
        inst.resizeDrawingSurfaceToCanvas()
        if (playing && ab.stateMachines[0]) inst.play(ab.stateMachines[0].name)
        else inst.drawFrame()
      })
      .catch(() => { if (live) setFailed(true) })
    return () => {
      live = false
      if (r) r.cleanup()
      riveRef.current = null
    }
    // playing is applied through the play control below, not by reloading.
  }, [buffer, ab, vm, instance]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const r = riveRef.current
    const sm = ab?.stateMachines[0]?.name
    if (!r || !sm) return
    if (playing) r.pause(sm)
    else r.play(sm)
    setPlaying(p => !p)
  }

  if (!ab) return null
  return (
    <section className={styles.block} aria-label="Preview" data-testid="preview" data-playing={playing}>
      <div className={styles.blockHead}>
        <span className={styles.blockTitle}>Preview</span>
        <span className={styles.blockMeta}>one artboard, one instance, no inputs driven</span>
      </div>
      <div className={styles.previewRow}>
        <div className={styles.previewBox}>
          {failed
            ? <p className={styles.small}>The runtime could not draw this artboard.</p>
            : <canvas ref={canvasRef} className={styles.previewCanvas} aria-label={`Preview of artboard ${ab.name}`} />}
        </div>
        <div className={styles.previewControls}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>artboard</span>
            <select className={styles.select} value={ab.name} onChange={e => setArtboard(e.target.value)} data-testid="preview-artboard">
              {inventory.artboards.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
          {vm && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{vm.name}</span>
              <select className={styles.select} value={instance} onChange={e => setInstance(e.target.value)} data-testid="preview-instance">
                {instances.length === 0 && <option value="">(default instance)</option>}
                {instances.map(i => <option key={i} value={i}>{i || '(unnamed)'}</option>)}
              </select>
            </label>
          )}
          {ab.stateMachines[0] ? (
            <button type="button" className={styles.sampleButton} onClick={toggle} aria-pressed={playing} data-testid="preview-play">
              {playing ? 'Pause' : 'Play'} {ab.stateMachines[0].name}
            </button>
          ) : (
            <span className={styles.factNote}>no state machine to play</span>
          )}
          {reduce && <span className={styles.factNote}>Reduced motion: the preview holds until you press play.</span>}
        </div>
      </div>
    </section>
  )
}
