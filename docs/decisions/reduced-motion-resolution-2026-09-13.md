# Reduced motion travels with the export (2026-09-13)

The fourth audit upgrade. The August record found the reduced-motion
architecture sound and built no check, which was right about Cadence and wrong
about the file Cadence hands out.

## The gap

Cadence answers reduced motion at the provider. `reduceMotion` in
`src/context/MotionTokensContext.jsx` sets every duration to 10ms and every
delay to 0, leaves easing, scale and spring alone, and flags `reducedMotion:
true` so spring consumers fall back to their timed branch. No imported value can
reach the reduced path, which is why the August audit found nothing to check.
True inside Cadence.

The provider does not travel. A downstream system receives a file of
`--cadence-*` values and no reduced-motion answer at all, and has to invent one.
The tool knows the answer and was not writing it down.

## The edge, decided before building

The audit's subject becomes the set and the resolutions the tool itself applies.
Today that is one. Theme and contrast are not motion resolutions and do not
enter (David, 2026-09-12).

And the resolution states where it stops. Scale is not flattened: at 10ms a
start scale is not perceived, so flattening it would add code and change nothing
a reader could see. The spring is not flattened either, and that one is the
interesting case. A physics spring has no duration, so collapsing durations does
nothing to it; Cadence's spring consumers read the `reducedMotion` flag and
switch to a timed branch, and a token file cannot express "switch branches". So
the exported resolution leaves the spring as authored and says so. A reader who
assumed their spring collapses and found it did not would have been misled by a
report trying to be tidy.

## One number, three readers

`REDUCED_MOTION_RESOLUTION` in `cadence-tokens`, in the file unit:

```js
{ duration: 10, delay: 0, unchanged: ['easing', 'scale', 'spring', 'scalar'] }
```

The provider divides by 1000 and flattens live tokens with it. The CSS export
writes it as a media block. The resolver document writes it as a context. Those
three used to agree by hand. `src/context/reducedMotionDrift.test.js` is the
site-side half of the contract, in the shape `motionCssDrift.test.js` already
took for the token values.

10ms rather than 0 because a zero duration has edge cases in Framer Motion,
where `onAnimationComplete` does not always fire and some interruption logic
short-circuits. That reasoning was already in the provider; it moved with the
number.

## The two artifacts

**The stylesheet.** `toCssVars` appends a `prefers-reduced-motion` block after
the `:root` block, carrying every duration and delay at its replaced value and
nothing else, under a comment stating what is absent and why. Both prefixes get
it, from one emitter, the same way the `--cadence-` namespace decision went.

`motion.css` deliberately does not get the same block, and the drift test now
pins that asymmetry rather than tripping over it. The site answers reduced
motion in the provider, and Token Lab opts out of that on purpose, because a
reader is there specifically to perceive motion. A media block in the site's own
stylesheet would collapse the demos underneath that opt-out and take the choice
away. The export needs the block for the opposite reason: the provider does not
travel with the file.

**The resolver document.** `dist/cadence.resolver.json`, on the Design Tokens
Resolver Module 2025.10 (Final Community Group Report, 28 October 2025, read
from `https://www.designtokens.org/TR/2025.10/resolver/` on 2026-09-13). A
separate file from the token document because the spec makes them two kinds of
file: a token document says what the values are, a resolver document says how a
context changes them.

Two things the spec settled that a sketch had guessed wrong. `resolutionOrder`
holds reference objects, `{ "$ref": "#/sets/tokens" }` and `{ "$ref":
"#/modifiers/motion" }`, not bare names; and the resolver module does define a
`$schema`, unlike the format module, which defines none. Both were read from the
source rather than carried over. The spec also states that a context array may
be empty, which is what `full` is: full motion adds nothing, so the set
underneath stands as authored. The reduced context names only the leaves it
replaces, on the same 2025.10 object shape, so everything it does not name
resolves from the set.

The spec's introduction names "Accessibility mode, such as reduced motion" as a
use case and gives no example of one. This is a small one.

## The measurement

One row in the Measurements half, never a finding:

```
Reduced motion   replacement: durations 10ms, delays 0ms; easing, scale and spring unchanged
```

It is present on every report, including one with nothing else in it and one
built from no state at all, because it answers for the tool rather than for the
set. It cites no reference: there is no industry number here, only a fact about
what this system does.

## Verification

961 unit tests, eighteen new, across the package (the media block, the resolver
document's shape), the site (the provider against the package) and the audit
(the row, its wording, its presence on every set).

The check that proves the block works rather than exists: the generated
`cadence.css` loaded in a page, with `prefers-reduced-motion` emulated. Under
`reduce`, `--cadence-duration-fast` reads 10ms and `--cadence-duration-slower`
reads 10ms, `--cadence-delay-long` reads 0ms, and easing, scale, spring and the
scalar are untouched. Back at `no-preference` every value returns.

On built output: the CSS download carries the block, the block replaces the two
time families and nothing else, and the audit modal states the same resolution
beside it.

## Out of scope

Importing a resolver document: import reads token files. Any resolution the tool
does not apply. A scale or spring policy under reduced motion, which is reported,
not invented.
