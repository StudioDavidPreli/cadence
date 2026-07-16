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

## Addendum (2026-07-15) — Pages Functions correct the "only dist/" framing

The framing above ("Cloudflare deploys only `dist/`") is incomplete. Cloudflare
Pages also picks up a root **`functions/`** directory and deploys each file in it
as a serverless Function, routed by path — `functions/api/bug-report.js` serves
`POST /api/bug-report`. So the live site is the static `dist/` build **plus** the
Functions, not `dist/` alone. This does not change the git-connected build (still
`npm run build` → `dist`); Pages layers the Functions on automatically, no config
file and no separate build step.

Prompted by the Motion Tiles bug-report button, which posts to that Function; the
Function opens a GitHub issue using `GH_TOKEN` / `GH_REPO`, so no email address is
ever exposed client-side. The `.gitignore` note that carried the same "dist/ only"
wording was corrected in the same commit as the `.dev.vars` entry.

David-owned dashboard follow-up (also tracked in the session's closing report):
set `GH_TOKEN` (fine-grained PAT, this repo only, Issues read + write) and
`GH_REPO` (`StudioDavidPreli/cadence`) as Pages environment variables.

## Addendum (2026-07-15, second) — host is Workers, not Pages; `functions/` retired

The prior addendum assumed a Pages project. It isn't one. When the repo was
connected in the Cloudflare dashboard it created a **Worker with static assets**,
not a Pages project. That distinction is not cosmetic: the Pages-only root
`functions/` convention is ignored on Workers, and the dashboard blocks
environment variables until a worker script is deployed. Decision: stay on
Workers and adapt rather than recreate a Pages project.

What changed in the repo:

- `functions/api/bug-report.js` was **deleted** and replaced by
  **`worker/index.js`** — a single `fetch` handler that owns every request. It
  matches `POST /api/bug-report` explicitly (the path and method checks Pages did
  implicitly, plus a new 405 branch for non-POST), runs the identical guard /
  honeypot / GitHub-issue logic, and falls through to `env.ASSETS.fetch(request)`
  for everything else (the static `dist/` build). The worker lives at the repo
  root, outside `src/` (so Vite and the token-integrity gate never touch it) and
  outside `dist/` (so it never ships as an asset).
- A root **`wrangler.jsonc`** now declares the project (`name: "cadence"`), the
  worker entry (`main: "worker/index.js"`), the assets binding
  (`directory: "./dist"`, `binding: "ASSETS"`, `run_worker_first: ["/api/*"]`),
  and `GH_REPO` as a plaintext `var`. Only `GH_TOKEN` stays a dashboard secret.
- **Build inputs now include `wrangler.jsonc`.** The git-connected build is still
  `npm run build` → `dist`; the deploy step is `npx wrangler deploy`, which reads
  `wrangler.jsonc` to publish the worker alongside the assets.
- The `.gitignore` comments that named "Pages," the `functions/` directory, and
  `wrangler pages dev` were corrected to Workers / `wrangler dev` in the same
  commit as the conversion.

Dashboard follow-up is unchanged in intent, corrected in venue: set `GH_TOKEN`
as a **Workers** project secret (the block lifts once the worker script is
deployed), then retry the deployment so it takes. `GH_REPO` no longer needs a
dashboard entry — it ships in `wrangler.jsonc`.

## Addendum (2026-07-15, third) — grafted onto Cloudflare's Vite-plugin autoconfig

Between the second addendum and pushing, the Cloudflare dashboard's bot had
already committed its own **"Add Cloudflare Workers configuration"** (PR #7,
merged to `origin/main`) — discovered only when the push was rejected for
diverged history. That autoconfig chose the **`@cloudflare/vite-plugin`**
pattern, not the hand-rolled assets binding the second addendum describes. We
grafted our worker onto Cloudflare's scaffolding (a merge commit) rather than
override it, because it matches whatever build the connected dashboard expects
and is Cloudflare's current recommended pattern. This supersedes the second
addendum's config specifics:

- **`vite.config.js`** now includes `cloudflare()` (from Cloudflare's commit).
  `npm run build` (`vite build`) emits **`dist/client/`** (assets) and
  **`dist/cadence/index.js`** (the bundled worker) plus a generated
  `dist/cadence/wrangler.json` and a `.wrangler/deploy/config.json` redirect.
  So there is **no `assets.directory: "./dist"`** — the plugin derives the
  assets dir (`dist/client`); the second addendum's `./dist` line is obsolete.
- **`wrangler.jsonc`** is Cloudflare's base (`$schema`, `nodejs_compat`,
  `observability`, `assets.not_found_handling: "single-page-application"`) plus
  our graft: `main: "worker/index.js"`, `assets.binding: "ASSETS"`,
  `run_worker_first: ["/api/*"]`, `vars.GH_REPO`. `run_worker_first` is
  **load-bearing** under SPA `not_found_handling`: without it an unmatched
  `/api/bug-report` gets the index.html fallback instead of the worker.
- **`wrangler` and `@cloudflare/vite-plugin` are now devDependencies** (from
  Cloudflare's commit), so wrangler is no longer an `npx` fetch.
- **`vitest.config.js`** is new. The `cloudflare()` plugin defines a Worker
  build environment whose `resolve.external` collides with Vitest's node-builtin
  externalization and aborts Vitest at startup. Vitest loads this React-only
  config in preference to `vite.config.js`, so the suite (token gate included)
  runs again. It sits at the repo root, outside the token gate's
  `src/{components,principles}` scan scope.

Build/deploy commands (Cloudflare's generated `package.json` scripts, unchanged):
`npm run dev` = `vite` (worker runs in-process via the plugin);
`npm run build` = `vite build`; `npm run deploy` = `npm run build && wrangler deploy`.
Bare `wrangler deploy` from the root follows the `.wrangler/deploy/config.json`
redirect to the built `dist/cadence/` — confirmed with `wrangler deploy --dry-run`.
The `worker/index.js` handler, the guard/honeypot/GitHub logic, and the
`GH_TOKEN`-secret / `GH_REPO`-var split are all unchanged from the second addendum.
