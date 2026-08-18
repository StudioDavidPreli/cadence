// ─── Token audit ──────────────────────────────────────────────────────────────
// A pure read over a token set the USER built or imported, answering the question
// import validation structurally cannot: is this set internally coherent, and
// what does it actually do?
//
// Who this is for. Not Cadence. The sets that pass through here were assembled on
// the sliders or arrived as a file, and most of them are on their way back out to
// somebody's real design system. The report is written to be handed to the
// engineer who has to implement the set, which is why it prints the values it
// judged alongside the judgments.
//
// Why this is not part of importTokens. Every check in that pipeline is a
// single-token predicate: is this a number, is it inside its range, is this
// curve's x legal. Each one looks at exactly one value. Everything below is a
// COMBINATION, which is why a file can import perfectly clean and still describe
// a system whose names lie about its own behavior. `fast: 900` is a legal
// duration. `slow: 400` is a legal duration. Together they are a broken ladder.
//
// Why it takes state rather than a file. importTokens already returns a state
// object on success, so auditing an imported set and auditing what is currently
// on the sliders are the same call with a different argument. One implementation,
// two surfaces.
//
// Why nothing here is an error. Explore mode's whole argument is that the wide
// ranges are legitimate, so an audit that stamped "invalid" on a value Explore
// deliberately offers would be the tool contradicting itself. Every result is a
// `finding` (the set contradicts itself) or a `note` (legal, and worth seeing).
// Nothing blocks, nothing is repaired, nothing is refused.
//
// Where the bars come from. Two places, and nowhere else. Either the set is
// measured against ITSELF (a ladder that runs backwards, a spring wildly out of
// proportion to the set's own durations), or against ONE cited industry number
// (NIELSEN_RESPONSE_MS). Cadence's own presets are not an authority here: they
// are three examples, and a user set that looks nothing like them is not thereby
// wrong. The presets appear in the tests only as a smoke check that the audit is
// not absurdly tight.
//
// Scope: duration, delay, scale, spring. Easing is deliberately absent. A curve's
// one structural rule (x inside [0, 1]) is already enforced at import, and "is
// this curve's shape appropriate" is a judgment rather than a check.
//
// Layering note: this imports from components/SpringVisualizer/springCurve.js,
// which points from a leaf layer up into components/. It creates no cycle
// (springCurve.js imports nothing at all, by design), but the direction is worth
// naming. The alternative is relocating springCurve.js to a shared leaf such as
// src/tokens/ or src/utils/, which would touch SpringVisualizer. Left as-is
// because the spring math has one owner and the audit is its second reader, not
// its new home.

import {
  settleTime,
  overshootFraction,
  dampingRatio,
} from '../components/SpringVisualizer/springCurve'

// ─── Thresholds ───────────────────────────────────────────────────────────────
// Exported so the tests can pin them and a future panel can show the bar it
// measured against.
//
// Every one is anchored to a shipped preset rather than to a general UX rule.
// Standard, Snappy, and Cinematic ARE this system's statement of what is
// reasonable, so a threshold that fires on any of them is measuring the wrong
// thing. The audit is checked against all three in tokenAudit.test.js and must
// stay silent on each.
// The one industry reference this module cites. Kept separate from THRESHOLDS
// because it is not one: a threshold is a bar this audit chose, and this is a
// number the field agreed on. Nielsen's response-time limit, about one second, is
// the edge of keeping a user's flow of thought uninterrupted.
//
// It is reported as a MEASUREMENT and never as a failure (David's call). A user
// building an editorial system is allowed to sit past it on purpose. Showing the
// number next to the bar lets them see where they landed and decide; flagging it
// as a fault would be this tool telling someone their design language is wrong.
export const NIELSEN_RESPONSE_MS = 1000

// Both remaining thresholds answer to something outside this file's opinion. The
// first measures the set against itself. The second is a claim about perception.
// There is deliberately no "too slow overall" bar: NIELSEN_RESPONSE_MS is
// reported on that number already, and a second homemade limit stacked on top
// would be the audit inventing an authority it does not have.
export const THRESHOLDS = {
  // How many times longer the spring may keep moving than the slowest duration
  // token in the SAME set before the two stop describing one system. This is a
  // proportion, not a stopwatch: a set whose durations run 200ms and whose spring
  // rings for four seconds is incoherent, while the identical spring inside a
  // deliberately slow editorial set may be exactly right. Judging the spring
  // against an absolute number of seconds would have meant picking that number
  // out of the air.
  //
  // For scale: across Cadence's three presets the ratio sits between 0.26 and
  // 1.02, and { stiffness: 1, damping: 1, mass: 10 } (every value individually
  // legal) lands at roughly 130.
  springSettleRatio: 5,

  // Peak overshoot as a fraction past rest. A claim about perception rather than
  // about any particular set: half again past the target is where overshoot stops
  // reading as confidence and starts reading as a glitch.
  springOvershootNote: 0.5,
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// The audit must survive a partial or hand-built state without throwing. It runs
// on live editor state as much as on an import result, and a caller mid-edit is
// not obliged to hand over a complete object. A check whose inputs are missing is
// skipped rather than guessed at, which is why every read goes through here.
function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// `id` is unique per finding (the token keys are part of it) so a panel can use
// it as a React key and a test can assert on one row without matching prose.
// `paths` names the tokens the check actually read, in the same dot notation the
// import report uses, so a panel can link a finding straight to the controls that
// produced it.
function entry(id, severity, paths, message) {
  return { id, severity, paths, message }
}

// A measurement is a number the report always carries, whether or not anything is
// wrong with it. This is the half that makes the output a report rather than a
// linter: the user gets to see what their set actually does, next to the industry
// number where one exists, and decide for themselves.
//
// `reference` is optional and never implies a fault. `exceeded` states where the
// value landed relative to the reference, which is a fact, not a verdict.
function measure(id, label, display, paths, reference = null) {
  return { id, label, display, paths, reference }
}

// The one industry anchor this module cites, shaped for the measurement rows that
// use it. Two different measurements reference it (how long the set can make a
// user wait, and how long the spring keeps moving) because it is the same
// perceptual claim in both cases.
function nielsenReference(valueMs) {
  return {
    label: 'Nielsen response threshold',
    value: NIELSEN_RESPONSE_MS,
    display: `${NIELSEN_RESPONSE_MS}ms`,
    exceeded: valueMs > NIELSEN_RESPONSE_MS,
  }
}

// A settle time of Infinity is reachable only through the guard branch in
// settleTime, but it would render as "Infinitys" if formatted naively.
function formatSeconds(t) {
  return Number.isFinite(t) ? `${t.toFixed(1)}s` : 'never'
}

// ─── Ladder coherence ─────────────────────────────────────────────────────────
// duration and delay both name a ladder: fast through slower, short through long.
// The names only mean anything if the values climb with them. An inversion does
// not break one token, it makes every name in the family describe something it is
// not, which is the failure mode worth naming in a tool about shared vocabulary.
//
// Equal neighbours are a note rather than a finding. Nothing contradicts itself,
// but the ladder has a rung that changes nothing, and a set with two names for one
// value is a set where one of those names is unreachable.
function checkLadder(group, family, keys, unit, report) {
  for (let i = 0; i < keys.length - 1; i++) {
    const lowerKey = keys[i]
    const upperKey = keys[i + 1]
    const lower = num(group?.[lowerKey])
    const upper = num(group?.[upperKey])
    if (lower === null || upper === null) continue

    const paths = [`${family}.${lowerKey}`, `${family}.${upperKey}`]
    if (lower > upper) {
      report.findings.push(entry(
        `${family}.order.${lowerKey}-${upperKey}`,
        'finding',
        paths,
        `${lowerKey} (${lower}${unit}) is longer than ${upperKey} (${upper}${unit}), so the ladder runs backwards here.`,
      ))
    } else if (lower === upper) {
      report.findings.push(entry(
        `${family}.duplicate.${lowerKey}-${upperKey}`,
        'note',
        paths,
        `${lowerKey} and ${upperKey} are both ${lower}${unit}, so one of the two names has nothing of its own to describe.`,
      ))
    }
  }
}

// ─── Scale semantics ──────────────────────────────────────────────────────────
// scale is the family where a legal value can contradict its own name outright.
// Explore gives every scale token the same 0.50 to 1.20 range, so `lift: 0.6` and
// `pressBase: 1.15` both import clean while describing a lift that shrinks and a
// press that grows.
//
// The press ladder descends as intensity rises (subtle 0.98, base 0.95,
// expressive 0.90 in Standard), which is the opposite direction from duration, so
// it gets its own walk rather than a reversed call into checkLadder. Sharing the
// generic helper would have meant passing the keys backwards and writing the
// messages in duration's language.
const PRESS_KEYS = ['pressSubtle', 'pressBase', 'pressExpressive']

function checkScale(state, report) {
  const scale = state?.scale

  // A press is a compression toward the surface. At or above 1 it is not a press.
  for (const key of PRESS_KEYS) {
    const v = num(scale?.[key])
    if (v === null) continue
    if (v >= 1) {
      report.findings.push(entry(
        `scale.press.${key}`,
        'finding',
        [`scale.${key}`],
        `${key} is ${v}, which grows the element instead of pressing it.`,
      ))
    }
  }

  // A lift raises off the surface. At or below 1 it is not a lift.
  const lift = num(scale?.lift)
  if (lift !== null && lift <= 1) {
    report.findings.push(entry(
      'scale.lift',
      'finding',
      ['scale.lift'],
      `lift is ${lift}, which sinks the element instead of lifting it.`,
    ))
  }

  // Intensity has to increase along the press ladder, or subtle and expressive
  // have swapped meanings while keeping their names.
  for (let i = 0; i < PRESS_KEYS.length - 1; i++) {
    const softerKey = PRESS_KEYS[i]
    const harderKey = PRESS_KEYS[i + 1]
    const softer = num(scale?.[softerKey])
    const harder = num(scale?.[harderKey])
    if (softer === null || harder === null) continue

    const paths = [`scale.${softerKey}`, `scale.${harderKey}`]
    if (harder > softer) {
      report.findings.push(entry(
        `scale.order.${softerKey}-${harderKey}`,
        'finding',
        paths,
        `${harderKey} (${harder}) presses less than ${softerKey} (${softer}), so the two names describe each other's behavior.`,
      ))
    } else if (harder === softer) {
      report.findings.push(entry(
        `scale.duplicate.${softerKey}-${harderKey}`,
        'note',
        paths,
        `${softerKey} and ${harderKey} are both ${softer}, so the press ladder has a step that changes nothing.`,
      ))
    }
  }
}

// ─── Spring coherence and budget ──────────────────────────────────────────────
// This is the check the whole module was worth writing for. Import validates
// stiffness, damping, and mass one at a time against SPRING_BOUNDS, and every one
// of { stiffness: 1, damping: 1, mass: 10 } passes. Together they are a damping
// ratio near 0.16 and a spring that rings for over a minute. No per-key range can
// see that, because the failure is not in any key.
//
// The finding is proportional, measured against the set's own duration ladder, so
// the audit never has to assert how long a spring "should" take. A set gets to
// decide its own tempo; what it does not get to do is run a spring on a tempo
// unrelated to everything else it defines.
//
// The math is already in the repo, and it is the same math the SpringVisualizer
// draws, so the number the audit reports and the curve the user is looking at
// describe one spring.
const SPRING_PATHS = ['spring.stiffness', 'spring.damping', 'spring.mass']

// The three regimes zeta names, in the same words springCurve.js uses, so the
// report and the visualizer's caption describe one spring in one vocabulary.
function springRegime(zeta) {
  if (zeta < 0.999) return 'underdamped'
  if (zeta > 1.001) return 'overdamped'
  return 'critically damped'
}

function checkSpring(state, report) {
  const stiffness = num(state?.spring?.stiffness)
  const damping = num(state?.spring?.damping)
  const mass = num(state?.spring?.mass)
  if (stiffness === null || damping === null || mass === null) return
  // Non-positive params are rejected outright at import and would make the
  // oscillator math meaningless. Nothing to measure, so nothing is claimed.
  if (!(stiffness > 0 && damping > 0 && mass > 0)) return

  const params = { stiffness, damping, mass }
  // clamp: false because the visualizer's 4s ceiling exists to size a plot, and
  // the audit's entire job here is to report the number that ceiling would hide.
  const settle = settleTime(params, 0.02, { clamp: false })
  const overshoot = overshootFraction(params)
  const zeta = dampingRatio(params)

  // Measurements first, and unconditionally. The three numbers below describe the
  // spring whether or not it trips a bar, and the settle time is the one a user
  // cannot read off the three sliders: it is what stiffness, damping, and mass
  // together produce. Reporting it always is the point of the exercise.
  report.measurements.push(measure(
    'spring.settle',
    'Spring settle',
    formatSeconds(settle),
    SPRING_PATHS,
    nielsenReference(settle * 1000),
  ))
  report.measurements.push(measure(
    'spring.overshoot',
    'Spring overshoot',
    `${Math.round(overshoot * 100)}% past rest`,
    SPRING_PATHS,
  ))
  // The damping ratio names the regime in one number, which is the vocabulary the
  // SpringVisualizer already teaches. No reference: there is no correct zeta, only
  // the three regimes and which one the author meant.
  report.measurements.push(measure(
    'spring.damping',
    'Damping ratio',
    `${zeta.toFixed(2)} (${springRegime(zeta)})`,
    SPRING_PATHS,
  ))

  // The coherence finding, measured against the set itself. Skipped when the
  // slowest duration is zero or missing: there is no ratio to form, and inventing
  // an absolute fallback here would smuggle back the arbitrary bar this check
  // exists to avoid. The Nielsen note below still covers that case.
  const slowest = num(state?.duration?.slower)
  if (slowest !== null && slowest > 0 && Number.isFinite(settle)) {
    const ratio = (settle * 1000) / slowest
    if (ratio >= THRESHOLDS.springSettleRatio) {
      report.findings.push(entry(
        'spring.disproportionate',
        'finding',
        [...SPRING_PATHS, 'duration.slower'],
        `The spring settles in about ${formatSeconds(settle)}, roughly ${Math.round(ratio)}x the set's slowest duration (${slowest}ms). Each spring value is inside its own range; together they run on a tempo the rest of the set does not share.`,
      ))
    }
  }

  // Perception, not coherence: a spring still moving after the reference has
  // outlasted the interaction that triggered it, however the rest of the set is
  // timed. A note, because a user may want exactly that.
  if (settle * 1000 > NIELSEN_RESPONSE_MS) {
    report.findings.push(entry(
      'spring.settle',
      'note',
      SPRING_PATHS,
      `The spring is still moving ${formatSeconds(settle)} after it starts, past the ${NIELSEN_RESPONSE_MS}ms response reference.`,
    ))
  }

  // Reported separately from settle time because they are different failures. A
  // light, stiff, underdamped spring can arrive quickly and still overshoot hugely
  // on the way; an overdamped one can crawl in without ever crossing the target.
  if (overshoot >= THRESHOLDS.springOvershootNote) {
    report.findings.push(entry(
      'spring.overshoot',
      'note',
      SPRING_PATHS,
      `The spring overshoots about ${Math.round(overshoot * 100)}% past rest (damping ratio ${zeta.toFixed(2)}).`,
    ))
  }
}

// ─── Interaction budget ───────────────────────────────────────────────────────
// The slowest composition the set permits, which is the longest a user of the
// resulting system can be asked to wait for one thing to finish. Reported as the
// worst case the set ALLOWS, not as something a component performs: nothing
// requires delay.long to pair with duration.slower, and the message says so.
//
// Measurement only. Nielsen's number rides along as the reference, and there is
// no second bar above it: how slow a design language wants to be is the author's
// call, and this tool's job is to make sure they know the number, not to overrule
// them on it.
//
// The duration scalar is deliberately not applied. It multiplies durations in
// principle (effective = base × scalar), but DurationVisualizer is its only
// consumer, so folding it in here would describe motion that nothing actually
// performs. See docs/decisions/duration-scalar-2026-07-21.md.
function checkInteractionBudget(state, report) {
  const delay = num(state?.delay?.long)
  const duration = num(state?.duration?.slower)
  if (delay === null || duration === null) return

  const total = delay + duration
  report.measurements.push(measure(
    'budget.interaction',
    'Slowest composition',
    `${total}ms`,
    ['delay.long', 'duration.slower'],
    nielsenReference(total),
  ))
}

// ─── auditTokens ──────────────────────────────────────────────────────────────
// The one entry point. Takes a Token Lab state object (the shape INITIAL_STATE
// defines and importTokens returns) and returns the report in two halves.
//
// `findings` is what needs attention: the set contradicting itself, or going slow
// past any argument. An empty array is the good outcome and the common one.
//
// `measurements` is what the set DOES, reported whether or not anything is wrong
// with it, with the industry number beside it where one exists. This half is
// always populated for a complete state, and it is why the output is a report the
// user can read rather than a pass/fail they can only obey.
//
// Both arrive in a stable order (duration, delay, scale, spring, budget) so a
// panel does not reshuffle rows between renders and a test can read straight
// through the array.
//
// `counts` is precomputed because those two numbers are what a summary line
// wants, and recomputing them on every render of a panel would be the caller
// doing this module's arithmetic.
export function auditTokens(state) {
  const report = { findings: [], measurements: [] }

  checkLadder(state?.duration, 'duration', ['fast', 'base', 'slow', 'slower'], 'ms', report)
  checkLadder(state?.delay, 'delay', ['short', 'medium', 'long'], 'ms', report)
  checkScale(state, report)
  checkSpring(state, report)
  checkInteractionBudget(state, report)

  return {
    ...report,
    counts: {
      finding: report.findings.filter(f => f.severity === 'finding').length,
      note: report.findings.filter(f => f.severity === 'note').length,
    },
  }
}

// ─── auditToMarkdown ──────────────────────────────────────────────────────────
// The report as a document. A fifth formatter in the same family as toCssVars,
// toDtcgJson, toFlatJson, and toFramerMotion: a pure function of state that
// serializes one view of it, so there is no second source of truth to drift.
// It takes state rather than an audit result for exactly that reason. Handing it
// both would let a caller pass a result computed from different values than the
// token table it prints.
//
// Markdown rather than plain text because a .md file already reads as plain text
// in any editor, while the reverse is not true: the tables survive a paste into a
// pull request, an issue, or a design doc, which is where a report like this
// actually goes. A .txt variant would be this function with the pipes stripped.
//
// `generatedAt` is a parameter and not a Date.now() call inside the function.
// Reading the clock here would make the output untestable (every snapshot would
// differ) and make a pure formatter impure for one line of prose. The caller
// knows what time it is; this function knows how to lay out a report.

// Units by family, so the token table prints 200ms and 0.95 rather than both bare.
const FAMILY_UNITS = { duration: 'ms', delay: 'ms', scale: '', spring: '' }

function markdownRows(rows) {
  return rows.map(cells => `| ${cells.join(' | ')} |`).join('\n')
}

function referenceCell(reference) {
  if (!reference) return 'none'
  const base = `${reference.display} (${reference.label})`
  return reference.exceeded ? `${base}, exceeded` : base
}

function findingLines(entries) {
  return entries.map(f => `- **${f.paths.join(', ')}**: ${f.message}`).join('\n')
}

function tokenTable(state) {
  const sections = []
  for (const family of ['duration', 'delay', 'scale', 'spring']) {
    const group = state?.[family]
    if (!group || typeof group !== 'object') continue
    const unit = FAMILY_UNITS[family]
    const rows = Object.entries(group).map(([key, value]) => [key, `${value}${unit}`])
    if (!rows.length) continue
    sections.push([
      `### ${family}`,
      '',
      markdownRows([['Token', 'Value'], ['---', '---'], ...rows]),
      '',
    ].join('\n'))
  }

  // easing is listed but not audited, so it prints as the record of what the set
  // carried rather than as something the report has an opinion about.
  const easing = state?.easing
  if (easing && typeof easing === 'object') {
    const rows = Object.entries(easing).map(([slot, value]) => [
      slot,
      Array.isArray(value) ? `cubic-bezier(${value.join(', ')})` : value,
    ])
    if (rows.length) {
      sections.push([
        '### easing (not audited)',
        '',
        markdownRows([['Slot', 'Curve'], ['---', '---'], ...rows]),
        '',
      ].join('\n'))
    }
  }

  if (num(state?.scalar) !== null) {
    sections.push(`### scalar\n\n${state.scalar}\n`)
  }

  return sections.join('\n')
}

export function auditToMarkdown(state, { title = 'Motion token audit', generatedAt = null, presetLabel = null } = {}) {
  const { findings, measurements, counts } = auditTokens(state)
  const problems = findings.filter(f => f.severity === 'finding')
  const notes = findings.filter(f => f.severity === 'note')

  const out = [`# ${title}`, '']

  const subtitle = []
  if (presetLabel) subtitle.push(presetLabel)
  if (generatedAt) subtitle.push(generatedAt)
  if (subtitle.length) out.push(subtitle.join(' · '), '')

  out.push(
    counts.finding === 0
      ? 'Nothing in this set contradicts itself.'
      : `${counts.finding} ${counts.finding === 1 ? 'finding' : 'findings'}, ${counts.note} ${counts.note === 1 ? 'note' : 'notes'}.`,
    '',
  )

  if (problems.length) out.push('## Findings', '', findingLines(problems), '')
  if (notes.length) out.push('## Notes', '', findingLines(notes), '')

  if (measurements.length) {
    out.push(
      '## Measurements',
      '',
      markdownRows([
        ['Measure', 'Value', 'Reference'],
        ['---', '---', '---'],
        ...measurements.map(m => [m.label, m.display, referenceCell(m.reference)]),
      ]),
      '',
    )
  }

  const tokens = tokenTable(state)
  if (tokens) out.push('## Tokens audited', '', tokens)

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}
