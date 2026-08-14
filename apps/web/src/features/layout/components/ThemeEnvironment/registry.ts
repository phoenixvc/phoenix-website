import type { ThemeEnvironmentDefinition } from "./types";

export const COSMIC_FRONTIER_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "cosmic-frontier",
  displayName: "Cosmic Frontier",
  rendererId: "cosmic-starfield",
  capabilities: {
    deterministic: {
      seed: true,
      time: true,
    },
    lifecycle: {
      pause: true,
      resume: true,
      dispose: true,
    },
    viewport: {
      resize: true,
      pointerInput: true,
    },
    reducedMotion: true,
    adaptiveQuality: true,
  },
};

export const FOREST_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "forest",
  displayName: "Forest",
  rendererId: "forest-canopy",
  capabilities: {
    deterministic: {
      seed: true,
      time: true,
    },
    lifecycle: {
      pause: true,
      resume: true,
      dispose: true,
    },
    viewport: {
      resize: true,
      pointerInput: true,
    },
    reducedMotion: true,
    adaptiveQuality: true,
  },
};

export const PHOENIX_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "phoenix",
  displayName: "Phoenix",
  rendererId: "phoenix-reign",
  capabilities: {
    deterministic: {
      seed: true,
      time: true,
    },
    lifecycle: {
      pause: true,
      resume: true,
      dispose: true,
    },
    viewport: {
      resize: true,
      pointerInput: true,
    },
    reducedMotion: true,
    adaptiveQuality: true,
  },
};

export const THEME_ENVIRONMENTS = {
  "cosmic-frontier": COSMIC_FRONTIER_ENVIRONMENT,
  forest: FOREST_ENVIRONMENT,
  phoenix: PHOENIX_ENVIRONMENT,
} as const;
