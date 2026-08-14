import type { ThemeName } from "@/theme";
import type { Star } from "../Starfield/types";

export type EnvironmentQualityTier = "low" | "medium" | "high";
export type EnvironmentMotionMode = "full" | "reduced";

export type ThemeRendererId =
  | "cosmic-starfield"
  | "forest-canopy"
  | "phoenix-reign";

export interface EnvironmentFixture {
  seed: number;
  timeMs: number;
  qualityTier: EnvironmentQualityTier;
  motionMode: EnvironmentMotionMode;
  paused: boolean;
}

export interface ThemeEnvironmentDefinition {
  themeName: ThemeName;
  displayName: string;
  rendererId: ThemeRendererId;
  capabilities: {
    deterministic: {
      seed: boolean;
      time: boolean;
    };
    lifecycle: {
      pause: boolean;
      resume: boolean;
      dispose: boolean;
    };
    viewport: {
      resize: boolean;
      pointerInput: boolean;
    };
    reducedMotion: boolean;
    adaptiveQuality: boolean;
  };
}

export interface ThemeEnvironmentProps {
  themeName: ThemeName;
  isDarkMode: boolean;
  sidebarWidth: number;
  gameMode: boolean;
  debugMode: boolean;
  fixture?: EnvironmentFixture;
  drawDebugInfo?: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    mousePosition: { x: number; y: number; isOnScreen?: boolean } | null,
    stars: Star[],
    mouseEffectRadius: number,
    timestamp?: number,
  ) => void;
}
