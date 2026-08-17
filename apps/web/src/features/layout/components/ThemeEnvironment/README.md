# ThemeEnvironment

Each theme (`cosmic-frontier`, `forest`, `highveld`, `phoenix`, `ocean`, `cloud`,
`lavender`, `classic`) renders a full-viewport decorative canvas background —
the "theme environment" — behind the app's content. `ThemeEnvironment.tsx` is
the single entry point: it looks up the active theme's definition in
`registry.ts` and mounts the matching renderer.

This doc describes what's actually true today, after the
theme-consolidation epic (Phases 0–2). It is not aspirational — if a claim
here stops matching the code, fix the doc, don't leave it stale.

## The contract

Every theme needs two things:

1. **A registry entry** in `registry.ts` — a `ThemeEnvironmentDefinition`
   (`types.ts`): `themeName`, `displayName`, a unique `rendererId`, a
   `fixtureParam` (the query-string key Playwright uses to force a
   deterministic `staticFixture`), the `staticFixture` itself (`seed`,
   `timeMs`, `qualityTier`, `motionMode`, `paused`), and a `capabilities`
   object.
2. **A renderer component** — one `*Environment.tsx` — added to
   `ThemeEnvironment.tsx`'s renderer map (or, for the one case that can't
   fit the map, an explicit branch — see [Cosmic Frontier](#cosmic-frontier-the-one-exception) below).

### `capabilities` are real guarantees, not aspirational flags

Every current theme (except Cosmic, see below) gets these for free by
building on `useEnvironmentCanvas` — this is what makes the `capabilities`
object in `registry.ts` true rather than documentation-of-intent:

| Capability | Guaranteed by |
| --- | --- |
| `lifecycle.pause` / `resume` | `paused` prop flows into `isRunning`; the RAF loop stops/restarts without unmounting the canvas |
| `lifecycle.dispose` | `useEnvironmentCanvas`'s effect cleanup cancels the RAF and removes the resize listener |
| `viewport.resize` | internal `resize` handler on `window.resize`, DPR-aware |
| `viewport.pointerInput` | each theme wires its own pointer/click handlers (shape differs — see [two patterns](#two-supported-shapes) below) |
| `deterministic.seed` / `time` | `randomSeed` / `fixedTimestamp` props — when `fixedTimestamp` is set, the hook paints exactly one frame and never starts the RAF loop |
| `reducedMotion` | `motionMode === "reduced"` is read by the theme and by `useThemeEnvironmentController` to skip camera/mode-progress animation |
| `adaptiveQuality` | `resolveEnvironmentQualityTier` — falls back to a device-heuristic tier (cores + viewport width) when no explicit `qualityTier` is supplied |

### The e2e data-attribute contract

Playwright specs assert `data-{theme}-environment`, `data-quality-tier`,
`data-seed`, `data-time`, `data-frame-budget`, `data-{theme}-zoom`, and
`data-{theme}-node-count` on the environment's wrapper element. Themes built
on `useThemeEnvironmentController` get these for free via its returned
`wrapperProps`. Themes that wire their own canvas/interaction loop
(Forest/Highveld/Phoenix) set the equivalent attributes by hand — check an
existing theme's e2e spec before adding a new one and match its attribute
names exactly; nothing else in the codebase enforces this contract.

## What's provided for free (`shared/`)

| Export | From | What it owns |
| --- | --- | --- |
| `useEnvironmentCanvas` | `useEnvironmentCanvas.ts` | Canvas ref, DPR-aware resize, and the RAF loop — respects a caller-supplied `isRunning` policy and an optional `fixedTimestamp` for deterministic fixtures. **Every theme should use this** — it's the one piece with no legitimate reason to hand-roll per theme. Does *not* own pointer/click wiring or scene/camera state (those differ too much per theme's interaction model to fold in without changing behavior). |
| `resolveEnvironmentQualityTier` | `resolveEnvironmentQualityTier.ts` | The device-heuristic quality-tier fallback used when no explicit `qualityTier` prop/fixture is supplied. |
| `useThemeEnvironmentController` | `useThemeEnvironmentController.ts` | The full controller for the "ring of nodes" content shape (below): pointer/hover/camera-lerp/mode-progress state, `useNodeDock` wiring, `useEnvironmentCanvas` wiring, and `wrapperProps`. A theme using this supplies only an `adapter` object (its own `createScene`/`createNodes`/`drawScene`/`lerpCamera`/`pickNode`/`worldToScreen`/`playTone`) — everything else is shared. |
| `useNodeDock` + `EnvironmentTooltipDock` | `useNodeDock.ts`, `EnvironmentTooltipDock.tsx` | The hover-tooltip + pinned-node "dock" state and UI. Usable standalone (without the full controller) if a theme wants pin/tooltip behavior on its own interaction model. |
| `createThemeTonePlayer` | `createThemeTonePlayer.ts` | Builds a theme's pin/focus audio chime from a small config object (waveform + per-stage frequency/gain ramps). Call it once at module scope per theme file (not inside the component) so the `AudioContext` stays a page-lifetime singleton. |
| `ringPoint`, `worldToScreen`, `pickEnvironmentNode`, `lerpEnvironmentCamera`, `ENVIRONMENT_OVERVIEW_CAMERA` | `environmentWorldMath.ts` | Generic ring-layout placement, screen-space projection, circular hit-testing, and camera-lerp math. Usable standalone from `useThemeEnvironmentController` if a theme wants the geometry but not the full controller. |
| `apps/web/src/components/ui/button.tsx` (`Button`, `variant="ghost"`) | *(not in `shared/`, but part of the contract)* | Every button-like element in every theme routes through this instead of a raw `<button>`, styled via each theme's own CSS module classes. **Never add a new raw `<button>` to a theme environment** — pass the theme's class name through `Button`'s `className`. |

## What stays genuinely theme-specific

- **`*Scene.ts`** — canvas-drawing code (waves, clouds, blueprint grid, tree
  species, terrain). This is the actual visual identity of a theme and is
  never shared.
- **`*World.ts`'s node content** — `createXNodes()`'s literal data (labels,
  colors, ring-layout numbers, subtitle/metric strings), plus each theme's
  `kind` union vocabulary and z-axis field name (Ocean's `depth`, Cloud's
  `altitude`, Lavender's `bloom`, Classic's `elevation`). These are kept
  distinct per theme deliberately — grep confirms none of them is read by
  shared logic, so unifying the names would just rename content, not remove
  duplication.
- **CSS module colors/motion tokens** — class *names* are shared by
  convention within the ring/node pattern (`tooltip`, `dock`, `dockCard`,
  …, see `EnvironmentDockStyles` in `EnvironmentTooltipDock.tsx`); rule
  *bodies* (the actual colors/blur/accent) are per theme.

## Two supported shapes

Not every theme fits the same content model, and forcing one would just
move the copy-paste problem rather than remove it. Two shapes exist today,
both legitimate:

**Ring-of-nodes** (Ocean, Cloud, Lavender, Classic) — content is a ring of
interactive nodes derived from `FOCUS_AREA_CONFIG`/`PORTFOLIO_PROJECTS`,
navigated by hover (tooltip) → click (focus + camera zoom) → optional pin
(dock). These four build on `useThemeEnvironmentController` end to end; a
theme's own file only supplies its scene-drawing function, its node data,
and its tone config — see any of the four `*Environment.tsx` files for the
~120-line adapter-object pattern.

**Bespoke canvas** (Forest, Highveld, Phoenix) — content and interaction
don't map cleanly onto "ring of nodes with pin/focus/dock" (grove
navigation, koppie selection, nested celestial panels). These use
`useEnvironmentCanvas` directly and own their own pointer/click wiring,
state, and UI — still routed through the design-system `Button`, not a
unified controller. Concretely: Forest cut its HUD toolbar entirely after
Phase 1 (fully decorative now, no standing buttons); Highveld kept a
grove-nav toolbar built with `Button`; Phoenix kept its own pinned-dock/
tooltip UI built with `Button`, distinct from `EnvironmentTooltipDock`.
When adding a theme, prefer the ring-of-nodes shape if the content
genuinely is a set of navigable nodes — it's substantially less code. Reach
for the bespoke shape only when the content model doesn't fit.

### Cosmic Frontier: the one exception

`CosmicFrontierEnvironment` wraps the legacy `Starfield/` subtree
(~19,000 lines, explicitly out of scope for this epic) and takes a
different prop shape entirely (`sidebarWidth`, `gameMode`, `debugMode`,
`drawDebugInfo`, plus an imperative `ref`). It cannot join the renderer
map in `ThemeEnvironment.tsx` and stays as an explicit branch. Do not use
it as a reference when building a new theme.

## Adding a new theme

1. Add a `ThemeEnvironmentDefinition` entry to `registry.ts` (and to
   `THEME_ENVIRONMENTS`).
2. Decide ring-of-nodes vs. bespoke canvas (above). Ring-of-nodes is
   strongly preferred unless the content genuinely doesn't fit.
3. Write `*Scene.ts` (drawing) and `*World.ts` (content + node shape) —
   for ring-of-nodes, delegate camera/hit-testing math to
   `environmentWorldMath.ts` exactly like the existing quartet.
4. Write `*Environment.tsx` — for ring-of-nodes, call
   `useThemeEnvironmentController` with an `adapter`; render the returned
   `wrapperProps` on the wrapper `div`, plus `<canvas>` and
   `<EnvironmentTooltipDock>`.
5. Register the component in `ThemeEnvironment.tsx`'s renderer map — no
   other file needs to know this theme exists.
6. Add an e2e spec matching an existing theme's `data-*` attribute
   assertions (see [the data-attribute contract](#the-e2e-data-attribute-contract)).

What you should *not* need to do: hand-roll a canvas resize/RAF loop, a
tooltip/dock UI, ring-placement or camera-lerp math, or a raw `<button>`.
If a new theme ends up doing any of these, either it belongs in the
bespoke-canvas shape for a documented reason, or something that should be
shared isn't yet — extend `shared/`, don't copy a file.
