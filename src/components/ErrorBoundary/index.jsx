import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

// React requires a CLASS component for an error boundary: getDerivedStateFromError
// and componentDidCatch have no hook equivalent, so this cannot be a function
// component. It catches errors thrown during render/lifecycle in its subtree and
// shows a recoverable message, instead of letting React unmount the whole root to
// a blank white page — which is exactly what the motion-token NaN crash did
// before this existed. See docs/decisions/motion-token-nan-crash-2026-07-15.md.
//
// It does NOT catch errors thrown in event handlers or async callbacks — React
// never routes those through boundaries. This is a safety net for render-time
// throws (the NaN → Element.animate crash was one), not a catch-all.
export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // React already logs this in dev; log in every mode so a production crash
    // still leaves a trace in the browser console and the Workers logs.
    console.error('[ErrorBoundary] caught a render error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const {
      title = 'Something went wrong',
      message = 'This part of the page hit an unexpected error. Reloading usually clears it.',
    } = this.props

    return (
      <div className={styles.boundary} role="alert">
        <div className={styles.card}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.message}>{message}</p>
          <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
