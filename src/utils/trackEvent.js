// Fire-and-forget client side of the anonymous export/import counter
// (POST /api/event in worker/index.js; the decision record is
// docs/decisions/event-counter-2026-08-15.md).
//
// The one rule here: metrics must never break the tool. The fetch is not
// awaited by any caller, its promise rejection is swallowed, and the whole
// call sits in a try/catch because fetch can also throw synchronously (for
// example under a restrictive extension or a malformed argument). An export
// that counts nothing is fine; an export that fails because of counting is
// not.
//
// Privacy posture, enforced here rather than assumed: credentials 'omit' so
// no cookie could ever ride along even if the site one day had any, and the
// body carries only the event name and format. No identifiers, nothing about
// the visitor. keepalive lets the request finish if an export click turns out
// to be the visitor's last act before closing the tab.
export function trackEvent(event) {
  try {
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Same rule as above: a metrics failure is a silent no-op.
  }
}
