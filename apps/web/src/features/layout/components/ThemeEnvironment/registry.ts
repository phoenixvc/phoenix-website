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

export const FOREST_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "forest",
  displayName: "Forest",
  rendererId: "forest-canopy",
  fixtureParam: "forest-fixture",
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

export const PHOENIX_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "phoenix",
  displayName: "Phoenix",
  rendererId: "phoenix-reign",
  fixtureParam: "phoenix-fixture",
  staticFixture: {
    seed: 20260814,
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

export const OCEAN_ENVIRONMENT: ThemeEnvironmentDefinition = {
  themeName: "ocean",
  displayName: "Ocean",
  rendererId: "ocean-abyss",
  fixtureParam: "ocean-fixture",
  staticFixture: {
    seed: 20260815,
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

export const THEME_ENVIRONMENTS = {
  "cosmic-frontier": COSMIC_FRONTIER_ENVIRONMENT,
  forest: FOREST_ENVIRONMENT,
  highveld: HIGHVELD_ENVIRONMENT,
  phoenix: PHOENIX_ENVIRONMENT,
  ocean: OCEAN_ENVIRONMENT,
} as const;
