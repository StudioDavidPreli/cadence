# Cadence Button Rig (After Effects)

`CadenceButtonRig.jsx` rebuilds the Cadence Button inside After Effects as a live
rig. It is the asset base for the case study video: one comp that can play the
button in any of the four themes, at any label, on any preset, triggered from a
checkbox.

The rule the app runs on holds here too. Tokens live in one place, expressions
read them at render time, and nothing in the rig hardcodes a duration, an easing,
or a scale. Editing a token slider retimes the whole button, the same way editing
a custom property does in Token Lab.

---

## Install

Copy the file to:

```
After Effects > Scripts > ScriptUI Panels
```

Restart AE and open it from the Window menu. It also runs one-off from
`File > Scripts > Run Script File`, it just will not dock.

AE 17.1 or newer gets the full rig. On older versions the Dropdown Menu Controls
fall back to sliders holding the same index, and the label keeps its own
Character panel styling instead of taking size and color from the controls.
Everything else builds the same.

**Color management.** The theme colors are the literal sRGB hex values from
`src/tokens/color.css`, divided by 255. For those to land exactly, the project
should have no working space set (`Project Settings > Color > Working Space:
None`). With a working space active AE will treat them as being in that space and
the render will drift off the web values.

---

## Build

Set comp size, frame rate, duration, zoom, label and theme, then press
**Build rig**. You get a new comp with six layers:

| Layer | What it is |
| --- | --- |
| `CTRL Button` | Interaction and geometry controls. Theme, Press, Hover, Focus, sizing. |
| `TOKENS Motion` | The motion token document. Durations, delays, scales, easing curves. |
| `Button Label` | The text layer. Parented to the face. |
| `Button Focus Ring` | Stroke-only outline. The `:focus-visible` ring. |
| `Button Face` | The button itself. Fill, border, and the press animation. |
| `BG Plate` | The surface the button sits on (`--color-surface-raised`). |

**Zoom** is a multiplier on the geometry, not a transform scale. Font size,
padding, radius, border and ring all get multiplied before anything is drawn, so
the button renders at full comp resolution instead of being a scaled-up 38px
sprite. At the 4 default, a 1920 comp gets a button about 152px tall.

---

## The controls

### CTRL Button

| Control | Default | Notes |
| --- | --- | --- |
| Theme | Dark | Dark, Light, High Contrast Light, High Contrast Dark |
| Press / Hover / Focus | off | The three interaction states. Key them, or leave them as static toggles to hold a state while you look at it |
| Zoom | 4 | Geometry multiplier |
| Font Size | 14 | CSS px |
| Tracking | 10 | `letter-spacing: 0.01em` in AE thousandths of an em |
| Padding X / Y | 19 / 9 | Not 20 and 10. The border adds a pixel per side and the CSS drops the padding by exactly that to hold the outer size |
| Corner Radius | 6 | |
| Border Width | 1 | |
| Line Factor | 1.3 | Line box height as a multiple of font size |
| Baseline Nudge | 0 | Optical vertical offset for the label |
| Focus Ring Width / Offset | 2 / 2 | `outline: 2px` and `outline-offset: 2px` |
| Show Plate | on | Turn off for an alpha channel render |

### TOKENS Motion

The four durations, three delays, four scales, and two easing curves, at their
Standard preset values. Plus four dropdowns that decide **which** token drives
which part of the gesture:

- **Press Duration Token** and **Release Duration Token**, both Fast by default,
  because that is what the component uses for both halves.
- **Press Delay Token**, None by default.
- **Press Scale Token**, Press Base by default.

Those dropdowns are the part worth playing with on camera. Moving the press from
Fast to Slower without touching a keyframe is the argument the whole tool makes.

Easing curves are Point Controls holding bezier handles, not pixels. A point
control is the only two-number control AE offers and a curve handle is two
numbers. The Y value is free to pass 1, which is exactly how Overshoot gets past
its target and settles back.

Three controls do not correspond to anything the shipped component reads:

- **Retime Scalar (video only)** multiplies every duration and delay. In Cadence
  the duration scalar has no shipped consumer, only the visualizer reads it. Here
  it is a global retime so a 100ms press can be shot at a readable speed. It is
  named the way it is so nobody mistakes it for a token the component honors.
- **Spring Stiffness / Damping / Mass** ride along unused. They are here so the
  token layer is a complete Cadence token document rather than a subset.

---

## Triggering the press

The press is driven by hold keyframes on the `Press` checkbox. Put the playhead
where the press should land, set a hold length, and press **Key at playhead**.
That writes two keys: on at the playhead, off after the hold.

Everything downstream reads those two times. The scale expression walks the
checkbox's keyframes, finds the last press-down and the release that followed it,
and drives from there:

- Press: rest to the scale token, over the press duration token, on the standard
  curve.
- Release: back to rest, over the release duration token, on the overshoot curve,
  which passes 1 before it settles.

A release that lands before the press finished starts the return from wherever
the press actually reached, not from the token target. A 40ms tap on a 100ms
press duration never gets to 0.95, and the browser returns from the same partial
value.

With no keyframes at all the checkbox is a static toggle, which is the useful
form when you want to sit on a state and look at it.

Hover and Focus work the same way, and the same button keys them.

---

## What it reproduces, and where it diverges

Faithful:

- Both curves and both halves of the press, including the overshoot past rest.
- The color transition on `--motion-duration-fast` with the standard curve, which
  is what the component's CSS declares.
- `surface` to `surface-hover` to `surface-press`, in that precedence.
- The resting `border2` stroke, including the fact that it equals the fill in
  both high-contrast themes and disappears there.
- The high-contrast hover ring, in the surface color, standing in for a fill
  shift that carries no signal in those two themes.
- The focus ring on `--color-accent`, dropped while `:active`.
- The 9/19 padding and its reason.

Divergences, all deliberate:

- AE has no inside stroke, so the path is pulled in by one stroke width to put
  the stroke's outer edge where the CSS border box edge is.
- Height comes from font size times a line factor, not from the text bounding
  box. `sourceRectAtTime` measures ink, and ink height changes with descenders. A
  button that got shorter when the label lost its "y" would be wrong.
- Width does come from ink, so it is a pixel or two under the browser's advance
  width. Padding X absorbs it if you care.
- The retime scalar, above.

---

## If it breaks

The expressions reach the control layers by name. Rename `CTRL Button` or
`TOKENS Motion` and every expression in the comp goes red. Rename the layer back
and they recover.

`sourceRectAtTime` can lag a font size change by a frame in the viewer. Step one
frame or hit the caps lock refresh and the face catches up.
