// theme/registry/typography-registry.ts

import { TypographyPreset, TypographyScale } from "../mappings";
import { defaultTypographyPreset } from "../constants/tokens/typography";

export interface TypographyRegistry {
  // Presets
  presets: Map<string, TypographyPreset>;

  // Individual scales
  scales: Map<string, TypographyScale>;

  // Component-specific typography
  components: Map<string, Record<string, TypographyScale>>;
}

/**
 * Create a TypographyRegistry seeded with the static "default" preset from
 * theme/constants/tokens/typography.ts, so consumers get real typography
 * data out of the box instead of an empty registry.
 */
export const createTypographyRegistry = (): TypographyRegistry => {
  return {
    presets: new Map([["default", defaultTypographyPreset]]),
    scales: new Map(),
    components: new Map(),
  };
};
