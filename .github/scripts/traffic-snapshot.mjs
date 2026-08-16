// Weekly GitHub traffic snapshot for the post-launch ledger
// (docs/case-studies/post-launch-capture.md).
//
// The traffic API retains only 14 days, so history must be accumulated here:
// each run merges its daily buckets into metrics/traffic.json. A later run's
// figure for the same day wins, so a partially-counted "today" is completed
// by next week's overlapping window.
//
// Runs in Actions (.github/workflows/traffic-snapshot.yml) with the
// TRAFFIC_PAT secret, or locally with:
//   GH_TOKEN=$(gh auth token) node .github/scripts/traffic-snapshot.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const repo = 'StudioDavidPreli/cadence'
const token = process.env.TRAFFIC_PAT || process.env.GH_TOKEN
if (!token) {
  console.error('Set TRAFFIC_PAT (or GH_TOKEN): a token with Administration: read on the repo.')
  process.exit(1)
}

const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) {
    // 403 on the traffic endpoints usually means the token lacks
    // Administration: read (fine-grained) or repo scope (classic).
    throw new Error(`${path || '/'} responded ${res.status} ${res.statusText}`)
  }
  return res.json()
}

const [meta, views, clones, referrers, paths] = await Promise.all([
  api(''),
  api('/traffic/views'),
  api('/traffic/clones'),
  api('/traffic/popular/referrers'),
  api('/traffic/popular/paths'),
])

const file = 'metrics/traffic.json'
let data = { daily: {}, snapshots: [] }
try {
  data = JSON.parse(readFileSync(file, 'utf8'))
} catch {
  // first run: start the file fresh
}

for (const v of views.views ?? []) {
  const day = v.timestamp.slice(0, 10)
  data.daily[day] = { ...data.daily[day], views: v.count, viewUniques: v.uniques }
}
for (const c of clones.clones ?? []) {
  const day = c.timestamp.slice(0, 10)
  data.daily[day] = { ...data.daily[day], clones: c.count, cloneUniques: c.uniques }
}

data.snapshots.push({
  capturedAt: new Date().toISOString(),
  stars: meta.stargazers_count,
  forks: meta.forks_count,
  watchers: meta.subscribers_count,
  views14d: { count: views.count, uniques: views.uniques },
  clones14d: { count: clones.count, uniques: clones.uniques },
  referrers,
  paths,
})

mkdirSync('metrics', { recursive: true })
writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log(
  `snapshot written: ${Object.keys(data.daily).length} day(s) of history, ${data.snapshots.length} snapshot(s)`
)
