// Root application shell.
// TokenLab and Principles Library will be wired in here as routing is added.

import { ThemeSwitcher } from './components/ThemeSwitcher'
import { TokenLab } from './components/TokenLab'

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
    }}>
      <ThemeSwitcher />
      <TokenLab />
    </div>
  )
}
