# Cadence

A motion design system explorer built for designers learning how animation tokens drive UI behavior.

Cadence demonstrates the relationship between design tokens and motion through three interactive tools: Token Lab, a live token editor; the Principles Library, animation principles applied to UI components, the classic 12 plus 6 extended design-engineering principles; and Motion Tiles, a pooled Rive mosaic that runs one motion vocabulary at scale.

**Built with:** React, Framer Motion, CSS Custom Properties, Vite

**Live:** https://cadence.davidpreli.com (pending first deploy)

---

## What It Does

### Token Lab
A live editor for motion design tokens: duration, easing, delay, scale. Adjusting token values updates components across the UI in real time. The relationship between token and behavior is visible and immediate. A Constrained / Explore toggle switches each control between semantically bounded ranges and the full range, so the editor teaches correct token usage without locking the user out of experimentation.

Token sets export as a downloadable file in three formats: W3C Design Tokens (DTCG), flat JSON, and a drop-in CSS `:root` block. The DTCG and flat files import back into the tool, with a report listing any value clamped, filled, or ignored. That is the bridge from a tuned token set to the artifact an engineer's pipeline consumes.

### Principles Library
Animation principles, each demonstrated through a real UI component. Each principle is interactive, isolated, and driven by the token system. The classic 12 principles of animation:

1. Squash and Stretch
2. Anticipation
3. Staging
4. Straight Ahead and Pose to Pose
5. Follow Through and Overlapping Action
6. Slow In and Slow Out
7. Arc
8. Secondary Action
9. Timing
10. Exaggeration
11. Solid Drawing
12. Appeal

Six extended design-engineering principles that bridge animation and systems thinking:

13. Systematization
14. Hierarchy of Motion
15. Economy
16. Token Fidelity
17. Reduced Motion
18. Shared Vocabulary

### Motion Tiles
A pooled mosaic of Rive tiles that runs one motion vocabulary at scale. The presets, timing, easing, and stagger that tune a single component in Token Lab drive the whole field at once. Change a preset and every tile retimes together. Drag the stagger and the change crosses the grid in a wave.

The grid is landing-gated, so its WebGL2 runtime and the tiles load only when you enter it. The per-tile Rive bindings were built with Claude Code driving the Rive editor over MCP, and the landing walks through that build.

---

## Token Architecture

Motion tokens are defined as CSS Custom Properties and consumed by Framer Motion at the component level.

```css
:root {
  /* Duration */
  --motion-duration-fast: 100ms;
  --motion-duration-base: 200ms;
  --motion-duration-slow: 400ms;
  --motion-duration-slower: 600ms;

  /* Easing */
  --motion-ease-linear: cubic-bezier(0, 0, 1, 1);
  --motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --motion-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --motion-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Delay */
  --motion-delay-none: 0ms;
  --motion-delay-short: 50ms;
  --motion-delay-medium: 100ms;
  --motion-delay-long: 200ms;

  /* Scale */
  --motion-scale-subtle: 0.98;
  --motion-scale-base: 0.95;
  --motion-scale-expressive: 0.9;
}
```

---

## Project Structure

```
cadence/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── case-study.md
│   ├── token-architecture.md
│   ├── principles/
│   │   ├── 01-squash-and-stretch.md
│   │   └── [one file per principle]
│   └── decisions/
│       └── [architecture decision records]
├── tracker/
│   └── TRACKER.md
└── src/
    ├── tokens/
    │   └── motion.css
    ├── components/
    │   ├── TokenLab/
    │   ├── MotionTiles/
    │   └── shared/
    └── principles/
        ├── SquashAndStretch/
        └── [one folder per principle]
```

---

## Running Locally

```bash
npm install
npm run dev
```

---

## Documentation

Full documentation lives in `/docs`. Architecture decisions are recorded in `/docs/decisions`. The case study is in `/docs/case-study.md`.

---

## About

Built by David Preli — motion designer and creative technologist. This project is part of a deliberate effort to work at the intersection of motion design and design engineering.

[davidpreli.com](https://davidpreli.com) | [LinkedIn](https://linkedin.com/in/davidpreli)
