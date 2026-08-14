/**
 * usePerformanceTier - Adaptive performance management for Starfield
 *
 * This hook manages:
 * 1. Performance tier (low/medium/high) based on FPS
 * 2. FPS tracking and smoothing
 * 3. Starfield initialization delay (hide initial positioning)
 * 4. Performance panel visibility
 *
 * The tier adapts automatically:
 * - Upgrades after sustained high FPS (~1 second at 55+ FPS)
 * - Downgrades after sustained low FPS (~0.5 second at <30 FPS)
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from "react";
import { EFFECT_TIMING } from "../physicsConfig";

export type PerformanceTier = "low" | "medium" | "high";

export interface PerformanceTierConfig {
  /** FPS threshold above which performance is considered stable (default: 55) */
  stableThreshold?: number;
  /** FPS threshold below which performance is considered struggling (default: 30) */
  lowThreshold?: number;
  /** Number of stable frames required before upgrading tier (default: 60) */
  stableFramesRequired?: number;
  /** Number of low frames required before downgrading tier (default: 30) */
  lowFramesRequired?: number;
  /** Initial performance tier (default: "low") */
  initialTier?: PerformanceTier;
  /** Disable FPS-driven changes when a deterministic fixture forces a tier. */
  adaptive?: boolean;
}

export interface PerformanceTierResult {
  /** Current performance tier */
  performanceTier: PerformanceTier;
  /** Current FPS value */
  currentFps: number;
  /** Current timestamp from animation loop */
  timestamp: number;
  /** Whether starfield has completed initialization */
  isStarfieldReady: boolean;
  /** Whether performance panel is visible */
  showPerformancePanel: boolean;
  /** Toggle performance panel visibility */
  setShowPerformancePanel: Dispatch<SetStateAction<boolean>>;
  /** Callback to update FPS data (called from animation loop) */
  updateFpsData: (fps: number, currentTimestamp: number) => void;
  /** Ref to FPS history array (for averaging) */
  fpsValuesRef: MutableRefObject<number[]>;
}

const DEFAULT_CONFIG: Required<PerformanceTierConfig> = {
  stableThreshold: 55,
  lowThreshold: 30,
  stableFramesRequired: 60,
  lowFramesRequired: 30,
  initialTier: "low",
  adaptive: true,
};

/**
 * Hook for managing adaptive performance tiers based on FPS
 */
export function usePerformanceTier(
  config: PerformanceTierConfig = {},
): PerformanceTierResult {
  const {
    stableThreshold,
    lowThreshold,
    stableFramesRequired,
    lowFramesRequired,
    initialTier,
    adaptive,
  } = { ...DEFAULT_CONFIG, ...config };

  // Performance tier state - start low for safety
  const [performanceTier, setPerformanceTier] =
    useState<PerformanceTier>(initialTier);
  const stableFpsCountRef = useRef(0);
  const lowFpsCountRef = useRef(0);

  // Track if starfield initialization is complete (hide initial positioning animation)
  const [isStarfieldReady, setIsStarfieldReady] = useState(false);
  const initializationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // FPS tracking state
  const [currentFps, setCurrentFps] = useState<number>(0);
  const [timestamp, setTimestamp] = useState<number>(0);
  const fpsValuesRef = useRef<number[]>([]);

  // Performance panel state
  const [showPerformancePanel, setShowPerformancePanel] =
    useState<boolean>(false);

  /**
   * Update FPS data and adjust performance tier adaptively
   * Called from animation loop each frame (throttled to every N frames)
   */
  const updateFpsData = useCallback(
    (fps: number, currentTimestamp: number): void => {
      setCurrentFps(fps);
      setTimestamp(currentTimestamp);

      if (!adaptive) return;

      // Adaptive Performance Logic
      if (fps > stableThreshold) {
        stableFpsCountRef.current++;
        lowFpsCountRef.current = 0;
        if (stableFpsCountRef.current > stableFramesRequired) {
          setPerformanceTier((prev) => {
            if (prev === "low") return "medium";
            if (prev === "medium") return "high";
            return prev;
          });
          stableFpsCountRef.current = 0;
        }
      } else if (fps < lowThreshold) {
        lowFpsCountRef.current++;
        stableFpsCountRef.current = 0;
        if (lowFpsCountRef.current > lowFramesRequired) {
          setPerformanceTier((prev) => {
            if (prev === "high") return "medium";
            if (prev === "medium") return "low";
            return prev;
          });
          lowFpsCountRef.current = 0;
        }
      }
    },
    [
      adaptive,
      stableThreshold,
      lowThreshold,
      stableFramesRequired,
      lowFramesRequired,
    ],
  );

  // Delay showing starfield until initialization is complete
  // This prevents users from seeing the initial movement to designated positions
  useEffect(() => {
    // Clear any existing timer
    if (initializationTimerRef.current) {
      clearTimeout(initializationTimerRef.current);
    }

    // Wait for stars, planets, and suns to reach their initial positions
    // The delay allows the physics engine to position elements before showing
    initializationTimerRef.current = setTimeout((): void => {
      setIsStarfieldReady(true);
    }, EFFECT_TIMING.starfieldInitializationDelay);

    return (): void => {
      if (initializationTimerRef.current) {
        clearTimeout(initializationTimerRef.current);
      }
    };
  }, []); // Run once on mount

  return {
    performanceTier,
    currentFps,
    timestamp,
    isStarfieldReady,
    showPerformancePanel,
    setShowPerformancePanel,
    updateFpsData,
    fpsValuesRef,
  };
}
