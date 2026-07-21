import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { principleHash } from '../../hooks/useHashRoute'
import { useChromeTransition } from '../../hooks/useChromeTransition'
import styles from './PrincipleCard.module.css'

// How long the "Copied" confirmation holds before the label reverts to "Link".
// A plain hold timer, not an animation, so it needs no token; matches CodeBlock's
// copy affordance.
const COPIED_HOLD_MS = 1500

// ─── CopyLinkButton ───────────────────────────────────────────────────────────
// Writes this principle's canonical deep URL to the clipboard, then swaps its
// label to "Copied" for a moment. It is chrome, not demonstration: the label
// swap fades on the fixed --feedback-* timing (useChromeTransition().ui), never
// the editable --motion-* tokens, so Explore mode can't flatten the feedback.
// The URL is built from principleHash so this control and the hash serializer
// cannot drift on the link shape. A clipboard failure (insecure context) is a
// silent no-op, the same posture as CodeBlock and the export Copy button.
function CopyLinkButton({ principle }) {
  const [copied, setCopied] = useState(false)
  const chrome = useChromeTransition()
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const handleCopy = async () => {
    const url =
      window.location.origin + window.location.pathname + principleHash(principle.id)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_HOLD_MS)
    } catch {
      // Clipboard API unavailable in insecure contexts; a failed copy is silent.
    }
  }

  return (
    <button
      type="button"
      className={styles.copyLink}
      onClick={handleCopy}
      aria-live="polite"
    >
      {/* Keyed on the label so React remounts the span on each swap; the new
          label fades in on chrome.ui, which is the confirmation's motion. */}
      <motion.span
        key={copied ? 'copied' : 'link'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={chrome.ui}
      >
        {copied ? 'Copied' : 'Link'}
      </motion.span>
    </button>
  )
}

// ─── QuoteBlock ───────────────────────────────────────────────────────────────
//
// The quote, attribution, and token row below the expanded card's main content
// area. Rendered by ExpandedPrincipleBody, so it appears identically in the
// in-grid expanded card and the deep-link modal.
//
// quoteContent is stack-grided: both motion-state and ui-state versions render
// at the same grid cell, opacity-crossfaded on uiMode change. This pins the
// quoteContent height at max(motion, ui), so the quoteBlock does not jump
// vertically when toggling and the expandedContent above retains its space.
//
// The inner crossfade does not need to be gated by isStable. The expandedWrapper
// itself fades opacity on enter/exit, so during the card's open/close the
// QuoteBlock's children inherit the wrapper's opacity ramp regardless of their
// own animate prop value.
//
// tokenRow carries principle.tokens (invariant across motion and ui) alongside
// the copy-link control, which writes this principle's deep URL to the clipboard.
// The control is chrome, not demonstration: its confirmation reads the fixed
// --feedback-* timing via useChromeTransition, never the editable --motion-*
// tokens, so Explore mode can never flatten its feedback. Placement here (below
// the QuoteBlock divider) keeps it clear of the toggle/divider invariant that
// governs the contentHalf column above.

export function QuoteBlock({ principle, uiMode, tokens: motionTokens }) {
  return (
    <div className={styles.quoteBlock}>
      <div className={styles.quoteStack}>
        <motion.div
          className={styles.quoteContent}
          animate={{ opacity: uiMode ? 0 : 1 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.standard }}
          style={{ pointerEvents: uiMode ? 'none' : 'auto' }}
          aria-hidden={uiMode}
        >
          <p className={styles.quoteText}>{principle.animationQuote}</p>
          {principle.animationQuoteAttribution && (
            <p className={styles.quoteAttribution}>
              — {principle.animationQuoteAttribution}
            </p>
          )}
        </motion.div>
        <motion.div
          className={styles.quoteContent}
          animate={{ opacity: uiMode ? 1 : 0 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.standard }}
          style={{ pointerEvents: uiMode ? 'auto' : 'none' }}
          aria-hidden={!uiMode}
        >
          <p className={styles.quoteText}>{principle.componentQuote}</p>
          {principle.componentQuoteAttribution && (
            <p className={styles.quoteAttribution}>
              — {principle.componentQuoteAttribution}
            </p>
          )}
        </motion.div>
      </div>

      <div className={styles.tokenRow}>
        <span className={styles.tokenText}>{principle.tokens}</span>
        <CopyLinkButton principle={principle} />
      </div>
    </div>
  )
}
