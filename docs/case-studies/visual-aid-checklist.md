# Hosted Case Study: Visual Aid Checklist

**Working doc, 2026-07-31.** Every media element for the hosted case study, in page order. Each item lists both destinations: the chapter page in `hosted/` and the line in the single-page `cadence-case-study-hosted.md` (every placeholder exists in both; populate both or decide the single-page version stays media-light). Placeholder comments in the files are tagged `<!-- VISUAL: ... -->` and match the IDs below.

Capture rule: everything is recorded against **built output** (the standing rule), in a browser at the deployed site or `npx wrangler dev -c dist/cadence/wrangler.json`. Note theme per item; default dark unless said otherwise.

---

## Already in place

- [x] **V00. Cadence wordmark title.** RESOLVED 2026-08-01 (David's call): the Token Lab-style `title2.svg`, recolored for dark (`hosted/media/title2-dark.svg`: the near-black ink flipped to `#e1e1e1`, the blue `#96c1e9` kept). Referenced relatively from `hosted/index.md` and the single-page doc; the handwritten `newCadenceHW.svg` is retired from the case study.

## Priority 1: needed (the prose makes claims only motion can prove)

- [ ] **V01. Overview video.** 60-90s walkthrough, the last open item. Placeholder in place 2026-08-01: the site's OG card image (`favIcon/og-image.png`, production URL) holds the slot in `hosted/index.md` and the single-page doc; swap image for video on delivery.
- [x] **V02. The Problem demo loop.** DONE 2026-07-31: captured with the rig (`v02.gif`, 720×405), placed in `hosted/index.md` and the single-page doc. The prose quotes the same 50→350 range in four places (main, single-page, `hosted/index.md`, overview closing line); if the ramp range changes again, all four follow.
- [x] **V03. Motion Tiles preset wave.** DONE 2026-07-31: `v03sr.gif` (720×720, ~2.3 MB, lazy-loaded), placed in `hosted/fields-and-canvases.md` and the single-page doc. If page weight bites later, the same capture re-encodes smaller as a video element.
- [x] **V04. Spring vs overshoot side-by-side.** DONE 2026-08-01: recorded from the rig scene (`v04.gif`, 720×525, both curves above their toggles), placed in `hosted/token-system.md` (Spring section) and the single-page doc. The rig scene (`?capture=spring-vs-overshoot`) stays for retakes.
- [x] **V05. Three tool stills.** DONE 2026-07-31: `V05_tokenLab/principles/motionTiles.webp` as a captioned three-up row in `hosted/built-and-learned.md` and the single-page doc.

## Priority 2: nice (visual interest, breaks up long prose)

- [x] **V06. Token Lab code view still.** DONE 2026-07-31: `V06_codeView.webp` placed in `hosted/token-system.md` and the single-page doc.
- [x] **V07. Two-channel dispatch diagram.** DONE 2026-07-31: inline SVG, hand-coded, dark theme baked from `color.css` (accent `#76c17d` on the value flow, IBM Plex Mono with monospace fallback). Placed in `hosted/token-system.md` (Hybrid Model) and the single-page doc. Maintenance coupling: labels quote `TokenLab/index.jsx` names (`dispatch`, `syncToCss`, `stateToTokens`, `MotionTokensProvider`); if those rename, the diagram follows. Pending David's art direction pass.
- [x] **V08. Live Token Fidelity embed.** BUILT 2026-07-31: `?embed=token-fidelity&theme=dark` mounts `ExpandedPrincipleBody`'s third frame (`src/components/PrincipleEmbed/`), at the deep-link modal's size (460×520 body, accent-bordered panel, iframe 462×522), no × (David chose the smaller expanded; text columns beside the iframe in both docs). Worker now sends `frame-ancestors 'self' davidpreli.com` on HTML. Goes live on the next push to main; until then the iframe box is empty. Fallback delivered 2026-07-31 (`tokenFidelityFallback.svg`, wired as the iframe background; note its 720×1080 aspect letterboxes in the 462×522 box, contain-fit). Remaining: the push to main that takes the embed route live. → `hosted/principles.md` (UI Curriculum), single-page Principles section.
- [x] **V09. Rive Clock live embed.** BUILT 2026-07-31: `?embed=rive-clock&theme=dark` mounts the PixelPlant canvas alone (`chromeless` prop) with a ghost pointer touring the quadrants plus one off-stage rest per lap (so the homecoming shows). The ghost writes the same pointer ref the real handlers write (`pointerOverrideRef`), hops on the nav chrome constant, dwells 2s, hides and yields when a real pointer enters, resumes from off-stage on leave. No tour under OS reduce-motion. David's `mousePointer.svg` is the visible ghost; `riveClockFallback.svg` (1080×1350, exactly the stage's 0.8 ratio) backs the iframe. Floated figure, 340×425, prose wraps beside it. Embed spec (David, 2026-08-01): 140 cells, gap 0, `growOnLoad` (writes the VM's `grow` boolean at mount; `waterMeBoole` bakes true so re-writing it is a no-op the machine never sees). Live on merge of the draft PR. → `hosted/fields-and-canvases.md` (Embeds), single-page Embeds.
- [x] **V10. Background theme pair.** DONE 2026-07-31: `V10_backgroundSystem.webp` placed in `hosted/fields-and-canvases.md` and the single-page doc.
- [x] **V11. Grid evolution strip.** DONE 2026-07-31: inline SVG in V07's style language (dark baked, mono type, muted chronology arrows, accent reserved for the surviving state: the expanded card outline and "holds."). Five panels with sketched failures; the shipped panel carries the 2×2 expansion, the honest empty cell, and the gutter strip. Placed in `hosted/key-decisions.md` and the single-page doc. Pending David's art direction pass.

## Priority 3: flourishes

- [x] **V12. Stat row on the landing.** DONE 2026-07-31: mono row (13 · 268 · 39 · 578) under the Live line in `hosted/index.md` and the single-page doc. Commit count is dated 2026-07-28; refresh on republish (comment in place).
- [x] **V13. Spring section glyph.** DONE 2026-07-31: the `spring.svg` path inlined into the heading in `hosted/token-system.md` and the single-page doc, ink set to heading color (the source file is black-on-transparent, so an `<img>` reference would vanish on dark).

---

## Production notes

- Clips that show token edits should keep the control and the consequence in one frame; the point is always the wire between them.
- Any accent-colored capture: verify against the contrast audit per theme, not by eye (`docs/decisions/contrast-audit-2026-04-16.md`).
- Reduced motion off for all motion captures; V10's stills are motion-free and can be taken either way.
- If chapter pages carry more than one Rive embed plus video, watch the WebGL context budget; V08 is the only planned embed, keep it that way per page.
- When media lands, delete the matching `<!-- VISUAL -->` comment in both files so this checklist and the placeholders cannot drift apart.
- Draft HTML: the six chapter pages generate from the markdown (python-markdown, extra + nl2br, raw blocks protected) into `docs/case-studies/hosted/*.html`; regenerate after any chapter-md edit. Hosted-set links are `.html`; the four branch-doc links still point at `.md` until those get their own HTML pass.
- Media pipeline: David's outputs stage in `src/caseStudyMedia/media/` (gitignored); shipping copies live in `docs/case-studies/hosted/media/` (tracked), referenced as `media/...` from chapter pages and `hosted/media/...` from the single-page doc.
