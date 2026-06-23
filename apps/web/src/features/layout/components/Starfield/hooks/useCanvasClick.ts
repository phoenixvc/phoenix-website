/**
 * useCanvasClick - Unified click/touch handling for Starfield canvas
 *
 * This hook consolidates the duplicate click logic that was in:
 * 1. handleCanvasClick (React onClick)
 * 2. DOM click listener (backup)
 * 3. onTouchEnd handler
 *
 * All three now call the same core logic.
 */

import { useCallback, RefObject, Dispatch, SetStateAction } from "react";
import { checkSunHover } from "./animation/sunState";
import { applyClickRepulsionToSunsCanvas } from "../sunSystem";
import { applyClickRepulsionToPlanets } from "../Planets";
import { MousePosition, Planet, PortfolioProject } from "../types";
import { Camera } from "../cosmos/types";
import { logger } from "@/utils/logger";
import { screenToWorldCoords } from "./animation/hoverUtils";
import { ORBIT_CONFIG } from "../renderingConfig";
import { SIZE_CONFIG } from "../physicsConfig";

// Mobile detection breakpoint (matches common responsive design breakpoint)
const MOBILE_BREAKPOINT_WIDTH = 768;

// Memoized mobile detection result
let isMobileDeviceCached: boolean | null = null;

export interface CanvasClickConfig {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  planetsRef: RefObject<Planet[]>;
  cameraRef?: RefObject<Camera | undefined>;
  setMousePosition?: Dispatch<SetStateAction<MousePosition>>;
  onSunClick: (sunId: string) => void;
  onPlanetClick?: (project: PortfolioProject) => void;
  applyStarfieldRepulsion: (x: number, y: number) => void;
}

export interface CanvasClickHandlers {
  handleCanvasClick: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleTouchEnd: (event: React.TouchEvent<HTMLCanvasElement>) => void;
}

/**
 * Detect if mobile device based on touch support and user agent
 * Result is memoized to avoid repeated computation on every touch event
 */
function isMobileDevice(): boolean {
  // Return cached result if available
  if (isMobileDeviceCached !== null) {
    return isMobileDeviceCached;
  }
  
  // Check for touch support
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  
  // Check user agent for mobile patterns
  const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobilePattern.test(navigator.userAgent);
  
  // Consider it mobile if it has touch AND matches mobile UA, or if screen is small with touch
  isMobileDeviceCached = (hasTouch && isMobileUA) || (hasTouch && window.innerWidth < MOBILE_BREAKPOINT_WIDTH);
  
  return isMobileDeviceCached;
}

/**
 * Check if a click/touch is on a planet
 * Returns the planet project if clicked, null otherwise
 */
function checkPlanetClick(
  x: number,
  y: number,
  width: number,
  height: number,
  planets: Planet[],
  camera: Camera | undefined,
  planetSize: number,
): PortfolioProject | null {
  if (!planets || planets.length === 0) return null;

  // Transform mouse coordinates from screen to world space if camera is provided
  let worldMouseX = x;
  let worldMouseY = y;
  if (camera) {
    const worldCoords = screenToWorldCoords(x, y, camera, width, height);
    worldMouseX = worldCoords.x;
    worldMouseY = worldCoords.y;
  }

  // Use same hover radius as hover detection for consistency
  const zoomFactor = camera?.zoom || 1;
  const hoverRadius = (ORBIT_CONFIG.hover.radiusMultiplier * planetSize) / zoomFactor;

  // Find the closest planet within hover radius
  let closestPlanet: Planet | null = null;
  let closestDistance = Infinity;

  for (const planet of planets) {
    const dx = worldMouseX - planet.x;
    const dy = worldMouseY - planet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < hoverRadius && dist < closestDistance) {
      closestDistance = dist;
      closestPlanet = planet;
    }
  }

  return closestPlanet?.project || null;
}

/**
 * Core click processing logic - shared by all click/touch handlers
 */
function processCanvasClick(
  x: number,
  y: number,
  width: number,
  height: number,
  config: CanvasClickConfig,
  isTouchEvent: boolean = false,
): void {
  // Get current camera state for coordinate transformation (matches hover detection)
  const camera = config.cameraRef?.current ?? undefined;

  // 1. Check if click was on a sun FIRST (before any physics)
  // Pass camera to ensure click detection uses same coords as hover detection
  const sunHoverResult = checkSunHover(x, y, width, height, camera);

  if (sunHoverResult) {
    // Clicked on a sun - zoom to focus on that area
    config.onSunClick(sunHoverResult.sun.id);
    return;
  }

  // 2. Check if click was on a planet (mobile auto-pin)
  // On mobile, automatically pin the project instead of showing tooltip first
  if (isTouchEvent && isMobileDevice() && config.onPlanetClick) {
    const planets = config.planetsRef.current;
    if (planets && planets.length > 0) {
      // Use planetBaseSize from SIZE_CONFIG (matches actual rendering)
      const clickedProject = checkPlanetClick(x, y, width, height, planets, camera, SIZE_CONFIG.planetBaseSize);
      
      if (clickedProject) {
        // Auto-pin the project on mobile
        logger.debug("[useCanvasClick] Mobile planet click detected, auto-pinning project:", clickedProject.name);
        config.onPlanetClick(clickedProject);
        return; // Skip repulsion effects when clicking a planet on mobile
      }
    }
  }

  // 3. Apply repulsion effects (only if NOT clicking a sun or planet)
  // Apply to suns (orbital centers)
  applyClickRepulsionToSunsCanvas(x, y, width, height);

  // Apply to planets (orbiting portfolio items)
  const planets = config.planetsRef.current;
  if (planets && planets.length > 0) {
    applyClickRepulsionToPlanets(planets, x, y);
  }

  // Apply to background stars
  config.applyStarfieldRepulsion(x, y);

  // 4. Update mouse position state
  if (config.setMousePosition) {
    config.setMousePosition((prev) => ({
      ...prev,
      x,
      y,
      isClicked: false,
      clickTime: Date.now(),
    }));
  }
}

/**
 * Hook for unified canvas click handling
 */
export function useCanvasClick(config: CanvasClickConfig): CanvasClickHandlers {
  const { canvasRef } = config;

  // React onClick handler
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      const canvas = canvasRef.current;
      if (!canvas) {
        logger.warn("[useCanvasClick] Canvas ref is null");
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      processCanvasClick(x, y, rect.width, rect.height, config);
    },
    [canvasRef, config],
  );

  // Touch end handler (for mobile)
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>): void => {
      if (event.changedTouches.length === 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const touch = event.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      processCanvasClick(x, y, rect.width, rect.height, config, true); // Pass true for isTouchEvent
    },
    [canvasRef, config],
  );

  // NOTE: DOM backup listener removed - React's onClick/onTouchEnd handlers are sufficient
  // The backup was causing double-firing of click events

  return {
    handleCanvasClick,
    handleTouchEnd,
  };
}
