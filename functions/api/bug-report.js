// Cloudflare Pages Function: POST /api/bug-report
//
// Receives a bug report from the Motion Tiles panel and opens a GitHub issue in
// this repo. David's email never appears client-side and no address is involved:
// the client holds nothing secret, the GitHub token and repo live in Pages
// environment variables (GH_TOKEN, GH_REPO), read here server-side.
//
// GH_TOKEN is a fine-grained PAT scoped to this repo with Issues: read and write.
// GH_REPO is "owner/name" (e.g. StudioDavidPreli/cadence). Both are set in the
// Cloudflare Pages dashboard, not in the repo. Locally they come from .dev.vars
// (gitignored) when running `npx wrangler pages dev`.
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { message, tile, website } = body;

  // Honeypot: real form leaves this empty, bots fill it. Drop silently.
  if (website) return new Response(null, { status: 204 });

  // Reject missing, non-string, whitespace-only, or over-long messages. The
  // trim check closes the gap where a spaces-only body passed the bare !message
  // guard; the typeof check keeps .trim() from throwing on a non-string payload.
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
    return new Response('Bad request', { status: 400 });
  }

  const res = await fetch(`https://api.github.com/repos/${env.GH_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'cadence-bug-report',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Bug report: ${tile || 'Motion Tiles'}`,
      body: message,
      labels: ['bug-report'],
    }),
  });

  if (!res.ok) return new Response('Upstream error', { status: 502 });
  return new Response(null, { status: 204 });
}
