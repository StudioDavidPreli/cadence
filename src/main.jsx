import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Must run before any component module evaluates useRive: pins both Rive
// runtimes' WASM to our own origin instead of the unpkg/jsdelivr CDNs.
import './utils/riveWasm'
import './tokens/motion.css'
import './tokens/color.css'
// Chrome typography roles (composed into the tool-bar module files via
// `composes: type-* from global`). Global classes, so it loads as a plain
// stylesheet alongside color.css rather than as a CSS module.
import './tokens/type.css'
import { ThemeProvider } from './context/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'

// React Strict Mode enabled.
// All animation architecture is production-correct.
// See CLAUDE.md Known Development Environment Issues for historical context on the investigation.

// ─── Capture rig gate (local builds only) ─────────────────────────────────────
// The case-study capture rig (src/caseStudyMedia/) mounts INSTEAD of the app
// when both hold: the build was made with VITE_CAPTURE=1, and the URL carries
// ?capture=<scene>. Public deploys never set the env var, and Vite replaces
// import.meta.env.VITE_CAPTURE with undefined at build time, so this whole
// branch — including the dynamically imported rig chunk — is dead code in
// every production build. Local run:
//   VITE_CAPTURE=1 npm run build && npx wrangler dev -c dist/cadence/wrangler.json
// then open /?capture=problem-loop
const captureScene = import.meta.env.VITE_CAPTURE
  ? new URLSearchParams(window.location.search).get('capture')
  : null

// ─── Principle embed gate (public) ────────────────────────────────────────────
// ?embed=<slug>&theme=<theme> mounts a single live principle for iframing into
// the hosted case study on davidpreli.com — ExpandedPrincipleBody's third
// frame. A query param rather than a hash route so the Worker can see the
// surface (frame-ancestors) and so it never crosses the deep-link modal's
// #/principles machinery. Lazy import: app visitors never load the chunk.
const embedSlug = new URLSearchParams(window.location.search).get('embed')

if (captureScene) {
  import('./caseStudyMedia/captureRig/index.jsx').then(({ renderCaptureRig }) => {
    renderCaptureRig(document.getElementById('root'), captureScene)
  })
} else if (embedSlug) {
  import('./components/PrincipleEmbed/index.jsx').then(({ renderPrincipleEmbed }) => {
    renderPrincipleEmbed(
      document.getElementById('root'),
      embedSlug,
      new URLSearchParams(window.location.search).get('theme'),
    )
  })
} else {
  // ThemeProvider wraps the entire app so every component in the tree
  // can call useTheme() without receiving theme as a prop.
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </StrictMode>,
  )
}
