---
Purpose: Hand-off for the session that wires waterwiltreact.riv into React
Source: Full MCP inspection of the file in the Rive editor, 2026-07-18
---

# waterWilt — React Wiring Briefing

The file is a plant that lives and dies by a button. Click waters it: rain
falls, the plant grows. Click again and the water stops, the plant wilts back.
Hover and click behavior are authored into the file's own listeners, so the
artwork runs itself; React's job is theme binding, state access, and deciding
what a motion token is allowed to touch.

Inspected 2026-07-18 via Rive MCP against the open editor session. 251 KB on
disk. **The file is untracked** (`?? public/rive/waterwiltreact.riv` in git
status); the wiring session should commit it when the integration lands.

---

## 1. Exact strings the runtime needs

| Thing | Value |
|---|---|
| File | `public/rive/waterwiltreact.riv` |
| Artboard | `waterWilt` (the only one) |
| State machine | `waterWiltSM` (the only one) |
| View model | `WaterWiltVM` |
| Instances | `darkMode`, `lightMode`, `contrastLight`, `contrastDark` |

Theme map for the component:

```javascript
const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
};
```

This file follows the hero convention, not the principle convention: four
authored per-theme instances, including a real `contrastDark`. Bind the
theme's own instance and flip nothing. **`useHCContrastColors` is not needed
and must not be called.** Import from `@rive-app/react-webgl2` (the only
runtime; see the 2026-07-17 consolidation doc).

---

## 2. The view model

`WaterWiltVM`, 26 properties. Grouped by what they are for:

### State (the control surface React actually drives)

| Property | Type | Behavior |
|---|---|---|
| `plantBoole` | boolean | The master switch. `true` = watered: rain falls, plant grows. `false` = dry: rain stops, plant dies. Both state machine layers condition on this one property. |
| `clickedBoole` | boolean | Button press pulse. Set true to fire the 1s `clicked` animation; the clicked state's enter action resets it to false itself. |
| `buttonText1Boole` | boolean | Shows/hides the `waterMe` text object. Defaults true. |
| `buttonText2Boole` | boolean | Shows/hides the `dryTime` text object. Defaults false. |

### Numbers

| Property | Value in all four instances | Purpose |
|---|---|---|
| `hoverScale` | 95 | Button scale target on hover |
| `hoverFillOpacity` | 0 | Written by the hover listeners at runtime |
| `planterFillOpacity` | varies per theme (0 or 1) | Theme styling |
| `planterStrokeOpacity` | varies per theme (0 or 1) | Theme styling |

### Colors (18, all authored per instance)

Scene: `artboardBG`, `leavesLightColor`, `leavesShadowColor`, `trunkColor`,
`trunkShadowColor`, `soilColor`, `shadowColor`, `specsColors`, `rainColor`,
`planterFillColor`, `planterStrokeColor`, `planterAccentColor`.

Button: `buttonBg`, `buttonStroke`, `textColor`, `textHoverColor`,
`textColorReturn`, `bgHoverColor`.

One observation to verify visually, not a defect report: all four instances
author `buttonBg` with zero alpha (dark `0x00909090`, light `0x00666666`,
contrastLight `0x00000000`, contrastDark `0x00FFFFFF`). Either the button fill
gets its opacity from animation keys and only reads the RGB, or the button is
stroke-only by design. Check it renders as intended in all four themes before
assuming either.

---

## 3. The state machine

`waterWiltSM` has **zero inputs and zero fired events**. Every condition reads
the view model. Three layers:

**plant** — entry → `idleDead`. When `plantBoole` goes true: `idleDead` →
`grow` (4s) → `idleGrow` (4s loop). When false: `idleGrow` → `die` (4s) →
`idleDead`. The grow → idleGrow and die → idleDead transitions fire at 100%
exit time, so a mid-cycle toggle finishes its current animation first.

**rain** — mirrors the plant layer on the same boolean. `noRainIdle` →
`rainFall` (2.58s) → `rainingIdle` (2.58s loop) while true; `rainingIdle` →
`rainStop` (2.58s) → `noRainIdle` when false.

**button** — `idle` → `clicked` (1s) when `clickedBoole` is true; the clicked
state resets `clickedBoole` on enter and returns to idle at 100% exit time.
Self-resetting; React never has to clear it.

## 4. Listeners (why the file runs itself)

Three pointer listeners, all inside the file:

- `button` (pointer down): toggles `plantBoole` through a bind (a flip, not a
  set), sets `clickedBoole`, and swaps `buttonText1Boole`/`buttonText2Boole`
  so the label changes between the `waterMe` and `dryTime` text objects.
- `hoverBox` (enter): raises `hoverFillOpacity`, moves `textColor` to
  `textHoverColor`.
- `hoverBox` (exit): drops `hoverFillOpacity`, returns `textColor` to
  `textColorReturn`.

Consequence: with canvas pointer events on, hover and click work with no React
wiring. This is the Rive chrome-button pattern (see the logo/problem-button
memory): pointer-events ON means the state machine gets hover and press and a
wrapping `<button>` click still bubbles. Decide during wiring whether clicks
belong to the canvas listeners, to React writing `plantBoole`, or both. Both
is safe (each side flips the same property) but one side should own it in the
component's documentation.

## 5. Art structure (for orientation, not modification)

Top to bottom: `hoverBox` (hit shape), `ButtonGRP` (`dryTime` text, `waterMe`
text, `hoverFill`, `button` shape with fill and stroke), `Rain` (four groups
of 35 drop shapes, 140 total), `Plant` (specs, shadow, leaves, trunkShadow,
trunk, with clipping shapes), `Planter` (soil, a 33-shape `potAccent` group,
pot stroke/fill). The `frame_Layer` naming in the shadow groups is
frame-by-frame hand-drawn work: when wiring, check whether the strokes need
`useRiveSupersampling(rive)` like the principle art, or hold up at plain
device ratio like the heroes. Judge on the built output, by eye.

## 6. What the file does not have

These are the gaps the wiring session plans around, not defects:

- **No timing surface.** All durations are baked into the linear animations
  (grow/die 4s, rain cycle 2.58s, button 1s); every transition duration is 0;
  the VM has no speed or duration property. If Token Lab tokens are meant to
  retime this animation, the file needs a number property that scales playback
  (the Motion Tiles approach: React owns a clock or a speed multiplier), or
  React drives the advance rate. If the integration is theme + state only, the
  file is ready as-is.
- **No bound strings.** The two labels are separate text objects toggled by
  booleans. Changing copy from React means adding a string property in the
  editor first.
- **No events out.** React cannot subscribe to "grow finished" or "click
  happened" from the file. If the app needs to know, it reads the booleans it
  wrote, or an event gets authored into the state machine later.

## 7. Wiring checklist

- [ ] Component folder per convention (`src/components/<Name>/index.jsx`),
      import from `@rive-app/react-webgl2`
- [ ] Four-entry `themeToInstanceName`, bind via `useViewModelInstance`,
      no `useHCContrastColors`
- [ ] Any runtime color writes go through `instance.color(name)` directly,
      never a `useViewModelInstanceColor` setter held across a rebind
      (the 2026-07-17 consolidation doc records that failure)
- [ ] Decide click ownership: canvas listeners, React, or both
- [ ] Decide the token story: theme-only now, or add a timing property to the
      file first (section 6)
- [ ] Reduced motion: every Rive surface now has a gate (the 2026-07-18
      completion doc); this one needs a poster or paused state decision
      before it ships
- [ ] Verify `buttonBg` zero-alpha rendering in all four themes (section 2)
- [ ] Supersampling call: judge on built output (section 5)
- [ ] Verify on the built bundle, not the dev server (standing rule)
- [ ] Commit `public/rive/waterwiltreact.riv` with the integration

The plant is patient. It waits in `idleDead` until somebody waters it.
