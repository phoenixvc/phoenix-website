# Phoenix acceptance contract

Status: implementation complete

Phoenix is the third immersive existing-theme proof, building upon Cosmic Frontier and Forest. It fulfills the environment runtime contract with an incandescent volcanic rebirth scene: ascending embers, floating ash flakes, convective pointer vortices, solar auroral flares, and interactive solar world nodes.

## Visual acceptance

- The phoenix environment is the full-viewport layer behind website content in light and dark modes.
- Header, sidebar, footer, hero chrome, logo mark, and active nav use Phoenix obsidian, vermilion, amber, and solar gold palettes.
- Layered stylized Phoenix wing flourishes and solar rebirth crest SVGs frame the canvas.
- Ascending embers have size, color, luminosity flicker, and convective pointer response. Weightless volcanic ash flakes provide ambient field texture.
- Solar Sanctuaries, Sector Altars, and Portfolio Beacons are the Phoenix equivalent of celestial stars and forest groves: focus areas and portfolio projects are pickable world nodes with hover tooltips, HUD zoom, and click-to-focus camera motion.
- Solar auroral plumes, volcanic caldera ridges, and base horizon magma pulse respond to pointer convection and day cycle progression.
- A 60-second deterministic day cycle supplies `dawn-spark`, `zenith-blaze`, `dusk-ember`, and `hearth-rebirth` atmospheric phases.
- Effects maintain high contrast so textual and UI content remain completely readable. The representative fixture uses seed `20260814`, time `12000ms`, low quality, reduced motion, and a paused lifecycle.

## Technical acceptance

- `phoenix` is selectable and persistable beside Cosmic Frontier and Forest.
- The trusted environment registry owns the `phoenix-reign` renderer (`PHOENIX_ENVIRONMENT`). Theme data stays serializable.
- Environment inputs cover deterministic seed/time, quality tier, motion policy, visibility pause/resume, resize, pointer input, and disposal on unmount.
- Reduced motion and the static fixture draw one representative frame and disable particle travel and pointer parallax.
- Frame budgets: low `0ms` after first paint, medium `<6ms`, high `<8ms`.
- Storybook exposes deterministic and interactive Phoenix fixtures. Browser tests assert ownership, lifecycle, deterministic inputs, token propagation, reduced motion, and Cosmic remaining the default.

## Evidence

Playwright writes visual proof to:

- `apps/web/e2e/evidence/phoenix-dark-static.png`
- `apps/web/e2e/evidence/phoenix-light-static.png`
- `apps/web/e2e/evidence/phoenix-reduced-motion.png`
