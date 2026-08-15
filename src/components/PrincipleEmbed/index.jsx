import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useReducedMotion } from 'framer-motion'
import { StaticThemeProvider, THEMES } from '../../context/ThemeContext'
import { ErrorBoundary } from '../ErrorBoundary'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { principleBySlug } from '../../data/principles'
import { ExpandedPrincipleBody } from '../PrincipleCard/ExpandedPrincipleBody'
import { RiveClockEmbed } from './RiveClockEmbed'
import styles from './PrincipleEmbed.module.css'

// Custom embed surfaces that are not principles. Checked before the slug
// table, so these names shadow nothing in it (and none collide today).
const CUSTOM_EMBEDS = {
  // V09: the Rive Clock demo, canvas only, self-touring ghost pointer.
  'rive-clock': RiveClockEmbed,
}

// ─── PrincipleEmbed ───────────────────────────────────────────────────────────
//
// The third frame for ExpandedPrincipleBody (after the in-grid card and the
// deep-link modal): a standalone document for iframing a single live principle
// into the hosted case study on davidpreli.com.
//
//   https://cadence.davidpreli.com/?embed=<slug>&theme=<theme>
//
// Mounted by main.jsx instead of the app when ?embed= is present. A query
// param, not a hash route, on purpose: the server can see it (the Worker's
// frame-ancestors header exists for this surface), and it never touches
// useHashRoute's principle-modal machinery, so the two link shapes cannot
// interfere. The chunk is lazy: visitors of the app never load it.
//
// What the shell reproduces is the deep-link modal's presentation: the
// 460×520 body inside the accent-bordered raised panel (Modal's .panel look),
// minus the modal behaviors that make no sense in an iframe (no backdrop, no
// Escape, no ×, no focus trap — the host page owns navigation).
//
// Tokens arrive through useMotionTokens' no-provider path: the CSS channel,
// reading motion.css defaults. There is no Token Lab here to edit them, and
// that is fine for the embed's job; OS reduce-motion still flattens through
// the same path, and the View-motion control renders as it does in-app.

// Mirrors PrinciplesLibrary's DeepLinkBody: the same threaded state trio, held
// in the component that mounts once per document so it needs no reset logic.
function EmbedBody({ principle }) {
  const tokens = useMotionTokens()
  const prefersReducedMotion = useReducedMotion()
  const [uiMode, setUiMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showDemoMotion, setShowDemoMotion] = useState(false)

  // Same coupling as PrincipleCard.handleStateToggle: flipping the Motion/UI
  // view dismisses P02's drawer so it does not linger across the switch.
  const handleToggleState = () => {
    if (drawerOpen) setDrawerOpen(false)
    setUiMode(prev => !prev)
  }

  return (
    <div className={styles.stage}>
      <div className={styles.panel}>
        <ExpandedPrincipleBody
          principle={principle}
          tokens={tokens}
          prefersReducedMotion={prefersReducedMotion}
          uiMode={uiMode}
          onToggleState={handleToggleState}
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          showDemoMotion={showDemoMotion}
          setShowDemoMotion={setShowDemoMotion}
          onClose={() => {}}
          hideClose
        />
      </div>
    </div>
  )
}

// Fail-soft surface for a bad slug: a quiet line and the way to the real site,
// matching the deep-link router's drop-the-segment philosophy.
function UnknownEmbed() {
  return (
    <div className={styles.stage}>
      <p className={styles.unknown}>
        No such principle. The full library is at{' '}
        <a href="https://cadence.davidpreli.com">cadence.davidpreli.com</a>.
      </p>
    </div>
  )
}

export function renderPrincipleEmbed(rootEl, slug, themeParam) {
  // The host page picks the theme; anything unrecognized falls back to dark
  // (David's embed default, 2026-07-31). Written to the attribute before
  // render so color.css resolves on first paint, then held by
  // StaticThemeProvider — never persisted, so the visitor's saved theme for
  // the main site survives an embed visit.
  const theme = THEMES.includes(themeParam) ? themeParam : 'dark'
  document.documentElement.setAttribute('data-theme', theme)

  const Custom = CUSTOM_EMBEDS[slug]
  const principle = Custom ? null : principleBySlug(slug)

  createRoot(rootEl).render(
    <StrictMode>
      <StaticThemeProvider theme={theme}>
        <ErrorBoundary>
          {Custom ? (
            <Custom />
          ) : principle ? (
            <EmbedBody principle={principle} />
          ) : (
            <UnknownEmbed />
          )}
        </ErrorBoundary>
      </StaticThemeProvider>
    </StrictMode>,
  )
}
