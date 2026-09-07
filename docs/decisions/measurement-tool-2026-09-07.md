# The measurement tool (build-order item 8)

Decision record for the Measure page (`#/tools`, `src/components/Measure/`),
written 2026-09-07 at the close of the build. The spike that gated it ran
2026-09-05; David passed the gate on the numbers the same evening. The
running record is the tracker's item 8 entry; this document keeps the
decisions and what they cost.

## What it is

One screen recording of one transition goes in through a file input. What
comes out is a fitted (duration, curve) per detected transition, with the
frames it rests on, a duration band, a confidence label, the named curves
the fit could not separate, and a flat Cadence token file carrying only the
two measured keys. Processing never leaves the page: the file is decoded on
a hidden `<video>`, the pixels are read on a canvas, and the e2e suite
asserts that the network log during a run holds nothing but the video
element's own `blob:` object URL.

The contract is deliberately narrow: not "any GIF", one recording of one
transition, video formats the browser plays natively. A GIF path was scoped
as a hand-rolled decoder if runway allowed; it did not, and the page says
`.mov, .mp4, .webm`.

## The pipeline

Four stages, each pure where it can be, in `measureModel.js` and
`decodeVideo.js`:

1. **Decode.** `requestVideoFrameCallback` for presented-frame media times
   (the file's clock, not the wall clock), a seek-and-draw fallback where it
   is missing. Playback runs at 0.25x because the presenter dropped one
   frame in five at real time on a 1280x800 file; slowing it presents every
   frame and changes nothing about timing. Dropped frames are reported.
2. **Region.** Pass one accumulates a mask of pixels whose RGB moved by more
   than 48 levels in one frame step. The region is the dominant cluster of
   that mask on a 16px grid, not its union: the site's own chrome answers a
   press (token highlights in the tool bar, the hover ring) with scattered
   pixels, and the union boxed the whole demo column. When one thing moves,
   the cluster is the plain bounding box.
3. **Trace.** Pass two decodes again and takes the mean absolute RGB
   difference between consecutive frames inside the region. Decoding twice
   is cheaper than holding a hundred 4 MB frames.
4. **Fit.** Segments are runs above a noise-floor threshold, merged across
   a 4-frame gap (slow motion is bursty: sub-pixel steps snap to whole
   pixels), with a 2-frame minimum. A one-frame impulse at the press
   instant (compositor layer promotion, text anti-aliasing snapping) is
   clipped only when both neighbors are quiet; clipping any loud frame
   erased Snappy's real four-frame peak. The progress curve is cumulative
   energy, normalized. Three families are fitted through unsigned travel:
   the named library (primary), a free cubic-bezier (a hint, flagged
   underdetermined below 12 samples), and the symmetric k-form as the null
   model. The onset search reaches back 0.25·D before the first loud frame
   because a slow ease moves under a pixel per frame at its head.

## Decisions

**Unsigned travel, every family.** Motion energy has no sign: a frame that
moves the button back toward rest counts the same as one moving it away, so
an overshoot's excursion reads as extra travel. Fitting y directly can never
recover overshoot; fitting normalized cumulative |Δy| can, and leaves
monotonic curves unchanged.

**The named library is the primary; the free bezier is a hint.** A free
cubic-bezier with six parameters (four handles, duration, onset) matched
anything at five to seven samples, with a residual lower than the truth's.
The five named curves were separable at the same sample count. This is the
finding the case study leads with: a small named vocabulary is the
precondition for measurement, not a limit on it.

**Duration is a band, never a bare number.** Within 7% at 100ms; up to 20%
on slow eases whose head and tail leave no energy. The band is every
duration whose residual is within 0.02 rms of the best, at its best onset,
and it is printed beside every point estimate.

**Confidence from frames and separability, never from residual.** `high`
needs ten frames and one named curve inside tolerance; `medium` five frames
and at most two; everything else is `low`. A low residual on four samples
means nothing, and the label must not reward it.

**The indistinct margin is relative, with a floor under eight frames.** The
spike's rule was absolute: a curve within 0.02 rms of the winner could not
be ruled out. It never excluded the truth, and it called a clean
twelve-frame Cinematic recovery ambiguous because 0.018 + 0.02 reached two
curves that fit at 0.034, twice as badly. The rule is now half the
winner's residual plus a floor: 0.02 below eight frames, 0.005 above.
Across the eight fixtures the truth is still never excluded; Cinematic
narrows to exactly the pair motion energy cannot tell apart, `enter` and
`overshoot`; the short recordings keep their wide floor, because a single
stuttered frame moved the truth to second place at six frames and a fit
that short has no business ruling anything out.

**When the data cannot choose, the user does, by eye, on the real Button.**
The name exists so the value can be assigned as a token, and an indistinct
name cannot be assigned. `enter` and `overshoot` share an envelope, a fast
start and a slow finish, and differ in the sign of the tail, which the
pixels do not carry; a press shows it. So when a fit is indistinct the
export row lays the candidates out, winner first: each with the recorded
dots against its own fitted line, its residual, and the site's own Button
pressing on that curve at the measured duration, on a local token provider
carrying the candidate in both the press and release slots. The user picks
the one that looks like the recording; the dropdown of curve values is the
candidates and the free-form curve, never the whole library, because a
curve the data ruled out is not a measurement. The exported note says the
curve was chosen by eye, from which set, with each candidate's residual.
The slot (the role) stays the user's separate decision. David's design,
2026-09-07. Under reduced motion the demos are skipped and the plots and
residuals carry the choice.

**The k-form is the null model.** It never won a fit on any capture:
Cadence's curves are asymmetric (standard's handles are 0.4 and 0.2) and
the k-form is symmetric about its midpoint. It stays as the question "can
this recording tell the shape from a symmetric one".

**The export carries two keys.** An assignment row proposes the nearest
duration slot on a log scale and the fitted curve's own slot; the file holds
only those. `importTokens` fills the rest from Standard and reports them as
`filled`, so the document says what was measured and what was not. A
measured curve equal to a library curve imports back under its name.

**Samples as stored traces, fitted live.** Three recordings of the site's
own Button (Standard, Snappy, Cinematic, high-contrast dark, held press, 59
fps) sit under the drop zone as buttons. They shipped first as lossless
VP9 WebM files decoded on click, and Safari refused them ("Media failed to
decode": VP9 profile 1, 4:4:4 chroma). David's call, 2026-09-07: the
recordings never change, so decoding them on every click bought nothing
and cost a codec. What ships now is each recording's pixel-change trace,
its measured region, the tokens that were live at capture, and one still
of the button (`public/measure-samples/*.json`, `*.png`, under 6 kB each),
and the fit runs on click through the same `analyzeTrace` a dropped file
gets. The trace is stored because it cannot change; the fit is live so a
change to the model changes the samples with it and nothing stored goes
stale (`samples.test.js` fails if a sample stops recovering the tokens it
was recorded at). The status line says "recorded 2026-09-05 ... fitted
now", never "decoded". The file-input path still decodes video and is
where the decoder is proven, on the repo's own WebM under `e2e/fixtures`;
a browser that refuses a format now gets a plain sentence naming which
formats it plays, with the browser's own text after it.

**Placement.** A Tools nav section (David's call, 2026-09-06) with Measure
as its first leaf and the .riv linter (item 9) to follow; route `#/tools`
with Measure the default view, the Glossary's pattern. Lazy chunk, tool bar
railed, outside MotionTokensProvider: the page reads no `--motion-*` token.
The title is David's `measureTitles.riv` on the display-title convention,
posters under reduced motion; the video preview never autoplays.

**No counter.** No `/api/event` beacon on the page, so "no request carries
the recording" is verifiable as "no request at all".

## Results on ground truth

Recordings of the built site's Button with the tokens read from
`getComputedStyle` at capture time, frozen as fixtures under
`src/components/Measure/fixtures/` and pinned to the millisecond in
`measureModel.test.js`:

| Recording | Frames | Curve | Duration (ms) | Band (ms) |
| --- | --- | --- | --- | --- |
| Standard, HC-dark | 5 | standard | 90 vs 100 | 73 to 108 |
| Standard, dark | 5 | standard | 99 vs 100 | 78 to 118 |
| Cinematic, HC-dark | 12 | enter | 233 vs 200 | 195 to 270 |
| Snappy, HC-dark | 4 | overshoot | 56 vs 60 | 46 to 67 |
| Control, fast = 500 | 25 | standard | 599 vs 500 | 473 to 781 |
| Control, fast = 1000 | 40 | standard | 906 vs 1000 | 736 to 1082 |
| Standard, David's run, 56 fps | 5 | standard | 80 vs 100 | 61 to 102 |
| Standard, one stuttered frame | 6 | overshoot | 96 vs 100 | 80 to 108 |

The true curve was inside the indistinct set and the true duration inside
the band on all eight. The best name matched on seven; the eighth is a
clean-conditions capture with one screencast frame that arrived late, its
motion landing on the next, and that alone read as a fast-start curve with
standard inside tolerance. Weighting stuttered frames out of the residual
did not recover it and moved every other number, so it was reverted and the
invariant the tests pin is the weaker one that held everywhere.

## Limitations

- **Sub-pixel motion is invisible.** A 5% press overshoots past rest by
  about half a pixel on a 108px button. Release curves are unreliable and
  the card says so.
- **A stuttered or duplicated frame can flip the best name at six frames.**
  The indistinct set and the band are the promise; the point estimate is
  not.
- **Snappy at 60ms is four frames** and names the library with three curves
  it cannot separate. The page reports `low` and means it.
- **The page's own title starved the decoder.** Found by the e2e suite,
  diagnosed on the round trip: with the animated title's canvas running,
  the same 17 kB recording presented 57 of 104 frames at 0.25x; with the
  reduced-motion poster in its place, all 104. Under software WebGL
  (headless Chromium, any machine without a usable GPU) a canvas redrawing
  at 60fps competes with the video presenter for the compositor. The title
  now holds still while a measurement runs and resumes after. Two nets
  remain behind that: the decode retries at 0.1x and 0.0625x (Chrome's
  floor) until nothing drops, and if drops remain the status line says the
  machine was too busy for a reliable read. The e2e suite asserts zero
  drops before it reads any fit. Two wrong explanations preceded the right
  one and were reverted: worker load, and a disk-backed File from the
  input; the second was ruled out by reading the file into memory first,
  which changed nothing. The held title reads as a frozen page, so
  the status line leads with the site's Spinner and "Just a moment." for
  the duration (David's ask, 2026-09-07; the Spinner on a local provider
  with the package's Standard values, so the lab's sliders cannot speed it
  up), and the hold applies only while a video decodes, never to a sample,
  which runs no decoder.
- **The region is a cluster heuristic.** A cursor crossing the element, or
  a second element moving louder than the one recorded, wins the box. The
  guidance copy says to keep the frame tight; a manual override was scoped
  and not built.
- **The indistinct tolerance is absolute** (0.02 rms), which calls a clean
  12-frame Cinematic recovery `low` because two worse curves sit inside it.
  A relative rule would call it `high`. Left untuned on six recordings;
  David's call.
- **The seek fallback's timing is a guess** at the file's frame rate, and
  Safari is outside the e2e suite (Chromium only). David dropped an MP4
  screen recording into the page in Safari on 2026-09-07 and it measured;
  that is the one Safari data point.
- **Recordings that were not held** (a plain click) fit the press and
  release as one transition with a hold of zero frames between them, and
  the result is a blend.

## Files

`src/components/Measure/`: `measureModel.js` (+ 56 tests, fixtures),
`decodeVideo.js`, `useRecording.js`, `measureExport.js` (+ 8 tests),
`TracePlot.jsx`, `MeasureTitle.jsx`, `index.jsx`, `Measure.module.css`.
Nav: `src/data/navigation.js`, `src/hooks/useHashRoute.js`,
`src/context/NavigationContext.jsx`, `src/components/NavColumn/index.jsx`,
`src/components/TokenLab/index.jsx`. Assets: `public/measure-samples/`,
`public/rive/measureTitles.riv`, `public/fallBacks/measure*.svg`. Gate:
`e2e/measure.spec.js`, the Measure view in `e2e/a11y.spec.js`. The
node-side spike and its capture tooling live outside the repo's tracked
tree.
