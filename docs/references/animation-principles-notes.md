# Animation Principles Repo: Notes for Cadence Build

Source: `docs/references/animation-principles/` (github.com/dylantarre/animation-principles)

---

## What the repo is

144 Claude Code skill definitions organized into 12 categories. Each skill is a structured markdown file that instructs Claude how to apply Disney's 12 animation principles within a specific context. The categories are: domain, thinking style, role/persona, skill level, animation type, emotional outcome, UI element, industry, tool/framework, time scale, principle focus, problem type.

This is not a code library. It contains no installable components, no npm package. It is a collection of prompt documents, some of which include illustrative code snippets.

The most directly useful folders for Cadence:

- `docs/09-by-tool-framework/framer-motion.md` — all 12 principles as Framer Motion JSX snippets
- `docs/07-by-ui-element/` — principle application guides for buttons, modals, carousels, notifications, cards, forms, etc.
- `docs/11-by-principle-focus/` — deep theory documents for each principle including timing heuristics and calibration guidance
- `docs/01-by-domain/web-motion-design.md` — timing ranges and easing curve recommendations for web UI
- `docs/01-by-domain/micro-interactions.md` — component-level timing table and implementation patterns

---

## What is directly applicable

### Easing curves

The repo's standard easing recommendations match Cadence tokens exactly. This is useful confirmation, not new information:

- Standard: `cubic-bezier(0.4, 0, 0.2, 1)` = `--motion-ease-standard`
- Enter: `cubic-bezier(0, 0, 0.2, 1)` = `--motion-ease-enter`
- Exit: `cubic-bezier(0.4, 0, 1, 1)` = `--motion-ease-exit`
- Spring/elastic: `cubic-bezier(0.34, 1.56, 0.64, 1)` = `--motion-ease-spring`

Two curves appear in the repo that are not in Cadence tokens:

- Modal enter: `cubic-bezier(0.16, 1, 0.3, 1)` — a slower, bouncier deceleration than ease.enter
- Toast bounce: `cubic-bezier(0.68, -0.55, 0.27, 1.55)` — sharp anticipation overshoot

These are worth keeping in mind for the Modal (principle 03) and Notification Badge (principle 10) builds. They should not become new tokens unless the difference from ease.spring is perceptible and purposeful.

### Timing calibration

The repo's timing tables align with Cadence's duration token structure. Translated to Cadence tokens:

| Interaction | Repo recommendation | Cadence token |
|---|---|---|
| Button hover | 150ms | duration.base (200ms) or duration.fast (100ms) |
| Button press | 50-100ms | duration.fast |
| Toggle | 150-200ms with spring | duration.base |
| Tooltip show | 150ms | duration.base |
| Tooltip hide | 100ms | duration.fast |
| Modal enter | 250-350ms | duration.slow (400ms) |
| Modal exit | 200ms | duration.base |
| Badge update | 200ms elastic | duration.base + ease.spring |
| Content stagger | 30-50ms per item | delay.short |

The repo leans slightly faster than Cadence's token structure at the low end. Button press at 50-100ms vs. duration.fast at 100ms is a negligible difference. For components where a value between tokens is more accurate, use the token that is closest and note the calibration decision in the component.

### Squash and stretch deformation ranges

The squash-stretch-mastery document gives calibration values useful for the Cadence scale tokens:

- Subtle UI deformation: 2-5% (which maps to scale.subtle at 0.98)
- Standard press: 95-98% height compression (scale.base at 0.95)
- Expressive overshoot: 90% (scale.expressive at 0.9)

This is a useful sanity check. Cadence's scale tokens are within the correct ranges for their semantic intent.

### Stagger delay pattern (principle 05, Follow Through)

The framer-motion.md file shows parent-child overlap using explicit delay offsets: hair at 0.05s delay, cape at 0.1s delay. These map directly to delay.short (50ms) and delay.medium (100ms). This pattern is the correct implementation approach for the Carousel and any staggered list component.

### Modal content stagger (principle 03, Staging)

`docs/07-by-ui-element/modals-dialogs.md` specifies container-first, then content 50-100ms after, then fields stagger at 30-50ms per item. This matches delay.short and delay.medium and is the right architecture for the Modal component build.

---

## What conflicts with Cadence architecture

### Hardcoded values throughout

Every code snippet in the repo hardcodes animation values directly. Duration as a float literal in seconds. Easing as a cubic-bezier string. This is the single most important conflict.

In Cadence, hardcoded animation values are bugs. Every duration, easing, delay, and scale must be read from a CSS custom property at runtime via `getComputedStyle`. Use the repo snippets as structural references only. Before writing any component, replace every literal with a token read.

The correct Cadence pattern:

```javascript
const duration = parseFloat(
  getComputedStyle(document.documentElement)
    .getPropertyValue('--motion-duration-base')
) / 1000;
```

### useAnimation() in the repo

The framer-motion.md file lists `useAnimation` as a standard Framer Motion feature. Cadence's CLAUDE.md prohibits it for components inside AnimatePresence tab panels: useAnimation() creates an AnimationScope that broadcasts tree-wide layout notifications, which can trigger exit animations on sibling panels. Use Framer Motion's imperative `animate(motionValue, target, options)` instead.

The repo is not aware of this constraint. Treat any `useAnimation()` usage in the repo as a pattern to translate, not copy.

### Spring physics as hardcoded values

The repo's exaggeration examples use `stiffness: 200, damping: 10` directly on transition objects. In Cadence, spring character is expressed through `ease.spring` as a cubic-bezier approximation, not through spring physics parameters. This keeps the animation value readable in CSS and consistent across the token system. The cubic-bezier approximation `cubic-bezier(0.34, 1.56, 0.64, 1)` produces equivalent visual results for the scale ranges Cadence uses.

---

## Recommended use by principle

**Adapt directly (structural logic applies, replace all values with token reads):**

- 01 Squash and Stretch: framer-motion.md pattern is correct. Replace `scaleX: [1, 1.2, 1], scaleY: [1, 0.8, 1]` literals with token reads from scale.base and duration.fast.
- 05 Follow Through: delay-stagger pattern maps cleanly to delay.short and delay.medium.
- 08 Secondary Action: the button/icon pattern in framer-motion.md is structurally correct. Replace 0.3s duration with duration.fast token read.
- 10 Exaggeration: framer-motion.md overshoot approach is right. Replace spring physics params with ease.spring cubic-bezier.
- 03 Staging: modal timing hierarchy (backdrop, container, content stagger) from modals-dialogs.md is worth following.

**Reference for calibration only (build from scratch following Cadence conventions):**

- 02 Anticipation: the Drawer component will be new. Use the concept but design the y-offset values and spring character to match the existing Cadence aesthetic, not the repo's generic example.
- 06 Slow In and Slow Out: the Progress Bar is an existing component. No new structural patterns needed, only token-reading confirmation.
- 07 Arc: Tooltip is new and will require SVG path or combined transform animation. The repo's pattern (combined x/y with different easings) is a starting point, but the arc geometry depends on trigger position and will need a different implementation approach.
- 09 Timing: the comparison demonstration uses three simultaneous instances of the same component. This is a Cadence-specific interaction pattern not covered in the repo.
- 12 Appeal / lava lamp grid: build from scratch. The repo offers no useful structural reference for continuous organic grid motion.

**Ignore entirely:**

- `docs/08-by-industry/` and `docs/06-by-emotional-outcome/` have no direct application to the Cadence build.
- `docs/04-by-skill-level/` is audience-calibration content for how Claude should explain things. Not relevant here.
- The installation instructions (Claude Code plugin format) do not apply. The repo is a local reference only.

---

## Token system additions to consider

The current Cadence token set covers the Principles Library build adequately. Two additions worth discussing before the Modal build:

1. A `--motion-ease-decelerate-expressive` token at `cubic-bezier(0.16, 1, 0.3, 1)` for modal entrances that need more travel before settling. This is distinct from ease.enter, which is faster. Only add if the Modal component reveals an audible difference during testing.

2. A `--motion-delay-xshort` at 30ms for fine-grained content stagger inside modals. The current delay.short at 50ms may be too coarse for staggering individual form fields. Decide during the Modal build.

Neither addition changes the token system's semantic structure. They are calibration additions within existing categories.
