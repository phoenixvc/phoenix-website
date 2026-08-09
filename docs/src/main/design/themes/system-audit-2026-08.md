# Theme system audit — August 2026

Status: evidence complete; architecture decision intentionally deferred

This audit records what the Phoenix website theme system does today, what is
only scaffolded, and which older JustAGhosT repositories are useful inputs. It
does not choose the cross-repository package architecture. That decision belongs
in the follow-up ADR after Cosmic Frontier, Forest, and Phoenix establish the
quality and capability benchmark.

## Executive finding

Phoenix currently has one substantial environmental experience: the interactive
cosmic starfield. It is not represented as a complete theme, however. The
starfield is mounted unconditionally by `Layout`, while named themes mostly
change color variables and typography. Forest and Phoenix are palettes, not
immersive scenes. Cosmic Frontier has named placeholder files, but those files
are empty and its experience is implemented directly in layout/starfield code.

The current system should therefore be treated as a capable prototype with
multiple overlapping abstractions, not as a reusable theme platform.

The next implementation slice should finish Cosmic Frontier in place while
introducing only the smallest contract needed to describe its environmental
layers. Forest and Phoenix should then test that contract. The reusable package
boundary and Theme Designer architecture must remain a later decision.

## Evidence gathered

The audit covered:

- theme identity, registry, state, acquisition, storage, CSS-variable,
  validation, transformation, component-variant, and typography code;
- built-in theme definitions and CSS;
- the header selector, unused secondary selector, persistence, system mode,
  accessibility and reduced-motion support;
- the `/theme-designer` route;
- Storybook configuration and existing tests;
- the deployed website at `https://phoenixvc.tech` on 9 August 2026;
- relevant JustAGhosT repositories, their histories, licenses, dependencies,
  tests, and representative visual implementations.

## Current runtime model

### Identity and selection

`ThemeName` declares seven values: Classic, Forest, Ocean, Phoenix, Lavender,
Cloud, and Cosmic Frontier. The runtime surfaces do not agree on that set:

- `main.tsx` configures Classic/Dark as the default.
- `useTheme` falls back to Cosmic Frontier when the context lacks a name.
- the production header enables only Cosmic Frontier and labels Classic, Neon
  City, Forest Calm, and Ocean Depths as coming soon;
- `forest-calm`, `ocean-depths`, and `neon-city` are not valid `ThemeName`
  values;
- the separate `ThemeToggle` component offers six palette themes but omits
  Cosmic Frontier, and it is not mounted by the website;
- storage observed in production contained `theme_mode` and
  `use_system_theme`, but no selected theme name.

This creates three competing descriptions of the available themes: the type,
the header, and the unused selector.

### Theme data

Classic, Forest, Ocean, Phoenix, Lavender, and Cloud have TypeScript token
objects. Their implementation is uneven:

- `cosmicFrontier.ts` is empty and is not exported by the theme index;
- `cosmicFrontier.css`, `classic.css`, `cloud.css`, `forest.css`,
  `lavender.css`, and `phoenix.css` are empty;
- only `ocean.css` contains theme-specific rules in the secondary CSS tree;
- the active `theme.css` duplicates many theme variables and class mappings;
- Cosmic Frontier is missing from the active CSS variable mappings;
- public `forest.json` and `ocean.json` files exist, but no website source
  references them.

Forest and Phoenix currently vary palette, fonts, border radius, and shadows.
They do not define environmental SVG layers, particles, scene behaviour,
microanimations, sound, interaction responses, or performance policies.

### Environmental layer

`Layout` always mounts `Starfield` and passes a fixed configuration. Selection
of Forest, Phoenix, Ocean, or another theme cannot replace the environment. The
starfield itself is far more mature than the theme layer: it has canvas
rendering, camera and focus behaviour, interactive suns and planets, particle
effects, performance tiers, debug controls, and an end-to-end hover test.

This inversion is the central architectural gap: the most important part of a
Phoenix theme lives outside the theme contract.

### State, loading, and persistence

The provider stack includes registries plus singleton managers for state,
acquisition, storage, styles, transformation, validation, caching, typography,
and components. There is also an older simple `ThemeContext.tsx` that is not
exported by its directory index.

The active provider initializes the theme system in both its outer and inner
components. When a theme is absent from the provider registry, it calls the
acquisition manager. That manager defaults `allowExternalLoading` to `false`,
and the provider does not override it, so a theme missing from the registry,
cache, and storage skips local and remote loading and falls back to the default
theme. This is the active production path.

The local loader also contains an `import.meta.glob("../themes/*.js")` path that
does not match the actual `constants/themes/*.ts` location. That mismatch is a
latent defect rather than the cause of the current warnings because the loader
is unreachable while external loading remains disabled.

The deployed site confirmed the active fallback behaviour:

- `ThemeAcquisitionManager` warned that it was using the default theme for
  Classic;
- component variants for logo, header, footer, navigation, sidebar, card,
  modal, and dropdown could not be found;
- these warnings repeated on navigation.

Storage and system-mode support exist, but the source still contains multiple
storage keys, delayed initialization, fallback state writes, and unresolved
TODOs for validation and error handling. This makes first paint and persistence
behaviour harder to reason about than necessary.

### Theme Designer

The public route is a styled “In Development” notice. It has no editor state,
preview, validation, undo/redo, import/export, persistence, asset selection,
environment controls, or connection to the registry.

The existing theme TODO files accurately list many missing capabilities, but
they also contain obsolete generic work such as setting up CI and dependency
updates. They should not be used as the implementation plan.

### Storybook and testing

Storybook has the default generated preview configuration. It has no theme
toolbar, decorator, environmental layer, token documentation, persistence
reset, motion policy, or theme visual matrix. Existing Storybook stories are
starter Button/Header/Page examples and are not wired to the website theme
provider.

There are no unit, integration, or visual tests for theme switching, theme
acquisition, persistence, the Theme Designer, or named theme parity. The
starfield hover E2E test is useful but does not establish a theme contract.

Reduced-motion detection exists as a general website hook, but it is not part
of the theme schema and does not govern the legacy or planned environmental
effects.

## Theme completeness assessment

| Theme | Current state | Benchmark status |
| --- | --- | --- |
| Cosmic Frontier | Rich starfield implemented outside the theme contract; selector and persistence are inconsistent | First theme to finish and formalize |
| Classic | Active token/default fallback, labelled coming soon in the user selector | Supporting palette, not an immersive benchmark |
| Forest | Token object and duplicated color variables only | Must gain a complete forest scene after Cosmic |
| Phoenix | Token object and duplicated color variables only | Must gain a complete rebirth/fire scene after Forest |
| Ocean | Token object plus the only non-empty secondary theme CSS file | Palette/reference only |
| Lavender | Token object only | Palette/reference only |
| Cloud | Token object only | Palette/reference only |
| Highveld | Not implemented | New theme after the three existing benchmarks |

“Complete” must mean more than recoloring components. A benchmark theme needs:

- a distinct visual thesis and named identity;
- light/dark/system behaviour where appropriate;
- typography, color, surface, elevation, component, and content tokens;
- an environmental scene with layered SVG/canvas/DOM assets;
- ambient, pointer, focus, hover, navigation, and page-transition motion;
- reduced-motion, low-power, mobile, and static fallbacks;
- deterministic controls for Storybook and visual testing;
- asset provenance and licensing;
- persistence, reset, import/export versioning, and safe validation;
- accessibility and performance budgets.

## JustAGhosT repository survey

No repository currently named `particle-effects` or `theme-designer` exists
under JustAGhosT or Phoenix VC. GitHub code search also found no separate source
under those names. The relevant work is embedded in the following repositories.

### PhoenixVC-AnmatedLogo

Repository: <https://github.com/JustAGhosT/PhoenixVC-AnmatedLogo>

Assessment: **reference-only, high-value visual catalogue**

This is the likely remembered particle-effects/theme laboratory. It contains:

- particle swarm and Phoenix particle editors;
- SVG morph, stroke, parallax, gradient, hover, trail, audio-reactive, and
  other animation experiments;
- theme gallery, selector, modal, comparison, and theme documentation pages;
- Forest concepts for falling leaves, dappled light, interactive forest-floor
  elements, and layered parallax;
- Phoenix concepts for flame particles, rebirth, feather physics, heat
  distortion, and ember trails.

Useful material should be re-derived or selectively ported behind the new
contract. The repository should not be consumed as a package or copied whole:

- its last default-branch commit is from 27 April 2025;
- no repository license is declared;
- several dependencies are specified as `latest`;
- the main particle editor is an 811-line component coupling controls,
  sampling, simulation, rendering, fullscreen, and export;
- it has no automated tests or reduced-motion integration;
- much of the environmental material is prose/example code rather than a
  production scene;
- an isolated production lockfile audit reported 71 known vulnerabilities:
  1 critical, 33 high, 33 moderate, and 4 low. The critical advisory affects
  its pinned Next.js 15.2.4 release.

The most applicable assets are the visual vocabulary, Phoenix SVG path,
particle parameter ideas, export UX, and small isolated animation techniques.

### phoenixvc-website-designer-draft

Repository: <https://github.com/JustAGhosT/phoenixvc-website-designer-draft>

Assessment: **reference-only, superseded implementation**

The private draft contains a three-step Focus → Evolution → Style flow, basic
color inputs, font selection, a package-shaped design system, and Storybook 7
scaffolding. It demonstrates an understandable wizard structure, but it does
not produce the current theme schema or environmental themes. Its editor uses
`any`, dynamic Tailwind class strings, three generic fonts, and no preview,
validation, persistence, import/export, undo, or asset controls.

The repository has a Phoenix VC proprietary license, so internal reuse is
possible subject to ownership confirmation. Its React 18/Next 14/Storybook 7/
pnpm 9 stack is behind the current website, and the editor has no tests. Reuse
the step-flow idea only; do not migrate the implementation.

### phoenix-design-system

Repository: <https://github.com/JustAGhosT/phoenix-design-system>

Assessment: **historical design reference; fully superseded as software**

This January 2025 repository contains seven tracked files: static Modern,
Minimal, and Dynamic alternatives plus small design-choice/style-variation
components. It has no runtime theme model, package boundary, tests, recent
maintenance, or declared license. Its value is limited to historical visual
directions and vocabulary.

### phoenix-vc-website

Repository: <https://github.com/JustAGhosT/phoenix-vc-website>

Assessment: **superseded system; narrow interaction reference**

The archived repository is a small Next.js site. Its December 2025
`SolarSystem` component correctly accounts for `preserveAspectRatio="slice"`
when positioning HTML tooltips over SVG suns, uses oversized invisible hit
areas, and cleans up resize observation. Those techniques are worth comparing
against current starfield hit testing and overlay placement.

The current starfield already supersedes its static three-sun model, hard-coded
portfolio data, and SVG-only rendering. Do not adopt the repository or its
architecture. Preserve only the coordinate-conversion and interaction lessons.

### flair-forge

Repository: <https://github.com/JustAGhosT/flair-forge>

Assessment: **not a theme-system source; possible future editor UX reference**

Flair Forge is current and actively maintained, but it is a design/content
generation product rather than a theme runtime. Its value is limited to later
research on editor workflow, responsive preview, artifact export, and visual
test discipline.

## Constraints for the next implementation

1. Do not extract a shared package yet.
2. Do not make Forest or Phoenix another palette-only entry.
3. Model Cosmic’s existing starfield as a theme-owned environmental layer
   without destabilizing its current camera, focus, and performance work.
4. Give environmental renderers lifecycle controls: mount, pause, resume,
   dispose, resize, pointer input, deterministic seed/time, and quality tier.
5. Keep theme data serializable; renderer implementations and trusted assets
   should be registered code, not executable data imported from arbitrary JSON.
6. Treat remote theme loading as disabled until schema versioning, integrity,
   origin policy, validation, and failure fallback are explicit.
7. Make reduced motion and low power capabilities, not afterthought flags.
8. Establish Storybook as the canonical contract harness once Cosmic exposes
   the first real contract.
9. Require each adopter to encode its existing production identity as a named
   baseline theme before offering alternates.
10. Resolve asset licenses before copying legacy code or art.

## Recommended next slice: Cosmic Frontier polish

The Cosmic task should begin with a short visual and technical acceptance spec,
then deliver a vertical slice:

1. reconcile the single theme catalogue and persistence keys;
2. make Cosmic Frontier an actual registered theme with metadata;
3. introduce an environmental-layer boundary around the existing starfield;
4. preserve and test current zoom/focus/hover behaviour;
5. connect reduced-motion and quality-tier behaviour;
6. add deterministic Storybook fixtures for a representative static frame and
   selected interactions;
7. remove production theme warnings for the supported path;
8. document remaining Cosmic polish separately from contract work.

After Cosmic meets that bar, Forest should prove a materially different scene:
falling leaves, crawling insects, responsive canopy light, layered depth, and
intentional microinteraction—each with reduced-motion and mobile alternatives.
Phoenix should then prove rebirth/fire/ember motion. Only after those three
implementations should the architecture ADR choose repository, package,
serialization, and adapter boundaries.
