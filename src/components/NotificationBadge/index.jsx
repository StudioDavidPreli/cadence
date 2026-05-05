import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './NotificationBadge.module.css'

// ─── NotificationBadge ────────────────────────────────────────────────────────
//
// A small count pill anchored to a parent surface. The interesting motion is
// not the entrance — the entrance is a side effect — it's the OVERSHOOT on
// every count change. The new value compresses to scale.expressive and
// springs back through 1, briefly passing above 1 before settling. That
// brief excursion is the alert: you don't have to read the number to know
// the number changed.
//
// Why the badge re-keys on count change:
// motion's enter animation only fires on mount. Treating each count as its
// own element (key={count}) remounts the pill on every increment, so the
// initial → animate transition runs each time. Re-keying is the right tool
// for "play this animation every time the value changes."
//
// Why scale.expressive is the start, not the end:
// scale.expressive resolves to 0.9 — a compress, not a magnify. The pill
// starts compressed, climbs through a peak above 1, holds briefly, then
// settles back to 1. Three motion phases:
//
//   compress → peak     ease.spring   the launch (overshoot above peak)
//   peak    → peak      linear        the hold (the alert lingers)
//   peak    → 1         ease.standard the settle (no second overshoot)
//
// EXAGGERATED_PEAK is hand-tuned and deliberately above any scale token.
// That's the principle's argument: Exaggeration is the system going past
// its own rules to signal intensity. The compress is system-correct
// (scale.expressive); the peak is the violation. If we used a token here,
// the badge would express System, not Exaggeration.
const EXAGGERATED_PEAK = 1.2

export function NotificationBadge({ count = 0, label = 'Inbox' }) {
  const tokens = useMotionTokens()
  const compress = tokens.scale.expressive

  return (
    <div className={styles.anchor}>
      <span className={styles.label}>{label}</span>
      {count > 0 && (
        <motion.span
          className={styles.badge}
          key={count}
          initial={{ scale: compress }}
          animate={{ scale: [compress, EXAGGERATED_PEAK, EXAGGERATED_PEAK, 1] }}
          transition={{
            duration: tokens.duration.slow,
            // 0 → 0.3: launch. 0.3 → 0.6: hold at peak. 0.6 → 1: settle.
            times: [0, 0.3, 0.6, 1],
            ease: [tokens.ease.spring, 'linear', tokens.ease.standard],
          }}
          aria-label={`${count} unread`}
        >
          {count}
        </motion.span>
      )}
    </div>
  )
}
