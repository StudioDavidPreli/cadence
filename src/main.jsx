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
