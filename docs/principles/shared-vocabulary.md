# Shared Vocabulary

Motion values that cannot be named cannot be systematized. Named presets are the minimum unit of design-engineering communication. "Use spring easing on the modal" is a complete instruction. "Use cubic-bezier(0.34, 1.56, 0.64, 1) on the modal" is the same instruction, opaque to anyone not holding a reference sheet. The name carries the intention that the numbers cannot.

## UI demonstration

Two stacked tracks, each with a dot looping in ping-pong. Both dots use the same curve. Below the top track: the preset's name ("Snappy"). Below the bottom track: the same curve's bezier numbers ("0.34, 1.56, 0.64, 1"). Identical motion, two descriptions. The Cycle button rotates through Snappy, Standard, and Linear.

## Animation

`/public/rive/sharedvocabulary.riv`, state machine `sharedVocabularySM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 18.

## Icon

`/public/rive/principles_icon18.riv`, state machine `sharedVocabularyIconSM`. Wired in `PrincipleIcon` as principle 18.

## Tokens used

All named presets. The demo hardcodes canonical curve values rather than reading from `tokens.ease.*` so the binding between name and numbers stays fixed across active presets.
