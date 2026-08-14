import type { ThemeEnvironmentDefinition } from "./types";

export const COSMIC_FRONTIER_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "cosmic-frontier",
  displayName: "Cosmic Frontier",
  rendererId: "cosmic-starfield",
  fixtureParam: "cosmic-fixture",
  staticFixture: {
    seed: 20260809,
    timeMs: 12000,
    qualityTier: "low",
    motionMode: "reduced",
    paused: true,
  },
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

export const HIGHVELD_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "highveld",
  displayName: "Highveld",
  rendererId: "highveld-plateau",
  fixtureParam: "highveld-fixture",
  staticFixture: {
    // 9170ms sits inside the third seeded strike for seed 20260814, so the
    // representative frame carries a live bolt instead of an empty sky.
    seed: 20260814,
    timeMs: 9170,
    qualityTier: "low",
    motionMode: "reduced",
    paused: true,
  },
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
  highveld: HIGHVELD_ENVIRONMENT,
} as const;
