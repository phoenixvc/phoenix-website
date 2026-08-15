# Ocean acceptance contract

Status: implementation slice

Ocean (Abyssal Pelagic & Bioluminescent Trench) is the fifth immersive theme environment. It brings the deep oceanic realm into the unified theme runtime: ascending air bubbles, drifting bioluminescent siphonophore jellyfish bells, undersea light caustic refractions, hydrothermal vent smoke plumes, and interactive pelagic world nodes.

## Visual acceptance

- The ocean abyss is the full-viewport layer behind website content in light and dark modes.
- Header, sidebar, footer, hero chrome, logo mark, and active nav use Ocean deep navy, abyssal sapphire, electric cyan, and seafoam turquoise palettes.
- Undersea light caustics shimmer down from the surface with smooth mathematical refraction waves.
- Drifting translucent jellyfish pulse with rhythmic contractions and trail bioluminescent tentacles.
- Ascending micro-bubbles rise toward the surface with buoyancy physics, wobbling slightly and bursting on contact with pointer currents.
- Hydrothermal vent chimneys emit convective mineral smoke plumes that drift with deep-sea currents.
- Abyssal Spires, Hydrothermal Vents, and Pelagic Reefs are the Ocean equivalent of celestial stars and forest groves: focus areas and portfolio projects are pickable world nodes with hover tooltips, HUD zoom, and click-to-focus camera motion.
- A 60-second deterministic day/depth cycle transitions through `sunlit-shallows`, `twilight-mesopelagic`, `midnight-bathypelagic`, and `abyssal-hadopelagic` phases.
- Effects maintain high contrast and dark vignettes behind content so all text remains crisp and readable. The representative fixture uses seed `20260815`, time `12000ms`, low quality, reduced motion, and a paused lifecycle.

## Technical acceptance

- `ocean` is selectable and persistable beside Cosmic Frontier, Forest, Highveld, and Phoenix.
- The trusted environment registry owns the `ocean-abyss` renderer (`OCEAN_ENVIRONMENT`). Theme data stays serializable.
- Environment inputs cover deterministic seed/time, quality tier, motion policy, visibility pause/resume, resize, pointer input, and disposal on unmount.
- Reduced motion and the static fixture draw one representative frame and disable bubble travel, jellyfish pulsation, and pointer parallax.
- Frame budgets: low `0ms` after first paint, medium `<6ms`, high `<8ms`.
- Storybook exposes deterministic and interactive Ocean fixtures. Browser tests assert ownership, lifecycle, deterministic inputs, token propagation, reduced motion, and Cosmic remaining the default.

## Evidence

Playwright writes visual proof to:

- `apps/web/e2e/evidence/ocean-dark-static.png`
- `apps/web/e2e/evidence/ocean-light-static.png`
- `apps/web/e2e/evidence/ocean-reduced-motion.png`
