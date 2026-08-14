// hooks/useStarInitialization.ts
import { useCallback, useRef, useState } from "react";
import { initBlackHoles } from "../blackHoles";
import {
  DEFAULT_BLACK_HOLES,
  DEFAULT_PORTFOLIO_PROJECTS,
  getColorPalette,
} from "../constants";
import { initPlanets } from "../Planets";
import { resetConnectionStagger } from "../stars";
import { BlackHole, DebugSettings, Planet, Star } from "../types";
import { logger } from "@/utils/logger";
import { createSeededRandom } from "../utils";

// Default values for planet/employee star properties (matching Starfield.tsx defaults)
const DEFAULT_ENABLE_PLANETS = true;
const DEFAULT_PLANET_SIZE = 1.0;

interface StarInitializationProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  dimensionsRef: React.MutableRefObject<{ width: number; height: number }>;
  starDensity: number;
  sidebarWidth: number;
  centerOffsetX: number;
  centerOffsetY: number;
  starSize: number;
  colorScheme: string;
  enableBlackHole: boolean;
  blackHoleSize: number;
  particleSpeed: number;
  /**
   * Enable planet/employee star rendering.
   * @preferred Use `enablePlanets` (new naming convention)
   * @deprecated `enableEmployeeStars` is supported for backward compatibility
   */
  enablePlanets?: boolean;
  enableEmployeeStars?: boolean;
  /**
   * Size multiplier for planets/employee stars.
   * @preferred Use `planetSize` (new naming convention)
   * @deprecated `employeeStarSize` is supported for backward compatibility
   */
  planetSize?: number;
  employeeStarSize?: number;
  debugSettings: DebugSettings;
  cancelAnimation: () => void;
  randomSeed?: number;
}

export const useStarInitialization = ({
  canvasRef,
  dimensionsRef,
  starDensity,
  sidebarWidth,
  centerOffsetX,
  centerOffsetY,
  starSize,
  colorScheme,
  enableBlackHole,
  blackHoleSize,
  particleSpeed,
  // Preferred: enablePlanets/planetSize; Deprecated: enableEmployeeStars/employeeStarSize
  enablePlanets,
  enableEmployeeStars,
  planetSize,
  employeeStarSize,
  debugSettings,
  cancelAnimation,
  randomSeed,
}: StarInitializationProps): {
  stars: Star[];
  starsRef: React.MutableRefObject<Star[]>;
  blackHoles: BlackHole[];
  blackHolesRef: React.MutableRefObject<BlackHole[]>;
  planets: Planet[];
  planetsRef: React.MutableRefObject<Planet[]>;
  employeeStars: Planet[];
  employeeStarsRef: React.MutableRefObject<Planet[]>;
  initializeElements: () => void;
  ensureStarsExist: () => Star[];
  resetStars: () => void;
  isStarsInitializedRef: React.MutableRefObject<boolean>;
} => {
  // Resolve naming: prefer new names (enablePlanets/planetSize) but fallback to deprecated names
  const effectiveEnablePlanets =
    enablePlanets ?? enableEmployeeStars ?? DEFAULT_ENABLE_PLANETS;
  const effectivePlanetSize =
    planetSize ?? employeeStarSize ?? DEFAULT_PLANET_SIZE;

  // Store stars in refs to prevent re-renders
  const starsRef = useRef<Star[]>([]);
  const blackHolesRef = useRef<BlackHole[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const isStarsInitializedRef = useRef(false);
  const isInitializedRef = useRef(false);

  // State for UI updates only - not used for animation calculations
  const [stars, setStars] = useState<Star[]>([]);
  const [blackHoles, setBlackHoles] = useState<BlackHole[]>([]);
  const [planets, setPlanets] = useState<Planet[]>([]);

  // Custom function to initialize stars with lower initial velocities - memoized
  const initializeStarsWithLowVelocity = useCallback(
    (
      width: number,
      height: number,
      starCount: number,
      sidebarWidth: number = 0,
      _centerOffsetX: number = 0,
      _centerOffsetY: number = 0,
      starSize: number = 1.0,
      colorScheme: string = "white",
      random: () => number = Math.random,
    ): Star[] => {
      logger.debug(`Initializing ${starCount} stars with size ${starSize}`);

      // Create a new array to hold the stars
      const stars: Star[] = [];
      const colors = getColorPalette(colorScheme);

      // Calculate effective width (accounting for sidebar)
      const effectiveWidth = width - sidebarWidth;

      for (let i = 0; i < starCount; i++) {
        // Position stars within the effective width (after sidebar)
        const x = sidebarWidth + random() * effectiveWidth;
        const y = random() * height;

        // Random size with weighted distribution (more small stars)
        const sizeMultiplier = Math.pow(random(), 2) * 2 + 0.5;
        const size = sizeMultiplier * starSize;

        // Random color from palette
        const color = colors[Math.floor(random() * colors.length)];

        // Create star with small initial velocity
        stars.push({
          x,
          y,
          size,
          color,
          vx: (random() - 0.5) * 0.05, // Small random initial velocity
          vy: (random() - 0.5) * 0.05, // Small random initial velocity
          originalX: x,
          originalY: y,
          mass: size * 2,
          speed: random() * 0.05, // Small random speed
          isActive: false,
          lastPushed: 0,
          targetVx: 0,
          targetVy: 0,
          fx: 0,
          fy: 0,
        });
      }

      logger.debug(`Created ${stars.length} stars with first star:`, stars[0]);
      return stars;
    },
    [],
  );

  const initializeElements = useCallback((): void => {
    logger.debug(
      "Initializing elements with dimensions:",
      dimensionsRef.current,
    );

    // Always reinitialize stars when this function is called
    isStarsInitializedRef.current = false;

    const width = dimensionsRef.current.width || window.innerWidth;
    const height = dimensionsRef.current.height || window.innerHeight;

    if (width === 0 || height === 0) {
      logger.debug("Invalid dimensions, using window dimensions");
      dimensionsRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    if (canvasRef.current) {
      canvasRef.current.width = dimensionsRef.current.width;
      canvasRef.current.height = dimensionsRef.current.height;
      logger.debug(
        "Canvas dimensions set to:",
        canvasRef.current.width,
        canvasRef.current.height,
      );
    }

    // Create stars with explicit dimensions
    const starCount = Math.floor(
      dimensionsRef.current.width *
        dimensionsRef.current.height *
        0.00015 *
        starDensity,
    );
    logger.debug(`Creating ${starCount} stars`);

    const newStars = initializeStarsWithLowVelocity(
      dimensionsRef.current.width,
      dimensionsRef.current.height,
      starCount,
      sidebarWidth,
      centerOffsetX,
      centerOffsetY,
      starSize,
      colorScheme,
      randomSeed === undefined ? Math.random : createSeededRandom(randomSeed),
    );

    // Initialize black holes
    const newBlackHoles = initBlackHoles(
      width,
      height,
      enableBlackHole,
      DEFAULT_BLACK_HOLES,
      sidebarWidth,
      centerOffsetX,
      centerOffsetY,
      blackHoleSize,
      particleSpeed,
      colorScheme,
      starSize,
      randomSeed === undefined
        ? Math.random
        : createSeededRandom(randomSeed + 1000),
    );

    // Initialize employee stars with extremely slow orbit speeds
    const newPlanets = initPlanets(
      width,
      height,
      effectiveEnablePlanets,
      DEFAULT_PORTFOLIO_PROJECTS,
      sidebarWidth,
      centerOffsetX,
      centerOffsetY,
      effectivePlanetSize,
      false,
      randomSeed === undefined
        ? Math.random
        : createSeededRandom(randomSeed + 2000),
    );

    // Modify employee stars to have extremely slow orbit speeds
    const modifiedPlanets = newPlanets.map((empStar) => ({
      ...empStar,
      orbitSpeed: debugSettings.employeeOrbitSpeed, // Use debug setting
      pulsation: {
        enabled: false,
        speed: 0,
        minScale: 1,
        maxScale: 1,
        scale: 1,
        direction: 1,
      },
      trailLength: 0,
      glowIntensity: empStar.glowIntensity || 1.0,
    }));

    // Update refs first
    starsRef.current = [...newStars];
    blackHolesRef.current = newBlackHoles;
    planetsRef.current = modifiedPlanets;

    // Then update state (for UI updates only)
    setStars(newStars);
    setBlackHoles(newBlackHoles);
    setPlanets(modifiedPlanets);

    logger.debug(`Initialized with ${newStars.length} stars`);
    isStarsInitializedRef.current = true;
  }, [
    starDensity,
    sidebarWidth,
    centerOffsetX,
    centerOffsetY,
    starSize,
    colorScheme,
    enableBlackHole,
    blackHoleSize,
    particleSpeed,
    effectiveEnablePlanets,
    effectivePlanetSize,
    initializeStarsWithLowVelocity,
    debugSettings.employeeOrbitSpeed,
    randomSeed,
    canvasRef,
    dimensionsRef,
  ]);

  // Create a function to ensure stars exist (for animation loop)
  const ensureStarsExist = useCallback((): Star[] => {
    logger.debug("Ensuring stars exist");

    if (!starsRef.current || starsRef.current.length === 0) {
      logger.debug("Stars not initialized, initializing now");

      // Try to initialize elements first
      initializeElements();

      // If still no stars, create fallback stars
      if (!starsRef.current || starsRef.current.length === 0) {
        logger.debug("Creating fallback stars");

        // Create a minimal set of stars as fallback
        const fallbackStars = [];
        const width = dimensionsRef.current.width || window.innerWidth;
        const height = dimensionsRef.current.height || window.innerHeight;

        for (let i = 0; i < 100; i++) {
          fallbackStars.push({
            x:
              (randomSeed === undefined
                ? Math.random()
                : createSeededRandom(randomSeed + i)()) * width,
            y:
              (randomSeed === undefined
                ? Math.random()
                : createSeededRandom(randomSeed + 100 + i)()) * height,
            size:
              (randomSeed === undefined
                ? Math.random()
                : createSeededRandom(randomSeed + 200 + i)()) *
                2 +
              1,
            color: "rgba(255, 255, 255, 0.8)",
            vx:
              ((randomSeed === undefined
                ? Math.random()
                : createSeededRandom(randomSeed + 300 + i)()) -
                0.5) *
              0.05,
            vy:
              ((randomSeed === undefined
                ? Math.random()
                : createSeededRandom(randomSeed + 400 + i)()) -
                0.5) *
              0.05,
            originalX: 0,
            originalY: 0,
            mass: 1,
            speed: 0,
            isActive: false,
            lastPushed: 0,
            targetVx: 0,
            targetVy: 0,
            fx: 0,
            fy: 0,
          });
        }

        // Update the ref and state
        starsRef.current = fallbackStars;
        setStars(fallbackStars);
        logger.debug("Created fallback stars:", fallbackStars.length);
      }
    }

    return starsRef.current;
  }, [initializeElements, dimensionsRef, randomSeed]);

  // Function to reset all stars
  const resetStars = useCallback((): void => {
    logger.debug("Reset stars called");

    const width = dimensionsRef.current.width || window.innerWidth;
    const height = dimensionsRef.current.height || window.innerHeight;

    if (!width || !height) {
      logger.debug("Invalid dimensions, can't reset stars");
      return;
    }

    // Cancel any existing animation first
    cancelAnimation();

    // Reset connection stagger to restart the connection reveal animation
    resetConnectionStagger();

    // Reset initialization flags to force complete reinitialization
    isStarsInitializedRef.current = false;
    isInitializedRef.current = false;

    const starCount = Math.floor(width * height * 0.00015 * starDensity);
    logger.debug(`Creating ${starCount} stars`);

    // Create completely new stars with low velocity
    const newStars = initializeStarsWithLowVelocity(
      width,
      height,
      starCount,
      sidebarWidth,
      centerOffsetX,
      centerOffsetY,
      starSize,
      colorScheme,
      randomSeed === undefined ? Math.random : createSeededRandom(randomSeed),
    );

    logger.debug(`Created ${newStars.length} stars`);

    // Update ref first
    starsRef.current = [...newStars];

    // Then update state
    setStars(newStars);

    // Force a re-initialization of all elements with a small delay
    // to ensure state updates have propagated
    setTimeout(() => {
      initializeElements();
    }, 50);

    logger.debug("Stars reset complete");
  }, [
    starDensity,
    sidebarWidth,
    centerOffsetX,
    centerOffsetY,
    starSize,
    colorScheme,
    initializeStarsWithLowVelocity,
    initializeElements,
    cancelAnimation,
    dimensionsRef,
    randomSeed,
  ]);

  return {
    stars,
    starsRef,
    blackHoles,
    blackHolesRef,
    planets,
    planetsRef,
    // Aliases for backward compatibility with old naming (employeeStars)
    employeeStars: planets,
    employeeStarsRef: planetsRef,
    initializeElements,
    ensureStarsExist,
    resetStars,
    isStarsInitializedRef,
  };
};
