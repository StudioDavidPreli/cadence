# Cadence: What This Demonstrates

**Status: Draft branch, 2026-07-30.** The hiring-manager cut, extracted from [`case-study.md`](../case-study.md) so the public case study can link it rather than carry it. For the full build record, start there.

---

For the hiring manager reading this directly:

- **React fluency:** The two-channel Context architecture with a reducer behind it. Controlled and uncontrolled variants across Toggle, Card, and Stepper. ResizeObserver for column-count awareness. AnimatePresence orchestration with its documented sharp edges avoided for stated reasons. A class-component ErrorBoundary where the API demands one. `requestAnimationFrame` drivers feeding live tokens into Rive view models and a WebGL shader. All of it built, none of it from a library.
- **Design systems thinking:** A token architecture that matches Material and Primer patterns, split into editable tokens and fixed references with a test enforcing the partition. Four export formats off one normalized object, including a spring family the DTCG draft has no type for, serialized as plain number leaves rather than an invented one, and a Framer Motion module that hands an engineer the motion-side artifact directly. The chrome/demonstration boundary, extended to typography: the toolbar's text runs on named `type-*` roles in a shared layer, because the tool that argues values must be named should not leave its own chrome as the counterexample. Naming as a design act: the bezier that claimed to be a spring was renamed, then a real spring was built; the scale family was renamed so no key implies a neutral it does not have. Shared Vocabulary is a principle in the tool because it was a lesson in the build.
- **Motion expertise applied to product context:** Eighteen principles, each argued through a component a product actually ships. The `layoutId` and Carousel diagnoses show motion knowledge operating at the implementation layer, where it either works in the projection tree or it does not. The eye that tuned these curves won a 2024 Cannes Golden Lion as Animator and Editor; the point of Cadence is that the same eye now ships the system, not the spec.
- **Documentation discipline:** Twenty-plus decision records, each with alternatives and reasoning. A per-principle doc for all eighteen. An honest chronology of the worst debugging stretch, kept because the mistakes instruct. The project's own instructions file enforces the writing voice, the architecture rules, and the verification standard that caught the production crash.

---

- **Live tool:** [cadence.davidpreli.com](https://cadence.davidpreli.com)
- **Full case study:** [`case-study.md`](../case-study.md)
- **Portfolio:** [davidpreli.com](https://davidpreli.com)
