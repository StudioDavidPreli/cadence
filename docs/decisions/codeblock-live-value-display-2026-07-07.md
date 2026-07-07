# Token Lab code view: float precision and long-line display (2026-07-07)

Status: RESOLVED. Two display bugs in the Token Lab demo code blocks (`CodeBlock`,
the `</>` view under each demo). Both confirmed reading correctly by David.

The two concerns were scoped and proposed before any edit, then landed one atomic
commit each.

---

## Concern A — float precision in the live comments

`CodeBlock` appends each `tokens.<group>.<key>` read's current value as a live
comment. The single formatter is `resolveTokenDisplay` in
`src/components/CodeBlock/resolveToken.js` (called twice from `index.jsx` — once for
the flash signature, once for the rendered comment — but the same function, so there
is one call site to fix).

Its three branches were inconsistent:

- `duration` / `delay` — already `` `${+value.toFixed(3)}s` `` (capped at 3 places,
  unary-plus trims trailing zeros). Correct; could not tail.
- `ease` — `` `[${value.join(', ')}]` `` — **raw**.
- `scale` — `` `${value}` `` — **raw**.

The raw branches printed the full IEEE-754 tail whenever a slider or bezier handle
was dragged to a computed value (e.g. `1.0299999999999998`). The default token
values are clean, so the bug only showed under a drag. The original hypothesis named
the `// 0.2s` duration comments; those were already fixed — the real culprits were
`scale` and `ease`.

**Fix (`d4206d2`):** apply the same `+value.toFixed(3)` idiom to all three families.
`ease` rounds each bezier coordinate: `` `[${value.map(n => +n.toFixed(3)).join(', ')}]` ``.
Three places, not four, to match the sibling `duration`/`delay` branch and keep the
one helper internally consistent. (The tool's other bezier readout at
`TokenLab/index.jsx` uses `toFixed(2)`; the two-vs-three split predates this and was
left alone.) Rounding the display also stabilizes the flash `sig`, so float jitter
can no longer trigger a spurious value flash.

---

## Concern B — long lines running past the block's right edge

Originally each rendered row was the source line plus a trailing resolved-value
comment on the same line. A value ticking up during a drag pushed the line past the
block's right edge, where it was clipped (the `.pre` had `overflow-x: auto` but the
block-level `.line` divs shrank to the container and never widened it, so nothing
scrolled).

The fix came in two moves, because the trailing comment was both a readability issue
and the main source of overflow.

### B1 — values on their own row (`9a9269b`)

`CodeBlock` now renders one row per source line and, when a line reads a token, a
second row directly beneath it carrying the live value, indented (from the source
line's leading whitespace) to sit under the code it annotates. `flatMap` emits one
or two rows per line. Source lines keep their real width, so a value can no longer
extend the line it belongs to. This also reads better: the value annotates the
property under it, like a real code comment.

### B2 — wrap, not scroll (`c16402b`, superseding a failed scroll attempt `f25f637`)

A few lines are long on their own (NotificationBadge's
`ease: [tokens.ease.spring, tokens.ease.linear, tokens.ease.standard],`) or produce
a long multi-read value row, so B1 alone did not remove all overflow.

First attempt (`f25f637`): horizontal scroll, via `.line { width: max-content }` so
each line sizes to its content and `.pre`'s `overflow-x: auto` engages. **This failed
in a specific, instructive way.** The code view mounts inside `DemoWrapper`'s
`height: 0 → auto` reveal (a `motion.div` with `overflow: hidden`). The `.pre`'s
horizontal-scrollbar decision is made once as it first lays out inside that animating
wrapper, and then goes stale: the browser only re-runs the decision on a genuine
reflow. So the scrollbar appeared on the **first** code block opened on a page (whose
open reflows the whole page — the page grows, a scrollbar/layout shift lands) and on
any block after a **window resize** or a token **update**, but never on a plain
subsequent open. An `onAnimationComplete` handler that toggled `overflow-x` and read
`scrollWidth` to force the reflow did not reliably beat the animation's layout timing.

Root reading: horizontal scroll needs the line to overflow the `.pre`, and that
overflow computation is at the mercy of the reveal animation. The demo grid item
(`.demoArea`) already carries `min-width: 0` and the column is `minmax(420px, 1fr)`,
so the column-level constraint is fine; the fragility is purely the scrollbar
decision inside the height animation.

Decision (David chose, after the second failure): **wrap instead of scroll.**
`.line { white-space: pre-wrap; overflow-wrap: break-word }`, drop `width:
max-content`. Pure layout, no dependence on the reveal's timing, deterministic on
every open. The reason scroll was originally preferred — a long trailing comment
would wrap and push the source indent to the left — no longer applied once B1 moved
values to their own rows, so lines stay short and rarely wrap. Tradeoff accepted: the
wrapped remainder of a long line returns to the left edge rather than the source
indent, fine for these shallowly-nested snippets. `.pre`'s `overflow-x: auto` is left
in place as a harmless safety net for any unbreakable string.

---

## Commits

- `d4206d2` — round `scale` and `ease` to 3 places in the live comments (Concern A)
- `9a9269b` — live values on their own row beneath each line (B1)
- `f25f637` — first B2 attempt: scroll via `width: max-content` (**superseded**, its
  `.line` rule is overridden by `c16402b`; left in history as the honest record of
  the iteration)
- `c16402b` — wrap replaces scroll (B2, final)

## Verification

- `npx vitest run src/components/CodeBlock` passes (41 tests, the `resolveToken`
  drift guard) after the precision change.
- Long lines wrap on every code block regardless of open order; no clipping, no
  window-resize dependence. Confirmed by David.
- Dragging the scale slider and a bezier handle shows rounded values (`0.95`,
  `[0.4, 0, 0.2, 1]`) with no float tails. Confirmed by David.
