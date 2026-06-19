# Dependency Security Audit — 2026-06-15

Triggered by GitHub Dependabot reporting four vulnerabilities (labeled 1
high, 3 moderate) on every push to `main`. This record covers what the
alerts were, the supply-chain verification done before touching anything,
the fix applied, and what was deliberately deferred.

## Summary

`npm audit fix` was run after confirming the target update was not tied
to any known supply-chain breach. It bumped PostCSS from 8.5.9 to 8.5.15,
clearing the PostCSS alert. Within hours, two newly disclosed Vite
advisories landed (see "Late additions" below), so GitHub's open count
read 5 by session end rather than the 2 the local `npm audit` showed. The
discrepancy is advisory-database sync lag, not a regression: the PostCSS
fix is confirmed resolved on both sides. Every remaining alert is a
Vite/esbuild dev-toolchain issue, and all of them clear with a single
deliberate Vite major upgrade, deferred to the Week 8 polish pass rather
than forced now.

## The four original alerts

All four live in the build and development toolchain, not in anything
that ships to a user. Cadence builds to static HTML, CSS, and JS. Vite,
esbuild, and PostCSS run on the developer's machine during `dev` and
`build` and are absent from the deployed artifact.

| Package | Severity | Installed | Issue | Patched in |
|---------|----------|-----------|-------|------------|
| esbuild | high | 0.21.5 | Missing binary integrity check in the Deno loader enables RCE via `NPM_CONFIG_REGISTRY` (GHSA-gv7w-rqvm-qjhr) | 0.28.1 |
| esbuild | moderate | 0.21.5 | Dev server lets any website send requests to it and read the response (GHSA-67mh-4wv8-2f99) | 0.25.0 |
| vite | moderate | 5.4.21 | Path traversal in optimized-deps `.map` handling on the dev server (GHSA-4w7w-66w2-5vf9) | 6.4.2 |
| postcss | moderate | 8.5.9 | XSS via an unescaped `</style>` in CSS stringify output (GHSA-qx2v-qp2m-jg93) | 8.5.10 |

GitHub and `npm audit` map the severities slightly differently (GitHub
called it 1 high / 3 moderate; npm called it 2 high / 1 moderate / 1
low). Same four advisories underneath.

### Practical exposure

- esbuild Deno RCE (high): does not apply. The vulnerability is in
  esbuild's Deno module loader. Cadence is an npm/Vite project with no
  Deno anywhere. This is the highest-labeled alert and the least
  relevant. It can be dismissed in the Dependabot UI as "not affected."
- esbuild dev-server and vite path-traversal (both moderate):
  dev-server only. Each requires an attacker to get the developer to open
  a malicious page while `npm run dev` is running, which then pokes at
  localhost:5173. Neither affects `npm run build` output.
- postcss XSS (moderate): the only one touching build output. It
  triggers when PostCSS stringifies attacker-controlled CSS containing
  `</style>`. Cadence's CSS is hand-authored design tokens, not untrusted
  input, so it is not exploitable in practice. It was also the cheapest
  to fix.

## Supply-chain verification (done before running the fix)

The question asked before applying anything: is the update itself, or
anything it pulls in, tied to a known breach? Checked three ways and all
clean.

PostCSS 8.5.10 (the patch target) and the line up to 8.5.15:

- Provenance. Published by `ai` (Andrey Sitnik), the long-time legitimate
  PostCSS maintainer, the same account that published the installed
  8.5.9. No maintainer change, which is the usual fingerprint of an
  account takeover.
- Release cadence. A normal steady sequence with no anomalous gaps or
  off-schedule publishes: 8.5.9 (Apr 7) → 8.5.10 (Apr 15) → 8.5.11,
  8.5.12, 8.5.13, 8.5.14 → 8.5.15 (latest, May 19), all from the same
  maintainer.
- Timing. 8.5.10 predates every named 2026 supply-chain incident
  (TanStack May 11, node-ipc May 14, RedHat June 1, node-gyp June). The
  "postcss 7.0.39" reference that surfaced in searching was a red
  herring: an old 7.x vulnerability listing, a different major line, and
  the node-gyp incident is about node-gyp, not PostCSS.

None of the 2026-compromised packages are anywhere in the lockfile:

| Compromised package | In Cadence? |
|---------------------|-------------|
| axios / plain-crypto-js (RAT) | absent |
| node-ipc | absent |
| @tanstack/* | absent |
| @redhat-cloud-services/* | absent |
| node-gyp | absent |

Cadence's dependency surface is small: `@rive-app/react-canvas`,
`framer-motion`, `react`, `react-dom`, with `vite` and the React plugin
plus type packages as devDependencies. No native-compilation packages, no
HTTP clients, none of the ecosystems that were hit.

## What was applied

`npm audit fix` (non-breaking). PostCSS 8.5.9 → 8.5.15.

The run also refreshed transitive dependencies within their existing
semver ranges: the `@babel/*` set pulled in by `@vitejs/plugin-react`,
plus `nanoid`, `picocolors`, and the browserslist data packages
(`caniuse-lite`, `electron-to-chromium`, `node-releases`,
`baseline-browser-mapping`) from the PostCSS and browserslist trees. No
change to `package.json`, no major-version crossings, and `nanoid` shares
the same maintainer (`ai`) as PostCSS. This is expected behavior for
`npm audit fix` without `--force`: it makes only semver-compatible
updates inside the ranges already declared.

Verification after the fix:

- The installed 8.5.15 integrity hash matches the npm registry exactly
  (`sha512-FfR8sjd4em2T6fb3I2MwAJU7HWVMr9zba+enmQeeWFfCbm+UOC/0X4DS8XtpUTMwWMGbjKYP7xjfNekzyGmB3A==`).
  Because npm pins SRI hashes in `package-lock.json`, a later tampering of
  the registry tarball would fail `npm ci` rather than install silently.
- `npm run build` passes clean (439 modules, built in ~1.1s, no errors).

## Late additions (disclosed during the session)

Shortly after the PostCSS fix was pushed, GitHub's open count read 5
rather than the expected 2. The cause was two newly disclosed Vite
advisories, not a problem with the fix. The full open set at session end:

| Severity | Package | Advisory | Disclosed | Note |
|----------|---------|----------|-----------|------|
| high | esbuild | GHSA-gv7w-rqvm-qjhr | 2026-06-13 | Deno-loader RCE; not applicable (no Deno) |
| high | vite | GHSA-fx2h-pf6j-xcff | 2026-06-16 | newly disclosed |
| moderate | vite | GHSA-v6wh-96g9-6wx3 | 2026-06-16 | newly disclosed |
| moderate | vite | GHSA-4w7w-66w2-5vf9 | 2026-05-15 | path traversal, dev server |
| moderate | esbuild | GHSA-67mh-4wv8-2f99 | 2026-05-15 | dev server CORS |

The PostCSS advisory (GHSA-qx2v-qp2m-jg93) is no longer in the open set
on either GitHub or local `npm audit`, confirming the fix took on both
sides. Local `npm audit` reported only 2 high at session end because
npm's advisory database had not yet synced the June 16 GHSAs that GitHub
surfaced first. All five remaining alerts are Vite/esbuild and live in
the dev toolchain; none ship in the built artifact. The June 16 high
(GHSA-fx2h-pf6j-xcff) should be read in full when Week 8 starts to
confirm it is also dev-scoped.

## What was deferred, and why

The five remaining alerts (the two esbuild issues plus three Vite issues,
including the two disclosed June 16) only clear by moving off Vite 5.
`npm audit fix --force` wants to jump straight to Vite 8, four majors up
from 5.4.21, which would break the config. That was not run.

Plan for Week 8 (Integration + Polish): upgrade Vite intentionally to 6.x
or 7.x, read its migration notes, and run the app to confirm no
regression. That single upgrade pulls patched esbuild and vite
transitively and clears all five remaining alerts. Re-run the supply-chain
verification above against whatever versions the upgrade actually
resolves, since a Vite major pulls in a larger, newer transitive set and
today's all-clear does not automatically carry forward.

## Upgrade applied (2026-06-18)

The deferred Vite major upgrade was done. Versions:

- `vite` 5.4.21 to 7.3.5
- `@vitejs/plugin-react` 4.3.1 to 5.2.0
- added `vitest` 4.1.9 and a `test` script (the upgrade was sequenced ahead of
  adding the test harness so Vitest pins once against the final Vite major)

Vite 7 was chosen over the latest Vite 8 on purpose. Vite 8's matched plugin
(`@vitejs/plugin-react` 6.x) peer-depends on `@rolldown/plugin-babel` and
`babel-plugin-react-compiler`, toolchain surface this project does not need.
`@vitejs/plugin-react` 5.2.0 spans Vite 7 and 8, so a later step to 8 stays open
without re-pinning the plugin.

Result. The four original alerts and the two Vite advisories disclosed June 16 all
cleared, confirming the prediction above. One new advisory remained after the upgrade:

| Severity | Package | Advisory | Note |
|----------|---------|----------|------|
| low | esbuild | GHSA-g7r4-m6w7-qqqr | arbitrary file read via the dev server on Windows; esbuild 0.27.3–0.28.0 |

It was left in place, not forced. It is low severity, scoped to the dev server on
Windows (this project is developed on macOS), and absent from the build output like
every other toolchain advisory here. `npm audit fix` without `--force` cannot clear it
because the patched esbuild sits outside Vite 7's pinned range; forcing it would pull
esbuild out of the range Vite 7 was tested against for no real gain. esbuild resolved
at 0.27.7.

Supply-chain re-verification (required above, since a Vite major pulls a larger
transitive set):

- None of the 2026-compromised packages (axios/plain-crypto-js, node-ipc, @tanstack/*,
  @redhat-cloud-services/*, node-gyp) appear anywhere in the tree.
- Every dependency resolves from `registry.npmjs.org`; no off-registry URLs in the
  lockfile.
- All entries carry SRI integrity hashes, so `npm ci` fails closed on tampering.
- New transitive majors: vite 7.3.5, @vitejs/plugin-react 5.2.0, vitest 4.1.9,
  esbuild 0.27.7, rollup 4.60.1.

Build verified clean on Vite 7: 486 modules, 517.87 kB JS (161.65 kB gzipped), no
regression from the pre-upgrade 516 kB.

## Sources

- Microsoft, Mitigating the Axios npm supply chain compromise: https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/
- Unit 42, The npm Threat Landscape: https://unit42.paloaltonetworks.com/monitoring-npm-supply-chain-attacks/
- Strobes, TanStack npm Supply Chain Attack 2026: https://strobes.co/blog/tanstack-npm-supply-chain-attack/
- StepSecurity, node-ipc npm supply chain attack: https://www.stepsecurity.io/blog/node-ipc-npm-supply-chain-attack
- PostCSS XSS advisory GHSA-qx2v-qp2m-jg93: https://github.com/advisories/GHSA-qx2v-qp2m-jg93
- Vite advisory GHSA-fx2h-pf6j-xcff (high, disclosed 2026-06-16): https://github.com/advisories/GHSA-fx2h-pf6j-xcff
- Vite advisory GHSA-v6wh-96g9-6wx3 (disclosed 2026-06-16): https://github.com/advisories/GHSA-v6wh-96g9-6wx3
