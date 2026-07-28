# Handoff: folding the background into the live site

**Date: 2026-07-27**
**Status: SUPERSEDED 2026-07-28. Every question below was answered, and two of the numbers in it are wrong. See `background-finalization-2026-07-28.md`.**

> Kept as written, because what it got wrong is worth keeping. Three corrections
> before you read it:
>
> **Section 3 is wrong by six and a half times.** The chunk measured 495.71 kB
> gzipped, not 76 kB. That figure predated the native face, which is what made
> the non-canonical colorways expensive. It is 12.75 kB on the landing page now.
>
> **Section 4's mobile item resolves by design.** The rail is real, at 1024px,
> and `NavBackground` mounts only in `NavColumn`'s non-collapsed branch, so the
> artwork is never inside the drawer. Below 720px `MobileGate` returns above
> `NavigationProvider` and nothing navigational mounts at all.
>
> **Section 4's glass item was already measured, in the CSS, and failing.** The
> answer was to move the text rather than the tint.
>
> Section 1 resolved to native only. Section 2 went with the traced face. Section
> 5's lab is deleted; its `console.info` was confirmed dev-only.

**Original status: the system runs behind `?bg=1` and has never shipped. This is what standing between it and the flag coming off.**

Nothing here is a bug. The system draws correctly in all four themes on all three
libraries. What follows is the set of decisions that were deferred while the art
was still moving, plus the verification that has not been done because the flag
made it unnecessary.

Read `background-colorways-and-native-face-2026-07-27.md` first for how it got
here. This is only what is left.

## Where the switch is

`BACKGROUND_ENABLED` in `src/components/NavColumn/backgroundFlag.js` reads
`?bg=1`. `NavColumn` mounts `NavBackground` only when it is true, and
`NavBackground` dynamic-imports `NavBackgroundArt`, which is where every heavy
import lives. With the flag off, none of it reaches the main chunk.

Turning it on is one line. Everything below is what should be settled before
that line changes.

## 1. Decide which faces ship, then delete the others

Three faces exist. One is drawn.

| face | state | what it costs to keep |
|---|---|---|
| `native` | shipped | nothing, it is the drawing |
| `vector` | reachable, unused | the flattener, the census, the ink transform, the palette |
| `pixel` | reachable, unused since 2026-07-23 | `aggregate()` on every regeneration, whether shown or not |

The pixel face is the one to look at first, and it is cheap either way. `face` is
not in the composition memo's dependency list, so `aggregate()` runs in full for
every composition even though no section renders it. Gating it behind `showPixel`
is a smaller change than removing it and makes keeping it free.

If both go, so do `glyphs.js`'s flattener, `census.js`, `ink.js`'s transform
machinery, `MARK_PALETTES`, and roughly half of `BackgroundLab`. That is a large
and satisfying deletion. It is also the deletion of the part of this system that
reads as design engineering rather than as decoration: two rendering faces built
from one display list, and the ink-resolution contract that let them agree. A
case study that says "I built two faces, measured them against the art, and
shipped the one the art wanted" is stronger than one where the second face was
never there.

Keeping them reachable at `?face=pixel` costs a gate. Deleting them costs the
story. Neither is wrong. It has not been decided.

## 2. The ink split, if the traced face survives

`#76c17d` maps to two different colours in three colorways, because the rats and
the runners share a green in dark and take different high-contrast treatments.
The ink-keyed palette cannot represent that. It keeps the first mapping and names
the conflict, and the suite pins the three known cases so a fourth fails.

The native face is unaffected. It reads each colorway's own fills path by path.
If the traced face ships, the table has to be re-keyed to `(mark, path)`, and the
pixel face cannot follow: a cell remembers only its dominant ink, never which
mark deposited it. If the traced face goes, this goes with it.

## 3. Bundle size

```
NavBackgroundArt chunk    972 kB raw    76 kB gzipped
tokenLab SVG              4 colorways
principles SVG            4 colorways
motionTiles SVG           4 colorways
```

Behind the flag this costs nothing, because the chunk is never fetched. On the
day the flag comes off it is 76 kB gzipped on the nav column, which is present
from the landing page.

Four colorways of highly repetitive path data compress well, which is why the raw
figure is four times worse than the gzipped one. Options if it needs to come
down, cheapest first: ship only the active theme's colorway and fetch the others
on a theme switch; move the colorways behind `import.meta.glob`'s lazy form;
generate the palette maps at build time so the non-canonical colorways ship as
tables rather than as documents.

None of that is worth doing before somebody decides the number is too big.

## 4. What has not been verified

**Built output.** The standing rule in CLAUDE.md is that every session's
verification exercises the changed UI paths on `npm run build` output, served,
driven in a browser. That was written after the 2026-07-15 crash, where a CSS
minifier rewrote `400ms` to `.4s` and a token parser produced `NaN` on the
deployed site while the dev server stayed clean.

This system reads tokens through `useMotionTokens` and `backgroundIdlePeriodSeconds`,
both of which parse CSS custom property values, and it now derives an animation
period from one of them. That is the same class of code that crashed. It has been
looked at in dev and never on built output.

```bash
npm run build && npx wrangler dev -c dist/cadence/wrangler.json
```

Then `?bg=1&face=native`, all four themes, and a preset switch in each.

**Reduced motion.** The idle is dropped entirely under the preference and the
reveal collapses to an instant appearance. Both paths exist and are unit tested.
Neither has been driven with `prefers-reduced-motion: reduce` set since the
colorways landed. Note the e2e caveat in the Playwright quirks memory:
`test.use({ reducedMotion })` silently no-ops in this suite, use
`page.emulateMedia`.

**Mobile.** The app gates below 720px and the nav column collapses to a rail with
a drawer. The background measures the column with a ResizeObserver. What it does
inside a drawer, at a rail width, has not been looked at.

**The glass.** `NavAccordion` sits on a `backdrop-filter` surface whose entire
job is to blur whatever the artwork drew underneath into something legible.
Every contrast ratio in this project was measured against flat token
backgrounds. Nobody has measured nav label contrast against a blurred field of
rats.

That last one is the only item on this page that could stop a launch rather than
delay one.

## 5. Small things

The dev console prints the seed on mount so a plant worth keeping can be pinned
with `?seed=`. That is a dev-only `console.info` and it stays out of production
builds. Worth confirming rather than assuming, since it is the kind of line that
survives.

`BackgroundLab` mounts inside the lazy chunk and is portaled to `document.body`.
With the flag on it ships to visitors. It is a tuning panel with a handle in the
corner of the page. Decide whether it hides behind its own parameter before the
background stops hiding behind one.

The lab's own state seeds from David's settled values, so the panel opens on the
drawing that ships rather than on a neutral one. If those values move into
constants, the lab should seed from the constants and not from a second copy.

## 6. The order I would do it in

Measure the nav labels against the glass over a real composition, in all four
themes. That is the one that can invalidate the rest.

Then decide the faces, because everything downstream of that decision is
deletion or is not.

Then build, serve, and drive it, with a preset switch and a theme switch in each
of the four themes.

Then the flag.

The rats have been running behind a query parameter for four days. They do not
mind either way.
