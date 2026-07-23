# Background System, Next Session: Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session picks up the glyph L-system **background system** after the build-and-fix work is done. It is **not** a build session. It is a visual-judgment, cross-browser, and deploy session.

## Read first, in this order

1. `CLAUDE.md` (all of it).
2. `docs/briefings/BACKGROUND_SYSTEM_SESSION_2026-07-23.md` — the session handoff. **Section 8 is your task list.** Sections 6b–6f are what the last session did; section 5 is what remains and why.
3. `docs/briefings/background_system_rulings.md` — only as reference, when you need to know why a decision was made. It is long; the open questions live near the end.

## The state you inherit

The system is complete: seven pure modules under `src/background/`, the renderer at `src/components/BackgroundArt/`, mounted in the nav behind `?bg=1` (and `?grid=1` for the empty-cell grid). It is off by default, code-split so the flag-off path pulls none of it into the main bundle. 424 unit tests, 60 e2e, lint and build all green. **Five commits on `main`, none pushed.**

Do not rebuild it. Do not re-fix what section 6b–6f already fixed. If you think something is wrong, reproduce it first and check it against the handoff before touching code — most of what looks like a bug here has already been diagnosed once.

## What this session is for — three things, in order

**1. The visual pass. This is the point of the session, and it is David's, not yours.**

Nobody has looked at the background with design eyes. Every check so far was structural (attributes, computed styles, counts, contrast ratios) or Playwright-driven. Your job is to **set it up and hand it to David to look at**, not to judge it yourself and not to drive browser automation to "confirm" how it looks (see `CLAUDE.md` and the memory note: visual checks are David's).

Run it, then step back and let David drive. The open questions waiting on his eye, none blocking, each a one-line change once he calls it:

- **Open 2** — pixel cell arrival: `pop` (default) vs `scale-in`. Both wired; `cellReveal` prop / lab control.
- **Open 6** — breathe coupling rate (`CHOREOGRAPHY.breatheRate`, 0.5 now).
- **Open 8** — cell size (per-surface, defaults to 8; `?cell=` overrides).
- **Open 11** — roots (two re-placed vs one wide-spread).
- **Open 12** — the high-contrast composition.
- **Grid mesh weight** — whether `--color-border` at 8px reads right (6e).
- **Glass tint** — the 93% default is WCAG-forced for muted text; David can drop it to real 72% glass by making the nav's idle text non-muted, or overriding `--glass-tint` (6c). One line, and it changes the flag-off look too, so it is his call.
- **The placeholder marks** — the six in `src/background/marks/` are David's test SVGs. Replacing them with real traced work is design time; the authoring spec is `src/background/marks/README.md`, and `archive/backgroundSystem/build-marks.cjs` checks a directory.

**2. The glass in Firefox and Safari.** Verified in Chromium only. Masking a backdrop-filtered element is the combination most likely to drop the filter (`ruling 4` names it); the fallback on record is stacked zones of decreasing blur. Check on built output.

**3. Deploy — only on David's explicit go.** Pushing `main` deploys (Cloudflare Workers Builds rides pushes to `main`). So: do not push without David saying so, and understand that pushing *is* deploying. The pre-push gate is `npm run test:e2e` (60 tests on built output). Never run `npm run deploy` — the wrangler CLI is unauthenticated locally; you push, the integration deploys. After the deploy, drive the flagged surface (`?bg=1`) on the real site to close the last standing verification (section 5).

## How to run it

```bash
npm run dev
```

- **In the nav:** `http://localhost:5173/?bg=1#/token-lab` (needs a viewport above 1024px; add `&grid=1` for the grid; drop `?bg=1` to turn it off). `?seed=<n>` pins a specific plant; the dev console prints the current seed.
- **Standalone, all four themes with controls:** `http://localhost:5173/archive/backgroundSystem/background-route.html`
- **Pure modules with a smoke test:** `http://localhost:5173/archive/backgroundSystem/raster-harness.html`

Use those exact paths — the extension-less form falls back to the app's `index.html`. Restart Vite rather than reloading after adding files or imports; add `?v=2` if a page looks stale.

```bash
npm test              # 424 unit tests
npx playwright test   # 60 e2e on built output
npm run lint
```

## Environment traps that will waste your time (all real, all seen last session)

- The **in-app browser pane reports a 0×0 viewport** and **rAF never ticks** there (it is a hidden tab). Do not judge layout or animation lifecycles in it. For motion and reduced-motion checks use **Playwright `emulateMedia`** (`test.use({ reducedMotion })` no-ops in this suite); for structural facts the pane is fine after `resize_window`.
- `archive/` is **gitignored**. The labs, the standalone route, and `build-marks.cjs` are on David's machine only, not in any commit. A clean checkout will not have them. The mark library that ships is the six in `src/background/marks/`.
- Verifying code-splitting needs markers that survive minification (string literals like `currentColor`, CSS class names like `swayX`), not identifier names.

## Posture

David is a designer learning React through this project; explain non-obvious decisions rather than abstracting them away. Where two approaches exist, name both and why you chose one. And on this surface specifically: your job is to make it easy for David to see and decide, then execute his calls. The system is done; what remains is taste and a push.
