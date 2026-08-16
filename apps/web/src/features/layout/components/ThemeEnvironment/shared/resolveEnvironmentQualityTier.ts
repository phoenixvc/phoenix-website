import type { EnvironmentQualityTier } from "../types";

/**
 * Device-heuristic quality-tier fallback, used when no explicit
 * `qualityTier` prop/fixture is supplied. Byte-identical across every
 * `*Environment.tsx` prior to this extraction.
 */
export const resolveEnvironmentQualityTier = (
  requested: EnvironmentQualityTier | undefined,
): EnvironmentQualityTier => {
  if (requested) {
    return requested;
  }
  if (typeof window === "undefined") {
    return "medium";
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  const width = window.innerWidth;
  if (width < 768 || cores <= 4) {
    return "low";
  }
  if (cores >= 8 && width >= 1280) {
    return "high";
  }
  return "medium";
};
