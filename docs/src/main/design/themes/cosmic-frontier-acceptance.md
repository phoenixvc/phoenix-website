# Cosmic Frontier acceptance contract

Status: implementation slice

Cosmic Frontier is the first supported Phoenix website theme. It establishes
the minimum runtime contract for later immersive themes without choosing a
shared package or Theme Designer architecture.

## Visual acceptance

- The starfield remains the full-viewport environmental layer behind website
  content in light and dark modes.
- The registered Cosmic palette drives component color variables after theme
  initialization; CSS values are pre-hydration fallbacks, not a second runtime
  theme authority.
- The representative fixture uses seed `20260809`, time `12000ms`, low quality,
  reduced motion, and a paused lifecycle.
- Existing pointer hover, focus, zoom, and portfolio navigation behaviour stays
  intact when full motion is enabled.

## Technical acceptance

- One typed catalogue owns canonical IDs, display names, availability, the
  default theme, validation, persistence, and both selectors.
- Only `cosmic-frontier` is selectable and persistable. Reserved identities
  remain visible as coming soon and cannot enter runtime state.
- The trusted environment registry owns renderer code. Theme data remains
  serializable and contains no executable renderer imports.
- Environment inputs cover deterministic seed/time, quality tier, motion
  policy, visibility pause/resume, resize, pointer input, and disposal on
  unmount.
- Reduced motion draws a representative static frame and disables ambient,
  black-hole, flow, and pointer-driven motion.
- Storybook exposes deterministic and interactive fixtures. Browser tests
  assert ownership, lifecycle, deterministic inputs, persistence fallback,
  token propagation, and the absence of supported-path theme warnings.

## Deliberately later

Stateful Theme Designer controls, undo/redo, import/export, asset selection,
and cross-repository packaging remain later work. The older AnimatedLogo and
designer-draft repositories are interaction references only: their coupled
editor/simulation state is not imported into this runtime slice.

Remaining visual polish should be tracked separately from contract work,
including art direction, mobile composition tuning, and richer interaction
fixtures after the contract is stable.
