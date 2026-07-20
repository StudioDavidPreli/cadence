// The Token Lab guide. Shown in the demo area when the Token Lab section is
// opened in the nav (destination === TOKEN_LAB_GUIDE), and reachable again from
// the Overview nav leaf. It is static, scrollable copy: a how-to for the tool
// plus an FAQ. No token reads, no animation state of its own. The DemoArea
// crossfade carries it in from the hero, so this component renders content only.
//
// Copy is drafted against docs/voice/voice-analysis.md (register-shifting
// section). Em-dash count: zero.

import { TokenLabTitle } from './TokenLabTitle'
import styles from './TokenLabGuide.module.css'

export function TokenLabGuide() {
  return (
    <article className={styles.guide}>
      <TokenLabTitle />
      <p className={styles.lede}>
        Token Lab is the editor. You change a value that defines motion, and every
        component on the right answers at once. Nothing here is a recording. The
        demos read the same tokens a real interface would.
      </p>

      <section className={styles.section}>
        <h3 className={styles.heading}>The loop</h3>
        <p className={styles.body}>
          Pick a category to see its components, then move a control. Duration,
          easing, delay, and scale each map to a CSS custom property. The component
          reads that property through the token layer and re-renders, so the change
          you make is the change an engineer ships.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>The controls</h3>
        <p className={styles.body}>
          Four families: duration (how long), easing (the shape of the change),
          delay (the wait before it starts), and scale (how far it travels). Each
          control sits at a named step, fast through slower, subtle through
          expressive, so a value has a name before it has a number. A fifth
          section, Spring, is a real physics spring, and it works differently
          enough to earn its own note below.
        </p>
        <p className={styles.body}>
          Constrained mode holds each control to the range the system intends.
          Explore mode opens the full 50 to 2000 ms range. Constrained teaches
          correct usage. Explore shows that a system organizes motion rather than
          fences it in. The toggle sits at the top of each section.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>The curve graph</h3>
        <p className={styles.body}>
          Easing is a cubic-bezier curve, and the graph draws it. Drag the two
          handles to bend the curve. The first and last points stay fixed in the
          corners, the way CSS fixes them: the start at (0,0), the end at (1,1).
          Only the two middle points move.
        </p>
        <p className={styles.body}>
          The four numbers under the graph are the curve. They update as you drag,
          so the value you feel is the value you would write. Three slots hold
          separate curves, Standard, Enter, and Exit, and the tab strip above the
          graph chooses which one the graph reads and writes. Overshoot and Linear
          load as presets. A named curve is a shared word between a designer and an
          engineer, where four loose numbers are not.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>The spring</h3>
        <p className={styles.body}>
          The overshoot curve is a bezier: it fakes a spring on a fixed clock. A
          real spring has no duration. Stiffness, damping, and mass define it, and
          the settle time falls out of those three. The Spring section holds the
          three sliders, and the graph below them draws the settle curve they make:
          the value rising, overshooting the target, and coming to rest. Drag a
          slider and the curve redraws.
        </p>
        <p className={styles.body}>
          Three demos carry a spring toggle, the coil icon to the left of the code
          button: Button, Card, and Toggle. Flip it and that demo trades the
          overshoot bezier for the real spring in place, on the same component, so
          you can feel the difference the bezier only imitates. The icon turns the
          accent color while it is on. Nothing ships on the spring by default. The
          toggle is a comparison, not a change.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Presets</h3>
        <p className={styles.body}>
          The built-in presets load a full token set at once. Save your own from
          the current state and load it back later. Reset returns every control to
          the system default. The reset is part of the lesson: a system has a
          defined place to return to, not only a place to go.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Export and import</h3>
        <p className={styles.body}>
          Export the live token set as a file an engineer's pipeline reads. JSON
          comes in two shapes: the W3C Design Tokens (DTCG) format that Style
          Dictionary and Tokens Studio consume, and a flat JSON that mirrors the
          CSS variable names. CSS exports a drop-in <code>:root</code> block.
        </p>
        <p className={styles.body}>
          Import reads a JSON file back in. It flips Token Lab to Explore so an
          out-of-range value can sit on its slider, then reports every adjustment
          it made: values clamped to range, tokens filled from the default, curves
          that loaded outside the graph's reach. A clean round trip reports nothing.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>The code view</h3>
        <p className={styles.body}>
          Every demo carries a <code>&lt;/&gt;</code> toggle. It shows the real
          transition block the component runs, reading through the token layer, so
          there is no gap between what you see and what the code does. The active
          value highlights as you edit it. A value tagged <code>(fixed)</code> is a
          reference token no slider can move, like <code>ease.linear</code>. They are
          anchors. A slider that could rename them would erase the shared word they
          stand for.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>How the animations are built</h3>
        <p className={styles.body}>
          The principle animations are Rive files. Each one mounts inside a single
          wrapper that owns the canvas, so the canvas sets up and tears down
          cleanly as you move between principles. The file carries its own hitboxes
          and play triggers. You click the artwork directly. React renders no
          buttons and calls no play methods.
        </p>
        <p className={styles.body}>
          React's one job is the theme. Each file holds three view model instances,
          Light, Dark, and Contrast, and the stroke and fill colors live inside
          Rive, not in the stylesheet. Light, dark, and high-contrast light each
          bind one of these instances. High-contrast dark reuses the Contrast
          instance, and React flips its stroke and fill at runtime, so one set of
          artwork serves both high-contrast modes. Switch the mode and the canvas
          repaints in the new palette. The display mode you choose in the top bar
          reaches all the way into the artwork.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Questions</h3>

        <p className={styles.question}>Why does one value in the code view never move?</p>
        <p className={styles.body}>
          It is a fixed reference token, marked <code>(fixed)</code>. The editable
          tokens are the ones a slider owns. The fixed ones, <code>ease.linear</code>{' '}
          and <code>delay.none</code>, are named constants the rest of the system
          measures against. <code>ease.overshoot</code> sits between the two: it reads
          as a fixed anchor in constrained mode, but Explore mode gives it a control,
          and the visualizer the vertical room its overshoot needs, so you can watch
          it drive the components that use it. Full detail lives in the token
          architecture doc.
        </p>

        <p className={styles.question}>What does the green mean?</p>
        <p className={styles.body}>
          Green is the accent, and it means active: connected, currently affecting
          the system. A handle turns green as you drag it. A demo signals green when
          the token you are touching reaches it. Same color, same meaning, in both
          places.
        </p>

        <p className={styles.question}>Why does the spinner reset when I change its duration?</p>
        <p className={styles.body}>
          Framer Motion does not restart an infinite animation when its timing
          changes, so the component remounts to pick up the new value. In a tool,
          the brief reset is the confirmation that the new duration is live. A
          shipped interface sets the value once and never sees it.
        </p>

        <p className={styles.question}>Does it respect reduced motion?</p>
        <p className={styles.body}>
          The principle demos and the navigation honor the system setting. Token
          Lab itself does not, on purpose. You came here to see motion, so
          flattening it would defeat the tool.
        </p>
      </section>
    </article>
  )
}
