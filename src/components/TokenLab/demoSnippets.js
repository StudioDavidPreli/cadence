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

// Panel: rises in and settles on enter; dips, then
// drops out on exit. Same duration, opposite shape.
<motion.div
  initial={{ y: '100%', opacity: 0 }}
  animate={{ y: ['100%', '-4%', '0%'], opacity: [0, 1, 1] }}
  transition={{
    duration: tokens.duration.slow,
    times: [0, 0.7, 1],
    ease: tokens.ease.enter,
  }}
  exit={{
    y: ['0%', '-4%', '100%'],
    opacity: [1, 1, 0],
    transition: {
      duration: tokens.duration.slow,
      times: [0, 0.2, 1],
      ease: tokens.ease.exit,
    },
  }}
/>`

export const DEMO_SNIPPETS = {
  Drawer,
}
