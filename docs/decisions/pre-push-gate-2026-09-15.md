# The pre-push gate becomes a hook

**Date:** 2026-09-15
**Status:** Built.

## The finding

The tracker has called `npm run test:e2e` "the pre-push gate" since deploy
week, and the Playwright config calls itself the Tier 1 deploy gate. Nothing
enforced either. The repo had no pre-push hook, no hooks path, and one
GitHub workflow (the traffic snapshot). A push to main is the deploy, through
Cloudflare's Git integration, so a skipped suite was not a missed check
before a merge; it was a production deploy nobody had tested end to end.

On 2026-09-15 ten commits reached main in eight pushes, and the full suite
ran before one of them. Each push had been checked against a hand-picked
subset of specs, each subset reasonable on its own. The one full run caught
an older test still clicking the tool bar's DTCG button, a control the export
modal had removed forty minutes and three deploys earlier. A test bug rather
than a product bug, and the difference between those two is exactly what a
suite is for.

A second hazard sat underneath. The Playwright server block had
`reuseExistingServer: true` with a command of `npm run build && npx wrangler
dev`. Anything already listening on 8787 made Playwright skip the command,
the build included, and run the suite against whatever that server was
serving. Twice that day a workerd from an earlier run was still holding the
port after Playwright finished. A suite run in that state passes against a
stale build and reports green for source it never compiled, which is the
failure the config's own header says the setup exists to prevent.

## What changed

- **`.githooks/pre-push`**, tracked. Runs lint, the unit suite, and the full
  e2e suite on built output; refuses the push on any failure. It checks that
  8787 is free first and refuses rather than kills what is on it (the server
  may be yours), and afterward stops the workerd it caused, since wrangler's
  child can outlive the npm process Playwright stopped. `git push
  --no-verify` remains the escape, to be used knowingly.
- **`core.hooksPath`** points at that folder. Set once locally, and the
  package's `prepare` script sets it on `npm install`, so a fresh clone gets
  the gate without a setup step. The `|| true` keeps an install without git
  (a CI build) from failing on it.
- **`reuseExistingServer: false`** in the Playwright config. The suite
  always builds and starts its own server; a busy port is a loud error.
- **CLAUDE.md** states the rule under the built-output rule: a hand-picked
  subset of specs does not satisfy the gate.

## Cost

A minute and a half per push on this machine, measured on the hook's first
run: lint, the unit suite (about 8 seconds), the build, and 133 e2e tests
(about 70 seconds). The eight pushes of 2026-09-15 would have spent twelve
minutes on it. One boundary flake on that first run (a Reorder drag) was
absorbed by the config's single retry; a real failure fails twice.

## Not done

- CI on GitHub. It would be a red light after the deploy rather than a gate
  before it, unless the deploy itself moved behind CI, which is a larger
  change to a pipeline that works. Cloudflare's own build step could run
  lint and unit tests but not a browser suite. The local hook is the only
  place the full suite can stand between a push and production today.
