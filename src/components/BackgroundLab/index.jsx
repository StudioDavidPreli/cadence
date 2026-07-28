import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { inkCensus, markCensus } from '../../background/census'
import { INK_MODES } from '../../background/ink'
import styles from './BackgroundLab.module.css'

// ─── BackgroundLab ───────────────────────────────────────────────────────────
//
// The second lab. The first one was URL parameters, which is the right shape
// for a question you already know the answer to ("show me budget 60") and the
// wrong shape for the two questions this one is for, because both are answered
// by feel across a range rather than by a value you can name in advance:
//
//   density    stamps landing on each other. Reading the field takes moving
//              three knobs against each other (how many, how big, how close),
//              and a reload between each one loses the comparison.
//   colour     which ink is doing the damage. You cannot know that from the
//              file: the libraries hold 8 to 49 authored inks and the ones
//              that matter are the ones carrying stroke length, not the ones
//              appearing most often.
//
// It mounts only inside the lazy background chunk, so it costs the shipped app
// nothing: with ?bg=1 absent, none of this is downloaded.
//
// PORTALED TO BODY, deliberately. This renders from inside the nav column,
// which clips its overflow and owns a stacking context that the artwork's
// z-index -1 depends on. A panel rendered in place would either be clipped by
// the column or would have to fight that stacking context. The body is the
// honest parent for a fixed overlay.

// The census is the whole reason the colour section works, so it is worth
// saying what a row means: `share` is the fraction of the library's total
// stroke LENGTH carrying that ink. An ink at 9.8% is a tenth of what you see.
// `entry.ink` is the CANONICAL ink, which is the key everything else is keyed
// on: the census counts it, an override is stored against it, and the resolver
// looks it up. `entry.painted` is what the active colorway turns it into, which
// is what is actually on screen. The row shows the painted colour and edits the
// canonical one, so the swatch never lies about the drawing while the override
// still lands where the resolver will find it.
function InkRow({ entry, override, onOverride, onReset }) {
  // A token-bound ink is not overridable and says so rather than being hidden.
  // Hiding it would suggest the library has fewer inks than it does, and the
  // fact that 0.6% of Token Lab already follows the theme is a thing to know
  // while you are deciding what the rest should do.
  if (entry.tokenBound) {
    return (
      <li className={styles.inkRow}>
        <span className={styles.swatchBound} aria-hidden="true" />
        <span className={styles.inkName}>currentColor</span>
        <span className={styles.inkShare}>{(entry.share * 100).toFixed(1)}%</span>
        <span className={styles.inkNote}>follows theme</span>
      </li>
    )
  }

  const painted = entry.painted || entry.ink
  const value = override || painted
  const recoloured = !override && painted.toLowerCase() !== entry.ink.toLowerCase()
  return (
    <li className={styles.inkRow}>
      <input
        type="color"
        className={styles.swatch}
        value={value.toLowerCase()}
        onChange={(e) => onOverride(entry.ink, e.target.value)}
        aria-label={`Recolour ${entry.ink}`}
      />
      <span className={styles.inkName}>{painted.toLowerCase()}</span>
      <span className={styles.inkShare}>{(entry.share * 100).toFixed(1)}%</span>
      {override ? (
        <button type="button" className={styles.rowReset} onClick={() => onReset(entry.ink)}>
          reset
        </button>
      ) : (
        // Where the colorway moved this ink from. Without it the panel reads as
        // if the art were authored in these colours in every theme, which is the
        // one thing the four folders exist to disprove.
        <span className={styles.inkNote}>{recoloured ? entry.ink.toLowerCase() : ''}</span>
      )}
    </li>
  )
}

function Slider({ label, value, min, max, step, onChange, format }) {
  return (
    <label className={styles.control}>
      <span className={styles.controlHead}>
        <span>{label}</span>
        <span className={styles.controlValue}>{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function BackgroundLab({ library, libraryKey, state, onChange, stats, colorway, markPalette }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('colour')

  // Both censuses are pure functions of the library, so they are computed here
  // rather than reported up from BackgroundArt. Nothing has to be plumbed
  // through the renderer, and the panel cannot fall out of sync with what is
  // drawn because both read the same built library.
  //
  // The census measures the CANONICAL library, because that is where the
  // geometry lives and stroke length is a geometric quantity: the shares are the
  // same in every theme. Only the colour differs, so the colorway is applied as
  // a second pass over the finished rows rather than by censusing four times.
  const inks = useMemo(
    () => inkCensus(library).map((entry) => ({
      ...entry,
      painted: entry.tokenBound ? null : (markPalette ? markPalette.get(entry.ink) : entry.ink) ?? entry.ink,
    })),
    [library, markPalette],
  )
  const marks = useMemo(() => markCensus(library), [library])

  const set = (patch) => onChange({ ...state, ...patch })

  const setOverride = (ink, value) =>
    set({ inkOverrides: { ...state.inkOverrides, [ink.toLowerCase()]: value } })

  const clearOverride = (ink) => {
    const next = { ...state.inkOverrides }
    delete next[ink.toLowerCase()]
    set({ inkOverrides: next })
  }

  const overrideCount = Object.keys(state.inkOverrides || {}).length

  const panel = (
    <div className={styles.root} data-open={open || undefined}>
      {open ? (
        <section className={styles.panel} aria-label="Background lab">
          <header className={styles.header}>
            <span className={styles.title}>Background lab</span>
            <span className={styles.meta}>
              {libraryKey} · {colorway}
            </span>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close lab">
              ×
            </button>
          </header>

          <div className={styles.tabs} role="tablist">
            {['colour', 'density', 'evenness'].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={styles.tab}
                data-active={tab === t || undefined}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className={styles.body}>
            {tab === 'colour' && (
              <>
                <label className={styles.control}>
                  <span className={styles.controlHead}><span>face</span></span>
                  <select value={state.face} onChange={(e) => set({ face: e.target.value })}>
                    <option value="vector">vector (traced outlines)</option>
                    <option value="native">native (authored fills)</option>
                    <option value="pixel">pixel (aggregated cells)</option>
                    <option value="both">vector + pixel</option>
                  </select>
                </label>

                <p className={styles.note}>
                  {state.face === 'native'
                    ? 'Native draws the authored shapes filled, one <use> per stamp. It reads the colorway directly, so the transform and overrides below do not reach it, and neither do stroke width or normalize.'
                    : 'Vector strokes the flattened outline of every shape. On pixel art that outlines each box, which is what stroke width and normalize are for.'}
                </p>

                <label className={styles.control}>
                  <span className={styles.controlHead}><span>theme transform</span></span>
                  <select
                    value={state.inkTransform}
                    onChange={(e) => set({ inkTransform: e.target.value })}
                    disabled={state.face === 'native'}
                  >
                    {INK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>

                <p className={styles.note}>
                  {inks.length} inks, ordered by share of total stroke length. An override
                  wins over the transform above, and never touches a token-bound ink.
                  {markPalette && ' The right-hand column is the canonical ink each one was authored from.'}
                </p>

                <ul className={styles.inkList}>
                  {inks.map((entry) => (
                    <InkRow
                      key={entry.ink}
                      entry={entry}
                      override={state.inkOverrides?.[entry.ink.toLowerCase()]}
                      onOverride={setOverride}
                      onReset={clearOverride}
                    />
                  ))}
                </ul>

                {overrideCount > 0 && (
                  <div className={styles.footerRow}>
                    <span className={styles.note}>{overrideCount} overridden</span>
                    <button type="button" className={styles.reset} onClick={() => set({ inkOverrides: {} })}>
                      clear all
                    </button>
                  </div>
                )}
              </>
            )}

            {tab === 'density' && (
              <>
                <Slider
                  label="budget" min={10} max={400} step={5}
                  value={state.budget} onChange={(budget) => set({ budget })}
                />
                <Slider
                  label="stamp scale" min={0.05} max={1} step={0.01}
                  value={state.stampScale} onChange={(stampScale) => set({ stampScale })}
                  format={(v) => v.toFixed(2)}
                />
                <Slider
                  label="min spacing" min={0} max={120} step={1}
                  value={state.minSpacing} onChange={(minSpacing) => set({ minSpacing })}
                  format={(v) => (v ? `${v}px` : 'off')}
                />
                <p className={styles.note}>
                  Spacing drops a stamp whose center lands within that distance of one
                  already placed. It thins the field rather than rearranging it, so the
                  drawing you like stays the drawing you like.
                </p>
                <Slider
                  label="drift amplitude" min={0} max={24} step={1}
                  value={state.idleAmplitude} onChange={(idleAmplitude) => set({ idleAmplitude })}
                  format={(v) => (v ? `${v}px` : 'still')}
                />
                <p className={styles.note}>
                  Peak sway, before a per-band variance widens it to 0.6&ndash;1.4&times;. It
                  also reserves clearance above the nav labels, which is why moving it
                  redraws the field.
                </p>
                <Slider
                  label="drift period floor" min={0.5} max={8} step={0.5}
                  value={state.driftMin} onChange={(driftMin) => set({ driftMin })}
                  format={(v) => `${v}s`}
                />
                <Slider
                  label="drift period ceiling" min={4} max={30} step={0.5}
                  value={state.driftMax} onChange={(driftMax) => set({ driftMax })}
                  format={(v) => `${v}s`}
                />
                <p className={styles.note}>
                  The drift period scales with <code>--motion-duration-slower</code> against
                  Standard&rsquo;s 600ms, then clamps here. Standard lands on the chrome
                  constant exactly; Snappy is faster, Cinematic slower. The floor is what
                  makes deriving an infinite animation from an editable token safe at all,
                  so lower it knowing that is what it guards.
                </p>
                {stats && (
                  <dl className={styles.stats}>
                    <div><dt>stamps</dt><dd>{stats.stamps}</dd></div>
                    <div><dt>dropped</dt><dd>{stats.rejected}</dd></div>
                    <div><dt>cells</dt><dd>{stats.cells}</dd></div>
                  </dl>
                )}
              </>
            )}

            {tab === 'evenness' && (
              <>
                <Slider
                  label="normalize ink" min={0} max={1} step={0.05}
                  value={state.inkNormalize} onChange={(inkNormalize) => set({ inkNormalize })}
                  format={(v) => (v ? `${Math.round(v * 100)}%` : 'off')}
                />
                <Slider
                  label="stroke width" min={0.4} max={4} step={0.1}
                  value={state.strokeWidth} onChange={(strokeWidth) => set({ strokeWidth })}
                  format={(v) => v.toFixed(1)}
                />
                <p className={styles.note}>
                  Ink per unit of mark size, against the library median. Every mark
                  outlines every pixel, so the gap is pixel resolution, and Token Lab
                  no longer has one worth correcting: 0.83x to 1.25x since the boxes
                  were evened. Normalize scales each mark&rsquo;s stroke weight toward
                  the median.
                </p>
                <ul className={styles.markList}>
                  {marks.marks
                    .slice()
                    .sort((a, b) => b.ratio - a.ratio)
                    .map((m) => (
                      <li key={m.index} className={styles.markRow} data-outlier={m.ratio > 1.6 || m.ratio < 0.6 || undefined}>
                        <span className={styles.markName}>{m.name}</span>
                        <span className={styles.markBar} aria-hidden="true">
                          <span style={{ width: `${Math.min(100, (m.ratio / 2.5) * 100)}%` }} />
                        </span>
                        <span className={styles.markRatio}>{m.ratio.toFixed(2)}x</span>
                        <span className={styles.markSub}>{m.subpaths}</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </div>
        </section>
      ) : (
        <button type="button" className={styles.handle} onClick={() => setOpen(true)}>
          lab{overrideCount ? ` · ${overrideCount}` : ''}
        </button>
      )}
    </div>
  )

  return createPortal(panel, document.body)
}
