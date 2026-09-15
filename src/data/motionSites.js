// The motion site table: what each demo component's moments are called.
//
// `tokenConsumption.js` answers "which components read duration.fast". This
// answers the question underneath it: WHERE in a component that read happens.
// Button reads duration.fast twice, once for the press and once for the
// release, and until this table existed the system had no way to say so. An
// override is per token path, so the tool could only say "Button's
// duration.fast", which forces the press and the release to share a value.
// That is too narrow, and naming the sites is the first half of fixing it
// (David, 2026-09-09; the tracker's "Per-site motion values" row).
//
// ── Why a table and not a mechanism ──────────────────────────────────────────
// This commits to nothing about how a value might later bind to a site. Three
// designs are open (a semantic token tier, site-keyed overrides, or sites as a
// read-only structure with new primitives where a site genuinely needs one),
// and all three need this table first. So do two checks that are already
// parked: the audit's shared-literal row, whose identity is exactly
// (component, site, path), and choreography coherence, which cannot compare
// staggers across consumers without knowing what the consumers' moments are
// called.
//
// ── What a site is ──────────────────────────────────────────────────────────
// A named moment at which the component runs a transition. Its tokens are
// every editable token read to produce that moment: the timing values in the
// transition and the animated values in the target.
//
// Two conventions, both inherited from the consumption map so the two tables
// can be compared:
//
// 1. A site lists the union over its branches. NavItem's label runs `enter`
//    going active and `exit` going inactive; ProgressBar runs `standard` when
//    the value climbs and `exit` when it falls; a spring-capable demo runs
//    either a bezier or the real spring depending on a switch. Every one of
//    those is a read at that site, so every one is listed, the same way the
//    consumption map lists a component under a token its source reads on a
//    branch the demo never triggers.
//
// 2. Token paths are in the CONTROL-layer spelling the consumption map uses
//    (`easing.standard`), not the runtime spelling components read
//    (`tokens.ease.standard`). The two differ only in that one word. The
//    off-system deviation path uses the runtime spelling, so anything joining
//    this table to a deviation crosses that seam.
//
// Non-editable reads are listed too, marked in `fixed`: `ease.linear` has no
// slider and `delay.none` is a constant, so neither appears in the consumption
// map, and the cross-check below ignores them. They are recorded because a
// timing question about Spinner or Toast that could not see `linear` would be
// answering about a different component.
//
// ── What is verified, and what is judgment ──────────────────────────────────
// `motionSites.test.js` proves the UNION: every token this table attributes to
// a component must equal that component's row in the consumption map, both
// directions. A site invented out of nothing, a token attributed to a component
// that never reads it, or a read dropped in either file fails there.
//
// Which site a token belongs to is authored judgment, and no test can check it.
// It was read off each component's source on 2026-09-13, not off the code-view
// snippets, which are trimmed by hand and can drift.

export const MOTION_SITES = {
  Button: [
    { name: 'press', moment: 'The tap compresses the button toward pressBase: the squash.',
      tokens: ['duration.fast', 'easing.standard', 'scale.pressBase'] },
    { name: 'release', moment: 'The tap ends and the button returns past rest: the stretch. The demo switch chooses the overshoot bezier or the real spring.',
      tokens: ['duration.fast', 'easing.overshoot', 'spring.stiffness', 'spring.damping', 'spring.mass'] },
  ],

  Card: [
    { name: 'select', moment: 'The card is chosen and lifts. Reads as expressive: overshoot, or the spring when switched.',
      tokens: ['duration.base', 'easing.overshoot', 'scale.lift', 'spring.stiffness', 'spring.damping', 'spring.mass'] },
    { name: 'deselect', moment: 'The card returns to rest. Reads as neutral, so it is always standard.',
      tokens: ['duration.base', 'easing.standard'] },
    { name: 'dim', moment: 'Another card was chosen and this one recedes. It has no transition of its own: the timing comes from deselect and only the target changes.',
      tokens: ['scale.pressSubtle'], timingFrom: 'deselect' },
  ],

  NavItem: [
    { name: 'activate', moment: 'The label nudges toward its marker on arrival, decelerating in.',
      tokens: ['duration.fast', 'easing.enter'] },
    { name: 'deactivate', moment: 'The label returns as the item is left, accelerating out.',
      tokens: ['duration.fast', 'easing.exit'] },
  ],

  Toggle: [
    { name: 'flip', moment: 'The thumb slides between slots. The switch chooses the overshoot bezier or the real spring.',
      tokens: ['duration.fast', 'easing.overshoot', 'spring.stiffness', 'spring.damping', 'spring.mass'] },
  ],

  Spring: [
    { name: 'travel', moment: 'The dot crosses and settles. No duration and no ease: stiffness, damping and mass decide both.',
      tokens: ['spring.stiffness', 'spring.damping', 'spring.mass'] },
  ],

  Spinner: [
    { name: 'spin', moment: 'One continuous rotation, repeating. Linear holds the speed constant so no eased pulse marks each turn.',
      tokens: ['duration.slower'], fixed: ['easing.linear'] },
  ],

  'Notification Badge': [
    { name: 'pop', moment: 'The count changes and the badge compresses, climbs past rest, holds, then settles. Three curves across four keyframes.',
      tokens: ['duration.slow', 'easing.overshoot', 'easing.standard', 'scale.pressExpressive'], fixed: ['easing.linear'] },
  ],

  ProgressBar: [
    { name: 'advance', moment: 'The fill grows toward a higher value, eased at both ends.',
      tokens: ['duration.slow', 'easing.standard'] },
    { name: 'retreat', moment: 'The fill falls back. Losing ground carries a different meaning, so it takes the exit curve.',
      tokens: ['duration.slow', 'easing.exit'] },
    { name: 'indeterminate', moment: 'The unknown-progress sweep, which holds a constant speed because it is not reporting distance.',
      tokens: [], fixed: ['easing.linear'] },
  ],

  Stepper: [
    { name: 'press', moment: 'Next is pressed and the control compresses.',
      tokens: ['duration.fast', 'easing.standard', 'scale.pressBase'] },
    { name: 'step', moment: 'A step completes and its connector fills.',
      tokens: ['duration.slow', 'easing.standard'], fixed: ['delay.none'] },
    { name: 'stagger', moment: 'The gaps between the cascade beats, all measured from the click, so the spacing stays editable.',
      tokens: ['delay.short', 'delay.medium'] },
    // Was 'ring' until 2026-09-14. Nothing called a ring reads a token: the
    // active-step ring is a CSS border-color transition on chrome timing. These
    // two tokens belong to the description paragraph at beat 3.
    { name: 'description', moment: 'The new step\'s description arrives, the last beat of the cascade, after the checkmark and the connector have resolved.',
      tokens: ['duration.fast', 'easing.enter'] },
    { name: 'completion', moment: 'The final message, held back by the longest delay so the climax breathes.',
      tokens: ['duration.slower', 'easing.enter', 'delay.long'] },
    { name: 'completion-exit', moment: 'The message leaves on a reset.',
      tokens: ['duration.fast', 'easing.exit'] },
    { name: 'reset', moment: 'Reset is pressed. The quick-start curve reads as decisive rather than casual.',
      tokens: ['duration.fast', 'easing.exit', 'scale.pressBase'] },
  ],

  Tooltip: [
    { name: 'enter', moment: 'The bubble travels an arc on three keyframes per axis, so the midpoint sits off the straight line.',
      tokens: ['duration.base', 'easing.enter'] },
    { name: 'exit', moment: 'It leaves faster than it arrived.',
      tokens: ['duration.fast', 'easing.exit'] },
  ],

  Dropdown: [
    { name: 'open', moment: 'The menu drops a short distance. Functional UI, so it stays on the fastest duration.',
      tokens: ['duration.fast', 'easing.enter'] },
    { name: 'close', moment: 'It lifts back out the same distance.',
      tokens: ['duration.fast', 'easing.exit'] },
  ],

  Carousel: [
    { name: 'snap', moment: 'The track settles on the next slide. The dot indicator shares this exact transition object, so it springs when the snap does.',
      tokens: ['duration.slow', 'easing.overshoot', 'spring.stiffness', 'spring.damping', 'spring.mass'] },
    { name: 'focus', moment: 'The slide that becomes current scales up slightly.',
      tokens: ['duration.fast', 'easing.standard', 'scale.lift'] },
  ],

  Reorder: [
    { name: 'lift', moment: 'A row is held and rises by the system\'s one named lift.',
      tokens: ['duration.fast', 'easing.standard', 'scale.lift'] },
    { name: 'move', moment: 'Rows make room, and every keyboard move. No hand to follow, so the motion is timed.',
      tokens: ['duration.base', 'easing.standard'] },
    { name: 'drop', moment: 'The row lands from the hand\'s velocity, which only a spring can take. The bezier stand-in gets the same call and ignores the velocity.',
      tokens: ['duration.base', 'easing.overshoot', 'spring.stiffness', 'spring.damping', 'spring.mass'] },
    { name: 'cancel', moment: 'Escape returns the list on the exit curve.',
      tokens: ['duration.fast', 'easing.exit'] },
  ],

  Modal: [
    { name: 'enter', moment: 'Backdrop fades and the panel rises from 0.96 as it fades in, both on the slow duration.',
      tokens: ['duration.slow', 'easing.enter'] },
    { name: 'exit', moment: 'Both leave on the shorter duration, so closing feels inevitable rather than a slow rewind.',
      tokens: ['duration.base', 'easing.exit'] },
  ],

  Drawer: [
    { name: 'backdrop', moment: 'The ambient fade behind the panel, faster than the panel itself.',
      tokens: ['duration.base', 'easing.enter'] },
    { name: 'panel-enter', moment: 'The panel rises and settles. Overshoot fakes a spring with keyframes; the spring runs the real physics to a single target.',
      tokens: ['duration.slow', 'duration.base', 'easing.enter', 'spring.stiffness', 'spring.damping', 'spring.mass'] },
    { name: 'panel-exit', moment: 'The panel dips, then drops.',
      tokens: ['duration.slow', 'easing.exit'] },
  ],

  'React Clock': [
    { name: 'rain', moment: 'One press starts two channels together. The rain scrub holds a steady speed into the loop handoff.',
      tokens: ['duration.fast'], fixed: ['easing.linear'] },
    { name: 'grow', moment: 'The growth channel, running alongside the rain on its own duration and ease.',
      tokens: ['duration.slower', 'easing.enter'] },
    { name: 'wait', moment: 'The pause before the flowers, the one beat that is a delay rather than a duration.',
      tokens: ['delay.long'] },
    { name: 'flowers', moment: 'The last beat of the entry, after the wait.',
      tokens: ['duration.slow', 'easing.standard'] },
    { name: 'wilt', moment: 'The three authored die timelines run as one beat, still faster than the entry.',
      tokens: ['duration.slow', 'easing.exit'] },
    { name: 'scene-scale', moment: 'The scene group scales as one, written on change rather than in the frame loop. The file speaks Rive percent; the token stays unitless.',
      tokens: ['scale.pressBase'] },
  ],

  'Rive Clock': [
    { name: 'follow', moment: 'The colour plates chase the pointer on exponential smoothing. The duration is the time constant and the delay staggers the plates, so the fringe blooms while moving.',
      tokens: ['duration.base', 'delay.short', 'scale.pressExpressive'] },
    { name: 'homecoming', moment: 'The pointer leaves and the plates tween back to zero, slow enough that the bezier is perceivable as a bezier.',
      tokens: ['duration.slow', 'easing.standard', 'delay.short'] },
  ],

  Toast: [
    { name: 'arrive', moment: 'Each toast fades in. Nothing mounts: three exist for the life of the component and a press runs them through one timeline.',
      tokens: ['duration.base', 'easing.enter'] },
    { name: 'stagger-in', moment: 'The gap between arrivals, tight because three toasts are one event.',
      tokens: ['delay.short'] },
    { name: 'hold', moment: 'The reading hold, built from the two longest names the system has because either alone is nobody\'s reading time.',
      tokens: ['duration.slower', 'delay.long'], fixed: ['easing.linear'] },
    { name: 'leave', moment: 'Each toast fades out again, on the same duration it arrived on.',
      tokens: ['duration.base', 'easing.exit'] },
    { name: 'stagger-out', moment: 'A looser cascade leaving than arriving: one event arrives, three things leave.',
      tokens: ['delay.medium'] },
    { name: 'press', moment: 'The trigger compresses.',
      tokens: ['duration.fast', 'easing.standard', 'scale.pressBase'] },
  ],

  Skeleton: [
    { name: 'shimmer', moment: 'The placeholder pulse takes the slowest interval the system has. A placeholder that hurries reads as progress it cannot promise.',
      tokens: ['duration.slower', 'easing.standard', 'delay.short'] },
    { name: 'reveal', moment: 'The content arrives on one of the shortest. The distance between the two is what makes the swap read as an answer rather than another load stage.',
      tokens: ['duration.base', 'easing.enter', 'delay.short'] },
    { name: 'placeholder-exit', moment: 'The placeholder rows leave as the content lands.',
      tokens: ['duration.fast', 'easing.exit'] },
    { name: 'press', moment: 'The trigger compresses.',
      tokens: ['duration.fast', 'easing.standard', 'scale.pressBase'] },
  ],

  Accordion: [
    { name: 'hover', moment: 'The row lifts under the pointer.',
      tokens: ['scale.lift'] },
    { name: 'press', moment: 'The row compresses on the subtle press scale: the same 0.95 that is crisp on a 90px button is a lurch on a 280px row.',
      tokens: ['scale.pressSubtle'] },
    { name: 'chevron', moment: 'The marker rotates rather than scaling, because a second press scale nested inside the row\'s would compound the transforms.',
      tokens: ['duration.base', 'easing.standard'] },
    { name: 'open', moment: 'The panel expands and its content arrives.',
      tokens: ['duration.base', 'easing.enter', 'delay.short'] },
    { name: 'close', moment: 'The panel collapses.',
      tokens: ['duration.fast', 'easing.exit'] },
  ],

  'Async Button': [
    { name: 'press', moment: 'The button compresses and the request goes out.',
      tokens: ['duration.fast', 'easing.standard', 'scale.pressBase'] },
    { name: 'working', moment: 'The spinner state. The interesting question is not how any one transition looks, it is how long the button sits in each state.',
      tokens: ['duration.base', 'easing.enter'] },
    { name: 'spinner-leave', moment: 'The spinner goes before the mark arrives. Swapping them on one frame reads as a glyph mutating, and working and done are not the same statement.',
      tokens: ['duration.base', 'easing.exit'] },
    { name: 'result', moment: 'The mark arrives a beat later. A confirmation may overshoot; a failure that springs in would read as pleased with itself.',
      tokens: ['duration.base', 'easing.overshoot', 'easing.standard', 'delay.medium'] },
    { name: 'hold', moment: 'The result stays long enough to register, on the same pairing Toast uses. One named way to say it beats two components inventing their own.',
      tokens: ['duration.slower', 'delay.long'] },
  ],
}

// Every component the table covers, in the consumption map's key space.
export const SITE_COMPONENTS = Object.keys(MOTION_SITES)

// The union of every token a component reads, derived rather than restated, so
// the cross-check in the test has one source and cannot be satisfied by editing
// a duplicate list.
export function tokensForComponent(component) {
  const sites = MOTION_SITES[component] ?? []
  return [...new Set(sites.flatMap(site => site.tokens))].sort()
}

// The inverse read: which components carry a site that reads this token. The
// same shape as TOKEN_COMPONENT_MAP's values, which is what makes the two
// comparable.
export function componentsForToken(path) {
  return SITE_COMPONENTS.filter(c => tokensForComponent(c).includes(path)).sort()
}

// Every (component, site) pair that reads a given token path. This is the row
// identity the deferred shared-literal audit entry needs, and the grouping
// choreography coherence would compare across.
export function sitesForToken(path) {
  const out = []
  for (const [component, sites] of Object.entries(MOTION_SITES)) {
    for (const site of sites) {
      if (site.tokens.includes(path)) out.push({ component, site: site.name })
    }
  }
  return out
}
