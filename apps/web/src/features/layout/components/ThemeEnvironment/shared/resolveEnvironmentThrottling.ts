import type { EnvironmentQualityTier } from "../types";

export interface EnvironmentThrottling {
  /** Whether the RAF loop should keep requesting frames right now. */
  isRunning: boolean;
  /** Minimum ms between draw() calls while the loop is running (0 = every frame). */
  frameThrottleMs: number;
}

/**
 * Shared frame-throttle policy for Forest/Phoenix's bespoke-canvas RAF
 * loops. Byte-identical across both prior to this extraction: the loop
 * itself keeps requesting frames whenever motion isn't paused/reduced/
 * fixed — quality tier never stops the loop outright the way Highveld's
 * `low` does — only the paint() call is throttled, and only to a flat
 * 30fps. `low`'s frame budget of 0 (see FOREST_FRAME_BUDGET_MS /
 * PHOENIX_FRAME_BUDGET_MS) is the sole thing that bypasses the throttle;
 * `medium`/`high`'s budget values (6/8) were never themselves the ms
 * interval, only ever compared against zero.
 */
export const resolveEnvironmentThrottling = (
  qualityTier: EnvironmentQualityTier,
  paused: boolean | undefined,
  reducedMotion: boolean,
  fixedTimestamp: number | undefined,
): EnvironmentThrottling => {
  const frameThrottleMs = qualityTier === "low" ? 0 : 1000 / 30;
  const isRunning = !paused && !reducedMotion && fixedTimestamp === undefined;
  return { isRunning, frameThrottleMs };
};
