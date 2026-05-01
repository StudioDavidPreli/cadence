# Principle Quotes Reference

Editorial content for the PrincipleCard quote block. 
Each principle has two quotes (State 1 animation, 
State 2 UI) and a token list.

Quotes are either:
- Direct attributed quotes from published sources
- Unattributed, written in David Preli's voice per 
  docs/voice/voice-analysis.md

Do not add attributions to unattributed quotes. They 
stand as editorial voice of the tool itself.

---

## 01 — Squash & Stretch

**State 1 (Animation):**
> Squash and stretch is by far the most important 
> discovery.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> The press compresses. The release returns. A button 
> with no give reads as image, not interface.

**Tokens:** `scale.base · duration.fast · ease.spring`

---

## 02 — Anticipation

**State 1 (Animation):**
> A dancer jumping off the floor has to bend the 
> knees first; a golfer making a swing has to swing 
> the club back first.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> Interfaces that skip the windup feel abrupt. A 
> small reverse motion prepares the eye for arrival.

**Tokens:** `duration.base · ease.spring`

---

## 03 — Staging

**State 1 (Animation):**
> The presentation of any idea so that it is completely 
> and unmistakably clear.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> The backdrop is not decoration. It is the stage 
> management that tells the user where to look.

**Tokens:** `duration.slow · ease.enter`

---

## 04 — Straight Ahead & Pose to Pose

**State 1 (Animation):**
> Straight ahead produces surprise. Pose to pose 
> produces structure. Neither alone is enough.

**State 2 (UI):**
> Steppers define the poses. The fill animation is 
> the frames between. Both are the same argument.

**Tokens:** `duration.slow · delay.short · delay.medium`

---

## 05 — Follow Through and Overlapping Action

**State 1 (Animation):**
> When an object stops, all parts of it do not stop 
> at the same time.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> The slide arrives. The indicator follows. Secondary 
> motion is how the interface says: that was real.

**Tokens:** `duration.base · ease.spring`

---

## 06 — Slow In and Slow Out

**State 1 (Animation):**
> More drawings near the beginning and end of an 
> action, fewer in the middle.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> Linear motion belongs to machines. Easing curves 
> are how software admits it has mass.

**Tokens:** `ease.standard · duration.slow`

---

## 07 — Arc

**State 1 (Animation):**
> Most natural action tends to follow an arched 
> trajectory.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> A tooltip that rises straight up arrives as a 
> notification. One that arcs arrives as an answer.

**Tokens:** `duration.fast · ease.enter`

---

## 08 — Secondary Action

**State 1 (Animation):**
> Supporting gestures enrich the main action. They 
> do not compete with it.

**State 2 (UI):**
> The chevron rotates as the menu opens. The chevron 
> is not the story. It confirms the story.

**Tokens:** `duration.fast · ease.standard`

---

## 09 — Timing

**State 1 (Animation):**
> A variety of slow and fast timing within a scene 
> adds texture and interest to the movement.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> Have a known purpose for every animation in your 
> interface.

— Val Head, *Designing Interface Animation*

**Tokens:** `duration.fast · duration.base · duration.slow`

---

## 10 — Exaggeration

**State 1 (Animation):**
> Exaggeration is not extreme distortion, but a 
> caricature of facial features, expressions, poses, 
> attitudes and actions.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> The notification doesn't just appear. It overshoots, 
> and that overshoot is the alert.

**Tokens:** `scale.expressive · ease.spring · duration.fast`

---

## 11 — Solid Drawing

**State 1 (Animation):**
> Form, weight, volume solidity and the illusion of 
> 3D apply to animation as it does to academic drawing.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> A flat element scales up. Shadow increases. Something 
> that was on the page is now above it.

**Tokens:** `scale.lift · duration.base · ease.standard`

---

## 12 — Appeal

**State 1 (Animation):**
> Where the live action actor has charisma, the 
> animated character has appeal.

— Frank Thomas & Ollie Johnston, *The Illusion of Life*

**State 2 (UI):**
> Appeal is what happens when every other principle 
> is already working. It cannot be added later.

**Tokens:** All tokens in concert.

---

## 13 — Systematization

**State 1 (Animation):**
> A face is recognizable because every part knows 
> what every other part is doing.

**State 2 (UI):**
> Motion needs to live in the design system as a 
> first-class citizen. Added at the end, it stays 
> at the edges.

**Tokens:** The whole token set.

---

## 14 — Hierarchy of Motion

**State 1 (Animation):**
> The conductor moves. The orchestra follows. 
> Reverse the hierarchy and the music breaks down.

**State 2 (UI):**
> Parent elements carry authority. Children respond. 
> When the hierarchy is wrong, the interface feels 
> disobedient.

**Tokens:** `duration.base · ease.standard`

---

## 15 — Economy

**State 1 (Animation):**
> Three layers of parallax suggest an entire world. 
> Thirty layers just suggest thirty layers.

**State 2 (UI):**
> Motion earns its place by what it communicates. 
> Motion added to empty time communicates nothing.

**Tokens:** `duration.slow · ease.standard`

---

## 16 — Token Fidelity

**State 1 (Animation):**
> A character drawn with two left hands. The error 
> is not in the drawing. It is in the reference.

**State 2 (UI):**
> Hardcoded values drift. Token values hold. The 
> system is only as reliable as its sources of truth.

**Tokens:** The referenced token.

---

## 17 — Reduced Motion

**State 1 (Animation):**
> Two actors. One gestures wildly. The other stands 
> still. Neither is wrong. They are just not yet 
> meeting.

**State 2 (UI):**
> We don't need to eliminate animation. We need to 
> apply it more thoughtfully.

— Val Head, *A List Apart*

**Tokens:** All tokens, conditional.

---

## 18 — Shared Vocabulary

**State 1 (Animation):**
> A hanzi spoken. A tree grown. The word and the 
> thing were the same thing all along.

**State 2 (UI):**
> A preset named "Snappy" is communicable. A preset 
> named "300 60 120 200" is not.

**Tokens:** All named presets.

---

## Verification Status

- All Thomas & Johnston quotes: sourced from widely-
  published paraphrases of *The Illusion of Life*. 
  Exact wording in print editions may differ. Verify 
  against the Internet Archive copy if precision 
  matters for the case study.
- Val Head "Have a known purpose" quote: direct quote, 
  verified from UXmatters sample chapter of 
  *Designing Interface Animation*.
- Val Head "first-class citizen" quote (principle 13): 
  adapted paraphrase in voice. Not a direct quote — 
  kept unattributed as a voice line.
- Val Head "We don't need to eliminate animation" 
  quote (principle 17): direct quote from A List 
  Apart article on motion sensitivity.
- All unattributed quotes: written in David Preli's 
  voice per docs/voice/voice-analysis.md.