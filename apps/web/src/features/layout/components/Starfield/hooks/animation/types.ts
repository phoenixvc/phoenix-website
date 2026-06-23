// components/Layout/Starfield/hooks/animation/types.ts
import { MutableRefObject, SetStateAction } from "react";
import { Camera, CosmicNavigationState } from "../../cosmos/types";
import {
  BlackHole,
  ClickBurst,
  CollisionEffect,
  PortfolioProject,
  GameState,
  HoverInfo,
  MousePosition,
  Planet,
  Star,
} from "../../types";
import type { SunHoverManager } from "./sunHoverManager";
import type { PlanetHoverManager } from "./planetHoverManager";

// Add this interface for debug settings
export interface DebugSettings {
  isDebugMode: boolean;
  flowStrength: number;
  gravitationalPull: number;
  particleSpeed: number;
  mouseEffectRadius: number;
  lineConnectionDistance: number;
  lineOpacity: number;
  maxVelocity?: number;
  animationSpeed?: number;
  employeeOrbitSpeed?: number;
  verboseLogs?: boolean;
}

export interface AnimationProps {
  mousePosition: {
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    speedX: number;
    speedY: number;
    isClicked: boolean;
    clickTime: number;
    isOnScreen: boolean;
  };
  // Optional ref for live mouse position updates without breaking memoization
  // When provided, the animation loop reads directly from this ref on each frame
  mousePositionRef?: MutableRefObject<MousePosition>;
  hoverInfo: {
    project: PortfolioProject | null;
    x: number;
    y: number;
    show: boolean;
  }; // Updated to match HoverInfo type
  gameState: {};
  starSize: number;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  starsRef?: MutableRefObject<Star[]>; // Make optional to match AnimationLoopProps
  blackHolesRef?: MutableRefObject<BlackHole[]>;
  planetsRef?: MutableRefObject<Planet[]>;
  frameCountRef?: MutableRefObject<number>;
  dimensions: { width: number; height: number };
  enableFlowEffect: boolean;
  enableBlackHole: boolean;
  enableMouseInteraction: boolean;
  enablePlanets: boolean;
  flowStrength: number;
  gravitationalPull: number;
  particleSpeed: number;
  planetSize: number;
  employeeDisplayStyle: "initials" | "avatar" | "both";
  heroMode: boolean;
  centerPosition?: { x: number; y: number };
  colorScheme: string;
  lineConnectionDistance: number;
  lineOpacity: number;
  mouseEffectRadius: number;
  mouseEffectColor: string;
  maxVelocity?: number; // Make optional
  animationSpeed?: number; // Make optional
  isDarkMode: boolean;
  debugMode?: boolean; // Make optional
  gameMode: boolean;
  setHoverInfo: (_info: SetStateAction<HoverInfo>) => void;
  setClickBursts: (bursts: ClickBurst[]) => void;
  setGameState: (state: SetStateAction<GameState>) => void;
  setCollisionEffects: (effects: SetStateAction<CollisionEffect[]>) => void;
  createCollisionEffect: (
    x: number,
    y: number,
    color: string,
    score: number,
  ) => CollisionEffect;
  ensureStarsExist?: () => void;
  drawDebugInfo?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mousePosition: MousePosition,
    stars: Star[],
    mouseEffectRadius: number,
    timestamp: number,
  ) => void;
  clickBurstsRef?: MutableRefObject<ClickBurst[]>;
  updateFpsData?: (fps: number, timestamp: number) => void;
  enableCosmicNavigation?: boolean;
  camera?: Camera;
  setCamera?: (camera: Camera) => void;
  navigationState?: CosmicNavigationState;
  hoveredObjectId?: string | null;
  hoveredSunIdRef?: MutableRefObject<string | null>; // Ref for synchronous hoveredSunId access
  focusedSunId?: string | null;
  focusedSunIdRef?: MutableRefObject<string | null>; // Ref for synchronous focusedSunId access (loop reads this, not the memoised prop)
  debugSettings?: DebugSettings; // Add debug settings
  isMouseOverProjectTooltipRef?: MutableRefObject<boolean>; // Track if mouse is over project tooltip
  isMouseOverSunTooltipRef?: MutableRefObject<boolean>; // Track if mouse is over sun tooltip
  projectTooltipElementRef?: MutableRefObject<HTMLDivElement | null>; // Ref to the project tooltip DOM element for accurate position checking
  sunTooltipElementRef?: MutableRefObject<HTMLDivElement | null>; // Ref to the sun tooltip DOM element for accurate position checking
  setHoveredSunId?: (sunId: string | null) => void; // Callback to update hovered sun ID
  setHoveredSun?: (sun: { id: string; name: string; description?: string; color: string; x: number; y: number } | null) => void; // Callback to update hovered sun info
  cameraRef?: MutableRefObject<{ cx: number; cy: number; zoom: number }>; // Ref for synchronous camera access
  sidebarWidth?: number; // Width of sidebar for centering calculations
}

export interface AnimationRefs {
  animationRef: MutableRefObject<number>;
  lastTimeRef: MutableRefObject<number | null>;
  collisionEffectsRef: MutableRefObject<CollisionEffect[]>;
  pendingCollisionEffectsRef: MutableRefObject<CollisionEffect[]>;
  fpsValues: MutableRefObject<number[]>;
  isAnimatingRef: MutableRefObject<boolean>;
  lastDebugModeRef: MutableRefObject<boolean>;
  animationStartTimeRef: MutableRefObject<number>;
  isRestartingRef: MutableRefObject<boolean>;
  frameSkipRef: MutableRefObject<number>;
  lastFrameTimeRef: MutableRefObject<number>;
  animationWatchdogRef: MutableRefObject<number | null>;
  mousePositionRef: React.MutableRefObject<MousePosition>;
  hoverInfoRef: React.MutableRefObject<HoverInfo>;
  gameStateRef: React.MutableRefObject<GameState>; // Changed from unknown to GameState
  animationErrorCountRef: React.MutableRefObject<number>;
  // Centralized hover managers for clean separation of rendering vs tooltip state
  // NOTE: lastSunLeaveTimeRef and lastPlanetLeaveTimeRef removed -
  // hover managers now handle delay timers internally
  sunHoverManagerRef: MutableRefObject<SunHoverManager | null>;
  planetHoverManagerRef: MutableRefObject<PlanetHoverManager | null>;
}
