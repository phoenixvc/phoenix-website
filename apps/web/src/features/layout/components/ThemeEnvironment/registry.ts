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

export const THEME_ENVIRONMENTS = {
  "cosmic-frontier": COSMIC_FRONTIER_ENVIRONMENT,
} as const;
