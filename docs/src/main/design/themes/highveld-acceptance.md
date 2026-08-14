# Highveld acceptance contract

Status: implementation slice

Highveld is the first theme designed *after* the environment contract existed,
rather than retrofitted onto it. Cosmic Frontier and Forest proved the contract
by being ported into it; Highveld is the test of whether a new theme can be
added by filling the contract in. Everything renderer-specific lives behind the
trusted environment registry, and the theme object itself stays serializable.

The scene is the South African interior plateau: a very low horizon under an
enormous sky, a storm cell working across it, and grass running with the wind.
Where Cosmic is a void with no horizon and Forest is an enclosed canopy with no
distance, Highveld is panoramic — the whole identity is *depth to the horizon*.

## Visual acceptance

- The plateau is the full-viewport layer behind website content in light and
  dark modes. Sky occupies roughly the upper two-thirds; the horizon is a
  projected world coordinate, so it rises and falls as the camera moves.
- Header, sidebar, footer, hero panel, logo mark, and active nav use Highveld
  veld-gold and aloe-ember instead of the Cosmic purple/indigo.
- A 60-second deterministic day cycle interpolates four sky anchors — night,
  dawn, day, dusk. Dark mode opens at dusk and light mode at midday, so both
  modes start on a representative frame and still walk the whole cycle.
- **Seeded lightning is the signature.** In `stormfront` weather, bolts fire on
  a seeded cadence; each is a recursively branched bolt with a hot core, a
  halo, and a three-flicker decay envelope that lifts the sky, the grass, and
  the koppie rim for its duration. Bolt timing is a pure function of
  `(seed, timeMs)`, so any frame is reproducible.
- Supporting depth layers: anvil-topped storm cell, virga that fades before it
  reaches the ground, distant escarpment ridgeline, sun/moon low on the
  horizon, stars weighted to the upper sky at night, drifting dust, and birds.
- Koppies, thorn trees, and seasonal pans are the Highveld equivalent of
  galaxies, suns, and planets: focus areas and portfolio projects are pickable
  world nodes with hover labels, HUD zoom, click-to-focus, and wheel zoom.
  Node rings are squashed onto a receding ground plane and scale with depth.
- A windpomp — the plateau's one vertical line — turns with the wind, and
  near-field grass tufts and cosmos flowers sit in front of everything.
- Grass carries a travelling wind wave and lays over away from the cursor when
  motion is full.
- Effects stay at the edges and in the depth layers so content remains
  readable; a vignette holds the centre down.

## Technical acceptance

- `highveld` is selectable and persistable beside the Cosmic default. Reserved
  identities remain coming soon.
- The trusted environment registry owns the `highveld-plateau` renderer. Theme
  data stays serializable and contains no renderer imports.
- Environment inputs cover deterministic seed/time, quality tier, motion
  policy, visibility pause/resume, resize, pointer input, and disposal on
  unmount.
- Reduced motion and the static fixture draw one representative frame and
  disable wind, bolt animation, drift, and pointer-driven parallax.
- Frame budgets: low `0ms` after the first paint, medium `<6ms` (throttled to
  30fps), high `<8ms`. Caps: 700/1100/1900 grass blades, 70/110/170 ground
  tussocks, 14/40/80 dust motes, 0/5/9 birds, 0/60/120 virga streaks,
  60/150/260 stars.
- The grass and tussock counts are high even on `low` because `low` paints a
  single frame and then stops, so its cost is one-off rather than per-frame.
  Sparse grass was the difference between reading as veld and reading as flat
  paint, and the low tier is what the evidence screenshots capture.
- Storm state — weather, storm position, bolt schedule, ridgeline, and windpomp
  position — is drawn from a separate seeded stream and is therefore
  **identical across quality tiers**. Only particle counts vary. A low-tier
  screenshot and a high-tier one show the same storm.
- The representative fixture is seed `20260814`, time `9170ms`, low quality,
  reduced motion, paused. That seed resolves to `stormfront`, and `9170ms`
  falls inside the third seeded strike near its first flicker peak, so the
  static frame carries a live bolt rather than an empty sky. In dark mode that
  moment is `dusk` in the day cycle — a lit bolt over a crimson Highveld
  sunset, which is the frame the theme should be judged on.
- Storybook exposes deterministic dark, deterministic light, a high-tier midday
  frame, and an interactive fixture. Browser tests assert ownership, lifecycle,
  deterministic inputs, pixel-level determinism, token propagation, reduced
  motion, and Cosmic remaining the default.

## Contract changes made for reuse

These generalise machinery that was previously Cosmic-specific. They are
prerequisites for extracting the theme package, and they are why Highveld
needed no new branching in `Layout`:

- `ThemeEnvironmentDefinition` now carries `fixtureParam` and `staticFixture`.
  Each environment declares its own deterministic frame instead of `Layout`
  hardcoding one theme's seed and query parameter.
- `environmentQuery.ts` provides `themeNameFromQuery` and
  `resolveEnvironmentFixture`, shared by every environmental theme.
- `?theme=<name>` selects any available theme, making an environment shareable
  as a link. It is resolved before the first render.
- `createBuiltInThemeRegistry(defaultThemeName)` takes the startup theme.
  This is the **only** effective override point: `ThemeCore.initializeRegistries`
  applies the registry default over both stored state and the provider config,
  so setting `config.defaultThemeName` or writing storage before mount does not
  work. Worth knowing before the Theme Designer tries to set a startup theme.

## Defects found and fixed along the way

- `isColorScheme` in `theme/types/utils/guards.ts` omitted `cosmic-frontier`,
  so `isThemeConfig` rejected the shipped default theme. Now lists every
  `ThemeName`.
- Only `Outfit` was ever fetched in `index.html`. Cosmic declares
  `Space Grotesk` and Forest declares `Bitter`/`Noto Sans`, neither of which is
  loaded, so both silently fall back. Highveld's `Zilla Slab` is now linked;
  the other two remain unfixed and belong to their own branches.

## Known-unfixed, deliberately out of scope

- `.theme-wrapper` renders `class="theme-wrapper undefined undefined"` —
  `getThemeClassNames(...).base` and `[mode]` both resolve to `undefined`, so
  the `.theme-<name>-<mode>` fallback classes in `theme.css` are never applied
  by any theme. Runtime colours still work because `useCssVariables` writes the
  same custom properties inline on `documentElement`, which the wrapper
  inherits. Highveld's token block is added to `theme.css` for consistency, but
  it is dormant like every other theme's until this is fixed.
- `src/theme/index.css` imports `./themes/*.css`, a directory that does not
  exist; the real files are under `src/theme/styles/themes/` and are all
  zero-byte except `ocean.css`. Nothing imports any of them.

## Evidence

Playwright writes visual proof to:

- `apps/web/e2e/evidence/highveld-dark-static.png`
- `apps/web/e2e/evidence/highveld-light-static.png`
- `apps/web/e2e/evidence/highveld-reduced-motion.png`

## Deliberately later

Theme Designer workflows and reusable package extraction remain the next step.
The contract changes above are the parts of that extraction that Highveld
needed in order to exist without special-casing, and should be treated as the
starting point for it rather than as Highveld-specific work.
