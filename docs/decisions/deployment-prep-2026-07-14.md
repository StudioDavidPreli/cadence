# Deployment prep — Cloudflare Pages (2026-07-14)

Week 9 deployment preparation. The repo is now in deploy shape; the remaining
steps are David's in the Cloudflare dashboard. This records the host decision,
the framing that shaped the work, and everything that shipped.

## Host decision: Cloudflare Pages

Git-connected auto-build from `main`. Build command `npm run build`, output
`dist`. No config file, no GitHub Actions. Production URL
`cadence.davidpreli.com`; the first deploy lands on a `.pages.dev` URL and the
custom subdomain is a DNS step in the dashboard, not in this repo.

Chosen over Netlify/Vercel (the Week 9 checklist's original placeholder) because
davidpreli.com already runs through Cloudflare, so the DNS for the subdomain
lives in the same dashboard. The Week 9 tracker checkbox still read "Vercel or
Netlify"; that line predates this decision.

## The framing that shaped the work

Three facts kept the change surface small:

- **Cloudflare deploys only `dist/`.** The build's inputs are `index.html`,
  `src/`, `public/`, and the config files. Nothing else reaches `dist/`, so
  `docs/`, `tracker/`, tooling, and internal notes never deploy regardless of
  whether they are tracked. The repo cleanup below is therefore about repo
  contents, not the live site.
- **Hash routing needs no SPA fallback.** Routing is `#/...` (`useHashRoute.js`),
  so a deep link resolves client-side. No `_redirects`, no rewrite rule, no
  `404.html`. None were added.
- **Root deploy needs no `base` and no asset refactor.** The 65 root-absolute
  `.riv` references (`/rive/...`, `/riveTiles/...`) are correct at a domain root.
  `vite.config.js` stays free of `base`; no path was changed to
  `import.meta.env.BASE_URL`.

## What shipped

**1. `index.html` head (commit `5703753`).** Title set to the positioning line
`Cadence: the motion system explorer`. Added `<meta name="description">` (reuses
the README's one-line framing), Open Graph and Twitter card tags, and
`theme-color` `#141414` (dark `--color-bg`, the default theme). Favicon wired at
`/favIcon/favIcon.svg`. Social image at `/favIcon/og-image.png` (1200x630, David
supplied). Both assets live under `public/favIcon/`; the og tags were pointed
there rather than moving the file to the repo root. Absolute URLs on
`https://cadence.davidpreli.com` because a link scraper renders the card
off-site where relative URLs do not resolve.

**2. Repo cleanup (commit `66c9cd3`).** Trimmed the tracked tree to what builds
and documents the site. Two mechanisms:

- **Moved into the gitignored `archive/`** (kept on disk, out of git):
  `reference frames/`, `tools/` (png-to-lottie scripts, merged with the v5–v9
  already there), `savedinstructions/`, `claude-workflow.md`, `StatusReports/`.
- **Untracked in place** (`git rm --cached`, kept on disk, gitignored):
  `CLAUDE.md`, `skills-lock.json`, `.claude/skills/`, `.agents/skills/` (the
  vendored emil-design-eng skill). These stay put because moving them would
  break the skill's path; CLAUDE.md must stay at the repo root to be read.

Kept tracked: build inputs, `docs/` (the case study and decision records —
David's call), `tracker/`, `README.md`. `git rm --cached` trims the tree going
forward but does not purge `.git/` history; the old bytes remain in past
commits. Acceptable for a private repo (`StudioDavidPreli/cadence`); a true
history purge is a separate step if ever wanted. See memory
`repo-deploy-hygiene.md`.

**3. README (commit `85d42b3`).** Documented Motion Tiles as the third tool:
intro rewritten to name all three, a new Motion Tiles subsection under What It
Does, `MotionTiles/` added to the structure tree, and the Live URL set to the
pending `cadence.davidpreli.com`.

**4. Tracker (commit `5390d27`).** Closed pixel path-effect Fork 2 and recorded
the final tool composition: 36 group-1 tiles plus 16 group-2 tiles, the
remaining 20 group-2 tiles out of scope on the Rive MCP cross-file path-effect
limit.

## Push reconcile

The push forked at `9092cd6`. The remote carried four web-UI commits deleting
`StatusReports/`, `savedinstructions/`, `tools/`, and `reference frames/`
directories; the local branch carried the five commits above (including the
never-pushed motion-tiles integration `feat` commit). The two cleanups
overlapped on the same folders. Resolved by `git pull --rebase`: the overlapping
deletions dropped as already-applied, the history stayed linear, and both
cleanups collapsed into one consistent tree. The web-UI deletes did a plain
`git rm` (folders gone from the GitHub tree); locally those same folders live on
in the gitignored `archive/`.

## Remaining (David-owned, dashboard + later session)

- Cloudflare Pages project: connect `StudioDavidPreli/cadence`, `npm run build`
  → `dist`.
- DNS: point `cadence.davidpreli.com` at the Pages project.
- Post-deploy: fill the README `Live:` URL (drop "pending first deploy"), tag the
  release. Flagged for a later session.
- Optional Week 9 checklist item: short demo video.

## References

- `docs/decisions/motion-tiles-integration-2026-07-13.md` — the third tool the
  README and title work document.
- Memory `repo-deploy-hygiene.md`, `motion-tiles-final-composition.md`.
