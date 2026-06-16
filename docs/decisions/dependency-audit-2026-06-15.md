# Dependency Security Audit — 2026-06-15

Triggered by GitHub Dependabot reporting four vulnerabilities (labeled 1
high, 3 moderate) on every push to `main`. This record covers what the
alerts were, the supply-chain verification done before touching anything,
the fix applied, and what was deliberately deferred.

## Summary

`npm audit fix` was run after confirming the target update was not tied
to any known supply-chain breach. It bumped PostCSS from 8.5.9 to 8.5.15,
clearing one alert. Vulnerability count dropped from 4 to 2. The two
remaining alerts are esbuild issues pulled in through Vite 5; they only
clear with a Vite major upgrade, which was deferred to the Week 8 polish
pass rather than forced now.

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

## What was deferred, and why

The two remaining alerts (esbuild Deno RCE and esbuild dev-server) only
clear by moving off Vite 5. `npm audit fix --force` wants to jump
straight to Vite 8, four majors up from 5.4.21, which would break the
config. That was not run.

Plan for Week 8 (Integration + Polish): upgrade Vite intentionally to 6.x
or 7.x, read its migration notes, and run the app to confirm no
regression. That single upgrade pulls patched esbuild and vite
transitively and clears both remaining alerts. Re-run the supply-chain
verification above against whatever versions the upgrade actually
resolves, since a Vite major pulls in a larger, newer transitive set and
today's all-clear does not automatically carry forward.

## Sources

- Microsoft, Mitigating the Axios npm supply chain compromise: https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/
- Unit 42, The npm Threat Landscape: https://unit42.paloaltonetworks.com/monitoring-npm-supply-chain-attacks/
- Strobes, TanStack npm Supply Chain Attack 2026: https://strobes.co/blog/tanstack-npm-supply-chain-attack/
- StepSecurity, node-ipc npm supply chain attack: https://www.stepsecurity.io/blog/node-ipc-npm-supply-chain-attack
- PostCSS XSS advisory GHSA-qx2v-qp2m-jg93: https://github.com/advisories/GHSA-qx2v-qp2m-jg93
