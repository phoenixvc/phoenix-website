# Forest acceptance contract

Status: implementation slice

Forest is the first immersive existing-theme proof after Cosmic Frontier. It
must meet the Cosmic runtime contract with a materially different scene: canopy
depth, falling leaves, insects, and cursor-responsive light. Cross-repo package
architecture remains deferred until Phoenix also proves the model.

## Visual acceptance

- The forest environment is the full-viewport layer behind website content in
  light and dark modes.
- Header, sidebar, footer, hero chrome, logo mark, and active nav read
  `hsl(var(--color-*))` theme tokens. Modules must not hardcode Cosmic purple.
- Layered canopy SVGs sit over a painted sky, distant hills, and near branches.
  SVG vines, ferns, moss, and sparks animate unless reduced motion is on.
- Falling leaves have size, color, spin, and sway variation. Pixel fireflies
  and pollen provide the fine-grain field Cosmic gets from stars.
- Groves, trees, and clearings are the Forest equivalent of galaxies, suns,
  and planets. Pointer tracking is window-level like Cosmic, so hover, click,
  and wheel work through the hero passthrough instead of only on the canvas.
- Focus Areas, About, and Portfolio section chrome use Forest moss/gold.
- Subtle flying and crawling insects appear on medium and high quality tiers.
- Sunlight shafts and parallax respond to pointer input when motion is full.
- A 60-second deterministic day cycle supplies dawn, day, dusk, and night
  accents. Seeded weather is either calm or mist.
- Effects stay at the edges and in the depth layers so content remains
  readable. The representative fixture uses seed `20260809`, time `12000ms`,
  low quality, reduced motion, and a paused lifecycle.

## Technical acceptance

- `forest` is selectable and persistable beside the Cosmic default. Reserved
  identities remain coming soon.
- The trusted environment registry owns the `forest-canopy` renderer. Theme
  data stays serializable and contains no renderer imports.
- Environment inputs cover deterministic seed/time, quality tier, motion
  policy, visibility pause/resume, resize, pointer input, and disposal on
  unmount.
- Reduced motion and the static fixture draw one representative frame and
  disable leaf travel, insect motion, and pointer-driven parallax.
- Frame budgets: low `0ms` after the first paint, medium `<6ms`, high `<8ms`.
  Caps: 12/28/48 leaves, 0/4/8 insects.
- Storybook exposes deterministic and interactive Forest fixtures. Browser
  tests assert ownership, lifecycle, deterministic inputs, token propagation,
  reduced motion, and Cosmic remaining the default.

## Evidence

Playwright writes visual proof to:

- `apps/web/e2e/evidence/forest-dark-static.png`
- `apps/web/e2e/evidence/forest-light-static.png`
- `apps/web/e2e/evidence/forest-reduced-motion.png`

## Deliberately later

Phoenix is the third immersive proof. Theme Designer workflows, reusable
package extraction, and Highveld remain blocked on that sequence.
