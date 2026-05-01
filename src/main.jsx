import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tokens/motion.css'
import './tokens/color.css'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'

// React Strict Mode enabled.
// All animation architecture is production-correct.
// See CLAUDE.md Known Development Environment Issues for historical context on the investigation.

// ThemeProvider wraps the entire app so every component in the tree
// can call useTheme() without receiving theme as a prop.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
