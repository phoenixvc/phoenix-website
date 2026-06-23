// components/Layout/Starfield/types.ts

import { Variants } from "framer-motion";
import React from "react";
import { Camera, CosmicNavigationState } from "./cosmos/types";
// Re-export cosmos navigation types so consumers can import them from the
// Starfield types barrel (Layout, cosmic-demo page).
export type { CosmicNavigationState } from "./cosmos/types";

// Basic types
export interface Point {
  x: number;
  y: number;
}

export interface CenterPosition {
  x: number;
  y: number;
}

// Portfolio project types - re-exported from centralized source
// Re-export the canonical project enums from the single source of truth.
// These were previously duplicated here and had drifted (the local copy was
// missing the "seed" status), which broke PortfolioProject assignability.
import type { ProjectStatus, FocusAreaId } from "@/constants/portfolioData";
export type { ProjectStatus, FocusAreaId };

export interface PortfolioProject {
  id: string;
  name: string;
  fullName?: string;
  initials: string;
  color: string;
  position?: string;
  department?: string;
  mass?: number;
  speed?: number;
  image?: string;
  skills?: string[] | string;
  relatedIds?: string[];
  experience?: number;
  expertise?: string;
  projects?: string[];
  bio?: string;
  title: string;
  status?: ProjectStatus;
  relatedProjects: string[];
  product: string;
  focusArea?: FocusAreaId;
}

export interface Satellite {
  angle: number;
  distance: number;
  speed: number;
  size: number;
  color: string;
  eccentricity: number;
}

export interface PortfolioSatellite {
  angle: number;
  distance: number;
  speed: number;
  size: number;
  color: string;
}

export interface Pulsation {
  enabled: boolean;
  speed: number;
  minScale: number;
  maxScale: number;
  scale: number;
  direction: number;
}

export interface Planet {
  project: PortfolioProject;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  rotationSpeed: number;
  orbitRadius: number;
  orbitSpeed: number;
  satellites?: Satellite[];
  isHovered?: boolean;
  isSelected?: boolean;
  orbitalDirection: "clockwise" | "counterclockwise";
  pathType:
    | "comet"
    | "satellite"
    | "planet"
    | "asteroid"
    | "star"
    | "binary"
    | "elliptical";
  pathEccentricity: number; // 0-1 value where 0 is perfect circle, 1 is extremely elliptical
  pathTilt: number; // Angle in degrees for the tilt of the orbital plane
  trailLength?: number; // For comet-like objects with visible trails
  glowIntensity?: number; // For stars or other glowing objects
  pulsation?: Pulsation;
  useSimpleRendering: boolean;
  verticalFactor: number;
  skills?: {
    name: string;
    icon: string;
  }[];
  originalVx?: number;
  originalVy?: number;
  originalOrbitSpeed?: number;
  isMovementPaused: boolean;
  orbitCenter: {
    x: number;
    y: number;
  };
  orbitParentId?: string;
  /** Cached sun color for fast rendering (avoids repeated lookup) */
  cachedSunColor?: string;
  /** Cached RGB values for project color (avoids hexToRgb per frame) */
  cachedCoreRgb?: { r: number; g: number; b: number };
  /** Cached RGB values for sun/glow color (avoids hexToRgb per frame) */
  cachedGlowRgb?: { r: number; g: number; b: number };
  /** Cached unique offset for animation timing (avoids string reduce per frame) */
  cachedUniqueOffset?: number;
}

export interface HoverInfo {
  project: PortfolioProject | null;
  x: number;
  y: number;
  show: boolean;
  isPinned?: boolean;
}

/** Cached parsed RGBA color values for performance */
export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Star-related types
export interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  originalX: number;
  originalY: number;
  mass: number;
  speed: number;
  targetVx?: number;
  targetVy?: number;
  isActive: boolean;
  lastPushed: number;
  /** Timestamp when star was consumed by blackhole (0 = not consumed) */
  consumedAt?: number;
  /** Whether star is currently hidden (consumed and waiting to respawn) */
  isConsumed?: boolean;
  // Performance cache fields (pre-calculated during init)
  /** Pre-calculated twinkle speed 1 for this star */
  twinkleSpeed1?: number;
  /** Pre-calculated twinkle speed 2 for this star */
  twinkleSpeed2?: number;
  /** Pre-calculated unique seed for animation timing */
  uniqueSeed?: number;
  /** Cached parsed color for fast color manipulation */
  parsedColor?: ParsedColor;
}

// Black hole types
export interface BlackHoleData {
  id: string;
  x: number; // Percentage of screen width (0-1)
  y: number; // Percentage of screen height (0-1)
  mass: number;
  particles: number; // Number of particles to generate
}

export interface BlackHole {
  id: string;
  x: number;
  y: number;
  mass: number;
  radius: number;
  particles: BlackHoleParticle[];
  active?: boolean;
  color: string;
  rotation: number;
  rotationSpeed: number;
  lastParticleTime: number;
}

export interface BlackHoleParticle {
  x: number;
  y: number;
  size: number;
  angle: number;
  distance: number;
  speed: number;
  color: string;
  alpha?: number;
  /** Pre-parsed RGB values for fast color manipulation */
  rgb?: { r: number; g: number; b: number };
}

// Visual effects types
export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  /** Pre-computed base color without alpha for fast rendering (e.g., "rgba(255, 100, 200, ") */
  colorBase?: string;
  time: number;
}

export interface Burst {
  x: number;
  y: number;
  time: number;
  particles: BurstParticle[];
}

export interface ClickBurst {
  x: number;
  y: number;
  time: number;
  particles: BurstParticle[];
}

export interface CollisionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export interface CollisionEffect {
  x: number;
  y: number;
  color: string;
  /** Pre-computed base color without alpha for fast rendering (e.g., "rgba(255, 100, 200, ") */
  colorBase?: string;
  time: number;
  score: number;
  particles: CollisionParticle[];
}

// Interaction types
export interface MousePosition {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  speedX: number;
  speedY: number;
  isClicked: boolean;
  clickTime: number;
  isOnScreen: boolean;
}

// Game-related types
export interface GameScore {
  score: number;
  date: string;
}

export interface GameCollision {
  x: number;
  y: number;
  time: number;
  score: number;
  employeeName: string;
}

export interface GameState {
  remainingClicks: number;
  score: number;
  lastClickTime: number;
  highScores: GameScore[];
  lastScoreUpdate: number;
  ipAddress: string | null;
  collisions: GameCollision[];
  clickAddInterval: number;
}

// Hero mode types
// types.ts (in the hero feature folder)
export interface HeroProps {
  title?: string;
  subtitle?: string;
  primaryCta?: {
    text: string;
    url: string;
  };
  secondaryCta?: {
    text: string;
    url: string;
  };
  isLoading?: boolean;
  enableMouseTracking?: boolean; // Add this prop
}

export interface HeroAnimations {
  container: Variants;
  item: Variants;
}

export interface CtaConfig {
  text: string;
  href: string;
}

export interface ContainerBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface HeroStarfieldProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  colorScheme?: string;
  starDensity?: number;
  starSize?: number;
  lineConnectionDistance?: number;
  lineOpacity?: number;
  mouseEffectRadius?: number;
  mouseEffectColor?: string;
  isDarkMode?: boolean;
}

// Theme types
export type ThemeMode = "light" | "dark" | "auto";
export type ColorScheme =
  | "purple"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | string;

// Debug types
export interface DebugSettings {
  isDebugMode: boolean;
  animationSpeed: number;
  maxVelocity: number;
  flowStrength: number;
  gravitationalPull: number;
  particleSpeed: number;
  starSize: number;
  employeeOrbitSpeed: number;
  mouseEffectRadius: number;
  lineConnectionDistance: number;
  lineOpacity: number;
  sidebarWidth: number;
  repulsionRadius: number;
  repulsionForce: number;
  repulsionEnabled: boolean;
}

export interface UseDebugControlsProps {
  initialDebugMode: boolean;
  initialAnimationSpeed?: number;
  initialMaxVelocity?: number;
  initialFlowStrength?: number;
  initialGravitationalPull?: number;
  initialParticleSpeed?: number;
  initialStarSize?: number;
  initialEmployeeOrbitSpeed?: number;
  initialMouseEffectRadius?: number;
  initialLineConnectionDistance?: number;
  initialLineOpacity?: number;
  resetStarsCallback?: () => void;
  sidebarWidth: number;
}

// Component props
export interface AnimationLoopProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  dimensions: { width: number; height: number };
  stars: Star[];
  blackHoles: BlackHole[];
  planets: Planet[];
  mousePosition: MousePosition;
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
  centerPosition: { x: number; y: number };
  hoverInfo: HoverInfo;
  setHoverInfo: React.Dispatch<React.SetStateAction<HoverInfo>>;
  colorScheme: string;
  lineConnectionDistance: number;
  lineOpacity: number;
  mouseEffectRadius: number;
  mouseEffectColor: string;
  clickBursts: Burst[];
  setClickBursts: React.Dispatch<React.SetStateAction<Burst[]>>;
  clickBurstsRef: React.MutableRefObject<Burst[]>;
  gameMode: boolean;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  collisionEffects: CollisionEffect[];
  setCollisionEffects: React.Dispatch<React.SetStateAction<CollisionEffect[]>>;
  createCollisionEffect: (
    x: number,
    y: number,
    color: string,
    score: number,
  ) => CollisionEffect;
  isDarkMode: boolean;
  frameCountRef: React.MutableRefObject<number>;
  debugMode?: boolean;
  drawDebugInfo?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mousePosition: MousePosition,
    stars: Star[],
    mouseEffectRadius: number,
    timestamp?: number,
  ) => void;
  maxVelocity?: number;
  animationSpeed?: number;
  starsRef?: React.MutableRefObject<Star[]>;
  blackHolesRef?: React.MutableRefObject<BlackHole[]>;
  planetsRef?: React.MutableRefObject<Planet[]>;
  ensureStarsExist?: () => void;
}

export interface StarfieldProps {
  enableFlowEffect?: boolean;
  enableBlackHole?: boolean;
  enableMouseInteraction?: boolean;
  enablePlanets?: boolean;
  // Alias for backward compatibility
  enableEmployeeStars?: boolean;
  starDensity?: number;
  colorScheme?: string;
  starSize?: number;
  sidebarWidth?: number;
  centerOffsetX?: number;
  centerOffsetY?: number;
  flowStrength?: number;
  gravitationalPull?: number;
  particleSpeed?: number;
  planetSize?: number;
  // Alias for backward compatibility
  employeeStarSize?: number;
  employeeDisplayStyle?: "initials" | "avatar" | "both";
  blackHoleSize?: number;
  heroMode?: boolean;
  containerRef?: React.RefObject<HTMLElement> | null;
  lineConnectionDistance?: number;
  lineOpacity?: number;
  mouseEffectRadius?: number;
  mouseEffectColor?: string;
  initialMousePosition?: {
    x: number;
    y: number;
    isActive: boolean;
  } | null;
  isDarkMode?: boolean;
  gameMode?: boolean;
  debugMode?: boolean;
  maxVelocity?: number;
  animationSpeed?: number;
  drawDebugInfo?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mousePosition: { x: number; y: number; isOnScreen?: boolean } | null,
    stars: Star[],
    mouseEffectRadius: number,
    timestamp?: number,
  ) => void;

  enableCosmicNavigation?: boolean;
  navigationState?: CosmicNavigationState;
  camera?: Camera;
  setCamera?: (camera: Camera) => void;
  hoveredObjectId?: string | null;
}

// Type aliases
export type PortfolioStar = Planet;
export type InteractiveStarfieldProps = StarfieldProps;

// Global declarations
declare global {
  interface Window {
    planets?: Planet[];
    starfieldAPI?: {
      applyForce: (
        x: number,
        y: number,
        radius: number,
        force: number,
      ) => number;
      getStarsCount: () => number;
      createExplosion: (x: number, y: number) => boolean;
      // Optional extended API — declared for future use; only the three
      // methods above are currently wired up by useStarfieldAPI.
      checkHover?: (x: number, y: number) => string | null;
      getPinnedCount?: () => number;
      getHoveredSunId?: () => string | null;
      getCamera?: () => Camera;
      pinProject?: (id: string) => void;
    };
  }
}
