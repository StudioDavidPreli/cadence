// Triggers a client-side file download for a text payload. Builds a Blob, points
// a temporary object URL at it, clicks a synthetic <a download>, then revokes the
// URL so it is not leaked. Entirely in-browser: the exported file never touches
// a server.
//
// Lived inside TokenLab/index.jsx until the export modal (2026-09-15) needed it
// from a second component. A shared util rather than an export from TokenLab,
// because TokenLab imports the modal and the modal importing TokenLab back
// would be a cycle.
export function downloadTextFile(filename, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
