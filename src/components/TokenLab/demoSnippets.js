// Source snippets for the Token Lab demo code view, keyed by demo name (the
// DemoWrapper componentName). Each is the real motion behind that demo, trimmed
// to the token-reading lines that matter. CodeBlock renders these and appends
// live resolved values for every `tokens.<group>.<key>` read.
//
// Authenticity is the whole point of the feature, so each snippet must match the
// component it documents. The drift guard in resolveToken.test.js asserts every
// token a snippet names actually exists; keep snippets in step with their
// components by hand when the motion changes.
//
// Token reads sit on their own lines so each resolves to a clean trailing
// comment. Copy emits this raw text (no resolved comments).

const Drawer = `const tokens = useMotionTokens()

// Backdrop: ambient fade, faster than the panel.
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 0.8 }}
  exit={{ opacity: 0 }}
  transition={{
    duration: tokens.duration.base,
    ease: tokens.ease.enter,
  }}
/>

// Panel: rises in and settles on enter. Overshoot fakes a
// spring with keyframes (100% -> -10% -> 0%); Spring runs the
// real physics to a single 0% target. Exit dips, then drops.
<motion.div
  initial={{ y: '100%', opacity: 0 }}
  animate={motionMode === 'spring'
    ? { y: '0%', opacity: 1 }
    : { y: ['100%', '-10%', '0%'], opacity: [0, 1, 1] }}
  transition={motionMode === 'spring'
    ? { y: { type: 'spring',
             stiffness: tokens.spring.stiffness,
             damping: tokens.spring.damping,
             mass: tokens.spring.mass },
        opacity: { duration: tokens.duration.base,
                   ease: tokens.ease.enter } }
    : { duration: tokens.duration.slow,
        times: [0, 0.7, 1],
        ease: tokens.ease.enter }}
  exit={{
    y: ['0%', '-10%', '100%'],
    opacity: [1, 1, 0],
    transition: {
      duration: tokens.duration.slow,
      times: [0, 0.2, 1],
      ease: tokens.ease.exit,
    },
  }}
/>`

const Button = `const tokens = useMotionTokens()

// Press dips the button to a smaller scale: the squash.
// The release returns it: Overshoot rides a bezier back past
// rest, Spring rides the real physics. The switch picks which.
<motion.button
  whileTap={{
    scale: tokens.scale.pressBase,
    transition: {
      duration: tokens.duration.fast,
      ease: tokens.ease.standard,
    },
  }}
  transition={motionMode === 'spring'
    ? { type: 'spring',
        stiffness: tokens.spring.stiffness,
        damping: tokens.spring.damping,
        mass: tokens.spring.mass }
    : { duration: tokens.duration.fast,
        ease: tokens.ease.overshoot }}
/>`

const Card = `const tokens = useMotionTokens()

// Selection lifts the card; clicking again returns it. In reads
// as "chosen": overshoot, or a real spring when switched. Out
// reads as "returning": always standard.
<motion.div
  animate={{ scale: isSelected ? tokens.scale.lift : 1 }}
  transition={isSelected
    ? (motionMode === 'spring'
        ? { type: 'spring',
            stiffness: tokens.spring.stiffness,
            damping: tokens.spring.damping,
            mass: tokens.spring.mass }
        : { duration: tokens.duration.base,
            ease: tokens.ease.overshoot })
    : { duration: tokens.duration.base,
        ease: tokens.ease.standard }}
/>`

const NavItem = `const tokens = useMotionTokens()

// Active nudges the label 3px toward its left-border marker.
// enter decelerates in on arrival; exit accelerates out on
// leaving. The direction of travel picks the curve.
<motion.button
  animate={{ x: isActive ? 3 : 0 }}
  transition={{
    duration: tokens.duration.fast,
    ease: isActive ? tokens.ease.enter : tokens.ease.exit,
  }}
/>`

const Toggle = `const tokens = useMotionTokens()

// The thumb slides between slots. Overshoot rides a bezier back
// past rest; Spring rides the real physics. The switch picks.
// The track color CSS transition mirrors duration.fast to sync.
<motion.span
  className={styles.thumb}
  animate={{ x: on ? THUMB_TRAVEL : 0 }}
  transition={motionMode === 'spring'
    ? { type: 'spring',
        stiffness: tokens.spring.stiffness,
        damping: tokens.spring.damping,
        mass: tokens.spring.mass }
    : { duration: tokens.duration.fast,
        ease: tokens.ease.overshoot }}
/>`

const Spring = `const tokens = useMotionTokens()

// A real spring: no duration, no ease. Stiffness, damping, and
// mass decide how the dot crosses and when it settles, so
// switching presets retimes it with no timing value changing
// hands. ease.overshoot only imitates this look on a clock.
<motion.span
  className={styles.dot}
  animate={{ x: atEnd ? TRAVEL : 0 }}
  transition={{
    type: 'spring',
    stiffness: tokens.spring.stiffness,
    damping: tokens.spring.damping,
    mass: tokens.spring.mass,
  }}
/>`

const Spinner = `const tokens = useMotionTokens()

// A continuous rotation. linear holds the speed constant, so
// there is no eased pulse each turn. key remounts on a duration
// change: Framer Motion will not restart an infinite loop when
// only the transition prop updates.
<motion.div
  key={tokens.duration.slower}
  initial={{ rotate: 0 }}
  animate={{ rotate: 360 }}
  transition={{
    duration: tokens.duration.slower,
    ease: tokens.ease.linear,
    repeat: Infinity,
  }}
/>`

const NotificationBadge = `const tokens = useMotionTokens()

// The badge re-keys on the count, so this runs on every
// increment. It compresses, climbs past 1 (the 1.2 peak is a
// literal, not a token — that overshoot is the principle
// breaking its own rule), holds, then settles.
<motion.span
  key={count}
  initial={{ scale: tokens.scale.pressExpressive }}
  animate={{ scale: [tokens.scale.pressExpressive, 1.2, 1.2, 1] }}
  transition={{
    duration: tokens.duration.slow,
    times: [0, 0.3, 0.6, 1],
    ease: [tokens.ease.overshoot, tokens.ease.linear, tokens.ease.standard],
  }}
/>`

const ProgressBar = `const tokens = useMotionTokens()

// The fill animates to the new width. Increasing uses standard
// (eased at both ends); decreasing uses exit. The direction of
// change carries a different meaning, so it gets a different curve.
<motion.div
  animate={{ width: \`\${value}%\` }}
  transition={{
    duration: tokens.duration.slow,
    ease: isIncreasing ? tokens.ease.standard : tokens.ease.exit,
  }}
/>`

const Stepper = `const tokens = useMotionTokens()

// The cascade is built from cumulative delays, all measured from
// the click. Each beat waits on the one before it plus a delay
// token, so the gaps between steps stay editable.
const beat1 = tokens.duration.slow
const beat2 = beat1 + tokens.delay.short
const beat3 = beat2 + tokens.delay.medium
const completion = beat1 + tokens.delay.long

// A step's connector fills once that step completes.
<motion.div
  animate={{ scaleX: isStepCompleted ? 1 : 0 }}
  transition={{
    duration: tokens.duration.slow,
    ease: tokens.ease.standard,
  }}
/>`

const Tooltip = `const tokens = useMotionTokens()

// The bubble travels along an arc: three keyframes per axis, so
// the midpoint sits off the straight line between start and end.
// enter brings it in on duration.base; exit takes it out faster.
<motion.div
  initial={{ opacity: 0, x: 24, y: 16 }}
  animate={{ opacity: [0, 1, 1], x: [24, 8, 0], y: [16, -10, 0] }}
  transition={{
    duration: tokens.duration.base,
    times: [0, 0.6, 1],
    ease: tokens.ease.enter,
  }}
  exit={{
    opacity: 0, x: 12, y: 8,
    transition: { duration: tokens.duration.fast, ease: tokens.ease.exit },
  }}
/>`

const Dropdown = `const tokens = useMotionTokens()

// The menu drops in and lifts back out a short distance.
// duration.fast keeps functional UI snappy. enter on the way in,
// exit on the way out. The chevron rotates via a CSS transition,
// not Framer Motion.
<motion.ul
  initial={{ opacity: 0, y: -6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: tokens.duration.fast, ease: tokens.ease.enter }}
  exit={{
    opacity: 0, y: -6,
    transition: { duration: tokens.duration.fast, ease: tokens.ease.exit },
  }}
/>`

const Carousel = `const tokens = useMotionTokens()

// The snap animates a MotionValue directly (no scope, no
// broadcast). Overshoot rides a bezier; Spring rides the real
// physics. The dot indicator shares this exact transition, so it
// springs when the snap does.
const snap = motionMode === 'spring'
  ? { type: 'spring',
      stiffness: tokens.spring.stiffness,
      damping: tokens.spring.damping,
      mass: tokens.spring.mass }
  : { duration: tokens.duration.slow,
      ease: tokens.ease.overshoot }

animate(x, index * -slideWidth, snap)

// The active dot morphs to a pill on the same transition.
<motion.span animate={{ width: isCurrent ? 20 : 8 }} transition={snap} />

// Each slide scales up slightly when it becomes current.
<motion.div
  animate={{ scale: isCurrent ? tokens.scale.lift : 1 }}
  transition={{
    duration: tokens.duration.fast,
    ease: tokens.ease.standard,
  }}
/>`

const Modal = `const tokens = useMotionTokens()

// Backdrop fades to 0.8. Panel rises from 0.96 to 1 as it fades
// in. enter on duration.slow brings both in; exit drops to
// duration.base so leaving feels inevitable, not a slow rewind.
<motion.div /* backdrop */
  initial={{ opacity: 0 }}
  animate={{ opacity: 0.8 }}
  transition={{ duration: tokens.duration.slow, ease: tokens.ease.enter }}
  exit={{
    opacity: 0,
    transition: { duration: tokens.duration.base, ease: tokens.ease.exit },
  }}
/>

<motion.div /* panel */
  initial={{ scale: 0.96, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: tokens.duration.slow, ease: tokens.ease.enter }}
  exit={{
    scale: 0.98, opacity: 0,
    transition: { duration: tokens.duration.base, ease: tokens.ease.exit },
  }}
/>`

const WaterWilt = `const tokens = useMotionTokens()

// No Framer Motion here: a rAF driver scrubs the .riv's
// timelines. Easing runs in JS, the file holds poses, and
// p += dt / duration is the whole timing model, so a slider
// drag retimes a beat mid-flight from its current progress.
const WATER_SEQUENCE = [
  // One press, two channels: rain and growth run together,
  // each on its own duration and ease. The rain scrub rides
  // linear so its speed holds steady into the loop handoff.
  { together: [
    { scrub: 'rainFallProgress',
      duration: tokens.duration.fast,
      ease: tokens.ease.linear },
    { scrub: 'growProgress',
      duration: tokens.duration.slower,
      ease: tokens.ease.enter },
  ]},
  { wait: tokens.delay.long },
  { scrub: 'flowersGrowProgress',
    duration: tokens.duration.slow,
    ease: tokens.ease.standard },
]

// Wilt: the three authored die timelines run together,
// one beat, still faster than the entry.
const WILT = {
  duration: tokens.duration.slow,
  ease: tokens.ease.exit,
}

// The scene group scales as one: a direct bind, written on
// change, outside the frame loop. The file speaks Rive's
// percent, the token stays a unitless multiplier.
sceneScale.set(tokens.scale.pressBase * 100)`

const PixelPlant = `const tokens = useMotionTokens()

// No Framer Motion here: a WebGL shader paints a pixelated copy
// of a live Rive machine, and a rAF driver moves three colour
// plates over it. Rive owns the motion; the shader paints over
// it. The plate rate ratios (blue 1, green 2/3, red 1/3) are
// geometry; the tokens shape the chase.
const amplitude = (1 - tokens.scale.pressExpressive) * GAIN

for (const plate of plates) {
  if (pointer.inside) {
    // Follow: exponential smoothing, frame-rate independent.
    // duration.base is the time constant; delay.short staggers
    // green one step behind blue and red two, so the fringe
    // blooms while moving.
    const tau = tokens.duration.base + plate.lag * tokens.delay.short
    const k = 1 - Math.exp(-dt / tau)
    plate.off += (pointer.v * amplitude * plate.rate - plate.off) * k
  } else {
    // Homecoming: a real tween back to zero over duration.slow
    // on ease.standard, so the bezier is perceivable as a bezier.
    // The same delay.short staggers the return.
    q = Math.min(1, q + dt / tokens.duration.slow)
    plate.off = plate.from * (1 - cubicBezier(...tokens.ease.standard)(q))
  }
}`

export const DEMO_SNIPPETS = {
  Drawer,
  Button,
  Card,
  NavItem,
  Toggle,
  Spring,
  Spinner,
  NotificationBadge,
  ProgressBar,
  Stepper,
  Tooltip,
  Dropdown,
  Carousel,
  Modal,
  WaterWilt,
  PixelPlant,
}
