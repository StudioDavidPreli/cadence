# caseStudyMedia

Media production for the hosted case study: the capture rig (code, tracked in
git) and the screen captures and media outputs David records with it (binaries,
gitignored via this folder's `.gitignore`, because deploys ride every push to
main and media never ships through the repo).

The item list, destinations, and priorities live in
`docs/case-studies/visual-aid-checklist.md`.

## The capture rig

Scenes that drive a Token Lab control by code while David records and interacts.
The rig mounts instead of the app, gated twice: the build must carry
`VITE_CAPTURE=1` (never set by the Cloudflare build, so the rig is dead-code
eliminated from every public deploy) and the URL must carry `?capture=<scene>`.

Run against built output (the standing rule):

```bash
VITE_CAPTURE=1 npm run build
npx wrangler dev -c dist/cadence/wrangler.json
```

then open `/?capture=problem-loop`.

## Scenes

- **`problem-loop`** (V02): the duration.fast slider ramps 50→350ms on a
  triangle wave with dwells at both ends; David clicks the Button on camera.
  Space starts and stops the ramp. Theme forces high-contrast-dark (the button
  carries an extra outline there). Ramp knobs are the `RAMP` constant at the
  top of `captureRig/ProblemLoopScene.jsx`.

- **`spring-vs-overshoot`** (V04): two Toggles flipped by one shared state,
  left on the overshoot bezier release, right on the real spring, magnified 2x
  for the camera with the driving values captioned per column. Above each: the
  tool's own curve graphic (the bezier editor held read-only, the settle-curve
  plot), in equal-height boxes so the toggles share a baseline. A third
  trigger toggle sits at the top of the screen above the crop line, so the
  recording never contains the pointer. Space starts and stops an auto-flip
  cycle (2s holds). Theme defaults dark; `&theme=` overrides (any scene
  accepts it).

(V09 became a live embed instead of a capture: `?embed=rive-clock` on the app
itself, see `src/components/PrincipleEmbed/`.)
