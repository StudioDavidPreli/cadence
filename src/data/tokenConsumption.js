// The token -> component consumption map. Lived inline in TokenLab until the
// style-guide work (build-order item 5, 2026-09-03) needed it without pulling
// the whole tool in: TokenLab reads it for connection highlighting, and the
// generated guide reads it to say which components consume each token. Same
// leaf-module move as principles.js and the cadence-tokens extraction: shared
// data lives below the component layer.
//
// Maps each slider's token key to the component names it affects across all tabs.
// DemoWrapper uses this to highlight or dim groups when a slider is active.
// Empty array means the token has no connected demo component anywhere in the
// tool — the "Token unused by present components." note is shown in all groups.
// Maps each editable token to the demo components that read it. DemoWrapper uses
// this to highlight (green border) the demos a slider is connected to, and to show
// the "Token unused by present components" note on the rest. For easing, each slot
// lights its own consumers when that tab is active in the visualizer.
//
// Policy: a component is listed under a token if its source reads that token
// (tokens.<group>.<key>, or the matching --motion-* CSS variable). Objective and
// greppable. ease.linear has no slider (corners only), so reads of it produce no
// entry here. Two reads are wired but not exercised by the TokenLab demo itself —
// Card's scale.pressSubtle (its dimmed branch, used by the Appeal principle) and
// Stepper's scale.pressBase — and are listed because the component consumes them even
// though this demo never triggers that path.
//
// easing.overshoot became an editable slot (unlocked in Explore mode, 2026-07-08),
// so it now carries the components that read ease.overshoot: the Button release
// (explicit since 2026-07-16; it previously fell to Framer's default spring),
// Card's select lift, Carousel's snap, the Notification Badge launch, and the
// Toggle thumb.
//
// Rebuilt 2026-06-20 against each component's actual reads in the Token Fidelity
// audit. The prior table had drifted: NavItem was under easing.standard (it reads
// enter/exit), Toggle under easing.standard + scale.pressBase (it reads
// duration.fast + ease.overshoot), Card under duration.slow (it reads base),
// and Notification Badge under easing.exit (it reads standard, not exit).
// React Clock (2026-07-18, the Embeds category's Water & Wilt demo)
// is the first canvas demo in the map. Its rows are exactly what the rAF
// driver reads (docs/briefings/waterwilt-token-vm-map.md): rain on
// fast+linear and growth on slower+enter together, flowers on slow+standard
// after delay.long, the wilt out on slow+exit. delay.short left the demo
// when rain and growth became simultaneous, and duration.base left when rain
// moved to fast and the wilt to slow (both 2026-07-18, David's reviews).
// ease.linear has no slider, so the rain scrub adds no easing row.
// scale.pressExpressive is NOT listed for React Clock: the planned plantScale bind
// was withdrawn (sceneScale covers composition scale, David's 2026-07-18 call),
// so the demo reads scale.pressBase (scene + button overlay + Button squash) and no
// other scale token.
//
// Rive Clock (2026-07-20, the Embeds category's second canvas demo, the
// pixelPlant shader embed) reads exactly what its per-plate driver reads
// (docs/briefings/pixelplant-token-map.md): duration.base is the follow time
// constant and duration.slow the homecoming length (split on David's call, so
// the two tune independently); ease.standard shapes the homecoming tween;
// delay.short staggers the three colour plates; scale.pressExpressive sets the
// aberration amplitude. It reads no other slot — the plate rate ratios and the
// blocks/gap controls are geometry, not tokens, so they add no rows.
export const TOKEN_COMPONENT_MAP = {
  'duration.fast':    ['Button', 'NavItem', 'Toggle', 'Dropdown', 'Tooltip', 'Stepper', 'Carousel', 'React Clock'],
  'duration.base':    ['Card', 'Drawer', 'Modal', 'Tooltip', 'Rive Clock'],
  'duration.slow':    ['ProgressBar', 'Stepper', 'Carousel', 'Notification Badge', 'Modal', 'Drawer', 'React Clock', 'Rive Clock'],
  'duration.slower':  ['Spinner', 'Stepper', 'React Clock'],
  'easing.standard':  ['Button', 'Card', 'ProgressBar', 'Stepper', 'Carousel', 'Notification Badge', 'React Clock', 'Rive Clock'],
  'easing.enter':     ['NavItem', 'Drawer', 'Modal', 'Tooltip', 'Stepper', 'Dropdown', 'React Clock'],
  'easing.exit':      ['NavItem', 'Drawer', 'Modal', 'Tooltip', 'Stepper', 'Dropdown', 'ProgressBar', 'React Clock'],
  'easing.overshoot': ['Button', 'Card', 'Carousel', 'Notification Badge', 'Toggle'],
  'delay.short':      ['Stepper', 'Rive Clock'],
  'delay.medium':     ['Stepper'],
  'delay.long':       ['Stepper', 'React Clock'],
  'scale.pressSubtle':     ['Card'],
  'scale.pressBase':       ['Button', 'Stepper', 'React Clock'],
  'scale.pressExpressive': ['Notification Badge', 'Rive Clock'],
  'scale.lift':            ['Card', 'Carousel'],
  // The physics-spring family. The SpringDemo always consumes it; Button, Card,
  // Toggle, Carousel, and Drawer consume it when their per-demo switch is flipped
  // to Spring. The switch is per-instance state the static map cannot read, so
  // these list every spring-capable demo: dragging a spring slider highlights the
  // components the spring can drive, whether or not each is currently switched.
  'spring.stiffness': ['Spring', 'Button', 'Card', 'Toggle', 'Carousel', 'Drawer'],
  'spring.damping':   ['Spring', 'Button', 'Card', 'Toggle', 'Carousel', 'Drawer'],
  'spring.mass':      ['Spring', 'Button', 'Card', 'Toggle', 'Carousel', 'Drawer'],
}
