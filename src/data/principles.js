// ─── Principle records ────────────────────────────────────────────────────────
//
// The eighteen principles, moved here from PrinciplesLibrary so the data is a
// leaf module with no component imports. That matters for one specific reason:
// useHashRoute needs the id ↔ slug ↔ category mapping to resolve a deep-link
// segment (#/principles/<filter>/<slug>), and it cannot import PrinciplesLibrary
// to get it — PrinciplesLibrary → PrincipleCard → the demos is a component tree,
// and pulling it into the router would be a cycle. A pure data module both sides
// import from keeps one source of truth for the copy AND the slug table.
//
// The `slug` field is authored, not computed from the title. A shared URL should
// read like language (#/principles/classic/follow-through, not /5), and which
// words a principle answers to in a link is a design decision, so the mapping is
// written down rather than derived by a slugify() at runtime.
//
// Copy constraints (summary / componentSummary ceilings, no em-dashes) live in
// docs/principles/conventions.md and CLAUDE.md; they apply to every field here.

export const PRINCIPLES = [
  {
    id: 1, slug: 'squash-and-stretch', title: 'Squash & Stretch', category: 'classic',
    summary: 'Objects compress on impact and stretch on release, implying weight and flexibility.',
    componentSummary: 'Press compresses. Release returns. The button has weight.',
    animationQuote: 'Squash and stretch is by far the most important discovery.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The press compresses. The release returns. A button with no give reads as image, not interface.',
    componentQuoteAttribution: null,
    tokens: 'scale.pressBase · duration.fast · ease.standard · ease.overshoot',
  },
  {
    id: 2, slug: 'anticipation', title: 'Anticipation', category: 'classic',
    summary: 'Countermotion is what makes an action read as caused, not arbitrary.',
    componentSummary: 'The drawer lifts before it leaves. The exit announces itself.',
    animationQuote: 'A dancer jumping off the floor has to bend the knees first; a golfer making a swing has to swing the club back first.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Interfaces that skip the windup feel abrupt. A small reverse motion prepares the eye for the move.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.enter · ease.exit',
  },
  {
    id: 3, slug: 'staging', title: 'Staging', category: 'classic',
    summary: 'Direct attention to what matters. Clear the stage before the performance.',
    componentSummary: 'The modal opens. The backdrop dims. The page narrows to one thing.',
    animationQuote: 'The presentation of any idea so that it is completely and unmistakably clear.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The backdrop is not decoration. It is the stage management that tells the user where to look.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.enter',
  },
  {
    id: 4, slug: 'pose-to-pose', title: 'Straight Ahead & Pose to Pose', gridTitle: 'Pose to Pose', category: 'classic',
    summary: 'Two approaches to animation: frame by frame versus key poses with fills between.',
    componentSummary: 'Steps mark the poses. The bar fills between. Both are the same idea.',
    animationQuote: 'Straight ahead produces surprise. Pose to pose produces structure. Neither alone is enough.',
    animationQuoteAttribution: null,
    componentQuote: 'Steppers define the poses. The fill animation is the frames between. Both are the same argument.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · delay.short · delay.medium',
  },
  {
    id: 5, slug: 'follow-through', title: 'Follow Through', category: 'classic',
    summary: 'Not everything stops at the same time. Secondary elements continue past the primary action.',
    componentSummary: 'Slide and dot ride one spring past rest, then settle.',
    animationQuote: 'When an object stops, all parts of it do not stop at the same time.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'The slide carries past its mark and settles. The dot rides the same spring, so the whole control has weight.',
    componentQuoteAttribution: null,
    tokens: 'spring.stiffness · spring.damping · spring.mass',
  },
  {
    id: 6, slug: 'slow-in-slow-out', title: 'Slow In & Slow Out', category: 'classic',
    summary: 'Objects accelerate from rest and decelerate to rest. Nothing starts or stops instantly.',
    componentSummary: 'The bar fills, then settles at the end. Tokens is adjusted with the tool bar.',
    animationQuote: 'More drawings near the beginning and end of an action, fewer in the middle.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Linear motion belongs to machines. Easing curves are how software admits it has mass.',
    componentQuoteAttribution: null,
    tokens: 'ease.standard · ease.linear · duration.slow',
  },
  {
    id: 7, slug: 'arc', title: 'Arc', category: 'classic',
    summary: 'Natural movement follows curved paths, not straight lines.',
    componentSummary: 'The tooltip leaves the trigger and arcs into place. Not a straight line.',
    animationQuote: 'Most natural action tends to follow an arched trajectory.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'A tooltip that rises straight up arrives as a notification. One that arcs arrives as an answer.',
    componentQuoteAttribution: null,
    tokens: 'duration.base · ease.enter',
  },
  {
    id: 8, slug: 'secondary-action', title: 'Secondary Action', category: 'classic',
    summary: 'A supporting action that reinforces the main action without competing with it.',
    componentSummary: 'The menu opens. The chevron rotates with it. The rotation confirms.',
    animationQuote: 'Supporting gestures enrich the main action. They do not compete with it.',
    animationQuoteAttribution: null,
    componentQuote: 'The chevron rotates as the menu opens. The chevron is not the story. It confirms the story.',
    componentQuoteAttribution: null,
    tokens: 'duration.fast · ease.standard',
  },
  {
    id: 9, slug: 'timing', title: 'Timing', category: 'classic',
    summary: 'Duration determines weight and personality. More time means heavier, slower, more considered.',
    componentSummary: 'The character of the component changes when varying the easing duration.',
    animationQuote: 'A variety of slow and fast timing within a scene adds texture and interest to the movement.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Have a known purpose for every animation in your interface.',
    componentQuoteAttribution: 'Val Head, Designing Interface Animation',
    tokens: 'duration.fast · duration.base · duration.slow',
  },
  {
    id: 10, slug: 'exaggeration', title: 'Exaggeration', category: 'classic',
    summary: 'Amplify an action beyond reality to clarify or heighten its emotional truth.',
    componentSummary: 'The badge count climbs. The number overshoots before it lands.',
    animationQuote: 'Exaggeration is not extreme distortion, but a caricature of facial features, expressions, poses, attitudes and actions.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: "The notification doesn't just appear. It overshoots, and that overshoot is the alert.",
    componentQuoteAttribution: null,
    tokens: 'scale.pressExpressive · ease.overshoot · duration.slow',
  },
  {
    id: 11, slug: 'solid-drawing', title: 'Solid Drawing', category: 'classic',
    summary: 'Understand three-dimensional form, weight, and balance even in 2D.',
    componentSummary: 'The card lifts. Shadow grows. What was flat is now above the page.',
    animationQuote: 'Form, weight, volume solidity and the illusion of 3D apply to animation as it does to academic drawing.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'A flat element scales up. Shadow increases. Something that was on the page is now above it.',
    componentQuoteAttribution: null,
    tokens: 'scale.lift · duration.base · ease.standard',
  },
  {
    id: 12, slug: 'appeal', title: 'Appeal', category: 'classic',
    summary: 'The quality that makes an audience want to watch. Charm, clarity, magnetism.',
    componentSummary: 'Shapes drift, settle, drift again. Tuned easing. The grid holds the eye.',
    animationQuote: 'Where the live action actor has charisma, the animated character has appeal.',
    animationQuoteAttribution: 'Frank Thomas & Ollie Johnston, The Illusion of Life',
    componentQuote: 'Appeal is what happens when every other principle is already working. It cannot be added later.',
    componentQuoteAttribution: null,
    tokens: 'All tokens in concert.',
  },
  {
    id: 13, slug: 'systematization', title: 'Systematization', category: 'extended',
    summary: 'Parts integrate into a coherent whole. The system is legible because its parts follow rules.',
    componentSummary: 'One slider moves. Every component responds. The system has one voice.',
    animationQuote: 'A face is recognizable because every part knows what every other part is doing.',
    animationQuoteAttribution: null,
    componentQuote: 'Motion needs to live in the design system as a first-class citizen. Added at the end, it stays at the edges.',
    componentQuoteAttribution: null,
    tokens: 'The whole token set.',
  },
  {
    id: 14, slug: 'hierarchy-of-motion', title: 'Hierarchy of Motion', category: 'extended',
    summary: 'One element drives another. Authority flows from parent to child.',
    componentSummary: 'The parent moves. The children follow. Authority flows downward.',
    animationQuote: 'The conductor moves. The orchestra follows. Reverse the hierarchy and the music breaks down.',
    animationQuoteAttribution: null,
    componentQuote: 'Parent elements carry authority. Children respond. When the hierarchy is wrong, the interface feels disobedient.',
    componentQuoteAttribution: null,
    tokens: 'duration.base · ease.standard',
  },
  {
    id: 15, slug: 'economy', title: 'Economy', category: 'extended',
    summary: 'The minimum motion needed to communicate the intended meaning.',
    componentSummary: 'Three layers, three speeds. Depth from the smallest set of moves.',
    animationQuote: 'Three layers of parallax suggest an entire world. Thirty layers just suggest thirty layers.',
    animationQuoteAttribution: null,
    componentQuote: 'Motion earns its place by what it communicates. Motion added to empty time communicates nothing.',
    componentQuoteAttribution: null,
    tokens: 'duration.slow · ease.standard',
  },
  {
    id: 16, slug: 'token-fidelity', title: 'Token Fidelity', category: 'extended',
    summary: 'Deviation reads as incongruous. The motion is showing you a system problem.',
    componentSummary: 'Wrong token. The motion reads off. Corrected through the system.',
    animationQuote: 'A character drawn with two left hands. The error is not in the drawing. It is in the reference.',
    animationQuoteAttribution: null,
    componentQuote: 'Hardcoded values drift. Token values hold. The system is only as reliable as its sources of truth.',
    componentQuoteAttribution: null,
    tokens: 'The referenced token.',
  },
  {
    id: 17, slug: 'reduced-motion', title: 'Reduced Motion', category: 'extended',
    summary: 'The system must meet the user where they are. Accessibility is a design constraint that improves the whole system.',
    componentSummary: 'Toggle flips. Motions soften and fall to rest. The system meets the user.',
    animationQuote: 'Two actors. One gestures wildly. The other stands still. Neither is wrong. They are just not yet meeting.',
    animationQuoteAttribution: null,
    componentQuote: "We don't need to eliminate animation. We need to apply it more thoughtfully.",
    componentQuoteAttribution: 'Val Head, A List Apart',
    tokens: 'All tokens, conditional.',
  },
  {
    id: 18, slug: 'shared-vocabulary', title: 'Shared Vocabulary', category: 'extended',
    summary: 'Motion values that cannot be named cannot be systematized. Named presets are the minimum unit of design-engineering communication.',
    componentSummary: 'The preset is Snappy. The numbers are the same. The name is the unit.',
    animationQuote: 'A hanzi spoken. A tree grown. The word and the thing were the same thing all along.',
    animationQuoteAttribution: null,
    componentQuote: 'A preset named "Snappy" is communicable. A preset named "300 60 120 200" is not.',
    componentQuoteAttribution: null,
    tokens: 'All named presets.',
  },
]

// Lookup tables built once. BY_SLUG and BY_ID both point at the same records, so
// there is no second copy of the mapping to drift.
const BY_SLUG = new Map(PRINCIPLES.map(p => [p.slug, p]))
const BY_ID = new Map(PRINCIPLES.map(p => [p.id, p]))

// Resolve a deep-link URL segment to its principle record, or null. Accepts the
// authored slug OR a bare numeric id: the numeric form is a silent alias so an
// early hand-typed /5 still lands, and it costs nothing because a real slug like
// 'arc' is not a number and never reaches the id branch. null is the router's
// signal to drop the segment and fail soft to the plain grid.
export function principleBySlug(segment) {
  if (!segment) return null
  if (BY_SLUG.has(segment)) return BY_SLUG.get(segment)
  const asId = Number(segment)
  return Number.isInteger(asId) && BY_ID.has(asId) ? BY_ID.get(asId) : null
}

// Numeric id → authored slug, or null for an out-of-range id. Used by the
// serializer and the copy-link helper so the URL always carries the slug, never
// the raw id.
export function slugForPrincipleId(id) {
  return BY_ID.get(id)?.slug ?? null
}

// Numeric id → full record, or null. The deep-link modal resolves the id it
// receives back to a principle this way.
export function principleById(id) {
  return BY_ID.get(id) ?? null
}
