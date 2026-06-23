// components/Layout/Starfield/hooks/animation/animate.ts
// Core animation loop - orchestrates all rendering operations
import { drawBlackHole } from "../../blackHoles";
import {
  drawConnections,
  drawStars,
  updateStarActivity,
  updateStarPositions,
} from "../../stars";
import { drawStarBirthplaces } from "../../renderer";
import { logger } from "@/utils/logger";
import { updateFrameCache, getFrameTime } from "../../frameCache";
import {
  BlackHole,
  GameState,
  HoverInfo,
  MousePosition,
  Planet,
  Star,
} from "../../types";
import { processParticleEffects } from "./processParticleEffects";
import { AnimationProps, AnimationRefs } from "./types";
// Import cosmic rendering functions
import { lerpCamera } from "../../cosmos/camera";
import { renderCosmicHierarchy } from "../../cosmos/renderCosmicHierarchy";
import { Camera, CosmicNavigationState } from "../../cosmos/types";
// Import cosmic hierarchy data
// NOTE: checkPlanetHover now called inside planetHoverManager
import { updatePlanets } from "../../Planets";
import { drawCosmicNavigation } from "./drawCosmicNavigation";
// Import centralized utilities
import { TWO_PI } from "../../math";
import {
  STAR_RENDERING_CONFIG,
  ANIMATION_TIMING_CONFIG,
} from "../../renderingConfig";
import { CAMERA_CONFIG } from "../../physicsConfig";
// Import modular rendering functions
import { drawMouseEffects } from "./mouseEffects";
import {
  drawSuns,
  resetAnimationModuleState,
  getFocusAreaSuns,
  checkSunHover,
  getCurrentSunPositions,
} from "./sunRendering";
// NOTE: checkSunHover is now used internally by sunHoverManager
// Import performance profiler
import {
  startTiming,
  endTiming,
  endFrame,
  isProfilerEnabled as _isProfilerEnabled,
} from "../../performanceProfiler";

// Cached default mouse position to avoid allocation every frame
let cachedDefaultMousePosition: MousePosition | null = null;

// Throttle state for elementFromPoint (expensive DOM operation)
let lastElementCheckFrame = 0;
let cachedIsOverContentCard = false;

// Cached filtered planets for focused sun mode (avoids array allocation every frame)
let cachedFilteredPlanets: Planet[] = [];
let cachedFocusedSunId: string | null = null;
let cachedPlanetsLength = 0;

// NOTE: Hover delays are now managed by sunHoverManager and planetHoverManager

/**
 * Reset animate module caches - call on component unmount to prevent stale state
 */
export function resetAnimateModuleCaches(): void {
  cachedDefaultMousePosition = null;
  lastElementCheckFrame = 0;
  cachedIsOverContentCard = false;
  cachedFilteredPlanets = [];
  cachedFocusedSunId = null;
  cachedPlanetsLength = 0;
}

export const animate = (
  timestamp: number,
  props: AnimationProps,
  refs: AnimationRefs,
): void => {
  try {
    // Update frame cache at the start of each frame
    updateFrameCache();

    if (props.debugSettings?.verboseLogs) {
      logger.debug(
        "frame:",
        timestamp,
        "stars:",
        props.starsRef?.current.length ?? 0,
      );
    }

    // If we"re in the middle of a restart, skip this frame
    if (refs.isRestartingRef.current) {
      logger.debug("Skipping animation frame during restart");
      refs.animationRef.current = window.requestAnimationFrame(
        (nextTimestamp) => animate(nextTimestamp, props, refs),
      );
      return;
    }

    // Update last frame time for watchdog (use cached frame time)
    const currentFrameTime = getFrameTime();
    refs.lastFrameTimeRef.current = currentFrameTime;

    // Add a safety check for starsRef at the beginning of each frame
    if (!props.starsRef) {
      logger.error("Animation frame error: starsRef is undefined");
      if (refs.isAnimatingRef.current) {
        refs.animationRef.current = window.requestAnimationFrame(
          (nextTimestamp) => animate(nextTimestamp, props, refs),
        );
      }
      return;
    }

    const canvas = props.canvasRef.current;
    if (!canvas) {
      logger.error("Animation frame error: canvas is null");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      logger.error("Animation frame error: context is null");
      return;
    }

    // Frame rate limiter - if delta time is too large, it might indicate the tab was inactive
    if (!refs.lastTimeRef.current) refs.lastTimeRef.current = timestamp;

    // Calculate delta time with safety cap
    let deltaTime = timestamp - refs.lastTimeRef.current;

    // If deltaTime is extremely large (tab was inactive or browser paused),
    // cap it to prevent physics explosions
    if (deltaTime > 200) {
      logger.debug(
        `Large delta time detected: ${deltaTime}ms, capping to 16ms`,
      );
      deltaTime = 16;
    }

    refs.lastTimeRef.current = timestamp;

    // Performance optimization: Draw connections every 2 frames for smoother appearance
    // Previously every 8 frames caused visible flickering on star connections
    refs.frameSkipRef.current = (refs.frameSkipRef.current + 1) % 2;
    const shouldSkipHeavyOperations = refs.frameSkipRef.current !== 0;

    // Increment frame counter
    if (props.frameCountRef) props.frameCountRef.current++;

    // Clear canvas with full dimensions
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Start frame-level profiling
    startTiming("frame");

    // Get current stars from ref - use direct reference to avoid copying array every frame
    // This significantly reduces GC pressure at 60fps
    const currentStars: Star[] = props.starsRef?.current ?? [];

    // Check if stars exist and are not empty
    if (currentStars.length === 0) {
      logger.error("No stars to draw! Will retry on next frame.");

      // Try to ensure stars exist before the next frame
      if (props.ensureStarsExist) {
        logger.debug("Calling ensureStarsExist from animation loop");
        props.ensureStarsExist();
      }

      // Continue animation loop but don"t try to draw anything
      if (refs.isAnimatingRef.current || refs.isRestartingRef.current) {
        refs.animationRef.current = window.requestAnimationFrame(
          (nextTimestamp) => animate(nextTimestamp, props, refs),
        );
      }
      return;
    }

    // Apply camera transformation to show the camera's view
    // This creates a smooth zoom and pan effect centered on the camera target
    // Use cameraRef for synchronous access (avoids stale state issues)
    // Fall back to props.camera for backward compatibility
    const cameraValues = props.cameraRef?.current ?? props.camera;
    if (cameraValues) {
      ctx.save();
      // Calculate the center point to zoom towards (in canvas coordinates)
      const cameraCenterX = cameraValues.cx * canvas.width;
      const cameraCenterY = cameraValues.cy * canvas.height;

      // The focused-sun framing shifts the view right by half the sidebar so the
      // target lands in the centre of the *visible* area (right of the sidebar),
      // matching the Zoom Out button at left: calc(50% + sidebarWidth/2) (#212).
      // That offset must FADE OUT as the camera returns to the full view: the
      // zoom-out target is zoom=1, and the old `zoom !== 1` guard applied the full
      // shift right up to zoom=1 and then dropped it on the settle frame — snapping
      // the whole field left by sidebarWidth/2. Ramp the offset from 0 at zoom=1 to
      // full by minSunFocusZoom, so every focused state keeps #212's centring while
      // zoom-out settles smoothly. At zoom=1 / cx=cy=0.5 the transform is identity,
      // so the default view is pixel-unchanged.
      const sidebarShift = (props.sidebarWidth ?? 0) / 2;
      const offsetFactor = Math.min(
        1,
        Math.max(
          0,
          (cameraValues.zoom - 1) / (CAMERA_CONFIG.minSunFocusZoom - 1),
        ),
      );
      const viewportCenterX = canvas.width / 2 + sidebarShift * offsetFactor;
      const viewportCenterY = canvas.height / 2;

      // Apply transformation to center the camera target in the visible viewport
      // 1. Translate to center of visible content area (accounting for sidebar)
      // 2. Scale around origin (zoom)
      // 3. Translate so camera target becomes the origin
      ctx.translate(viewportCenterX, viewportCenterY);
      ctx.scale(cameraValues.zoom, cameraValues.zoom);
      ctx.translate(-cameraCenterX, -cameraCenterY);
    }

    // Draw background stars with reduced opacity when focused on a sun
    // This makes the focused area more prominent
    startTiming("drawStars");
    if (props.focusedSunId) {
      ctx.save();
      ctx.globalAlpha = STAR_RENDERING_CONFIG.focusedBackgroundAlpha;
      drawStars(ctx, currentStars);
      ctx.restore();
    } else {
      // Always draw stars first - this ensures they always appear
      drawStars(ctx, currentStars);
    }
    endTiming("drawStars");

    // Draw star birthplace indicators at the edges where stars respawn
    // Hide these when focused on a sun for cleaner view
    if (!props.focusedSunId) {
      drawStarBirthplaces(ctx, canvas.width, canvas.height);
    }

    // Get planets for sun size calculation - use direct reference to avoid GC pressure
    const currentPlanets: Planet[] = props.planetsRef?.current ?? [];

    // Get mouse position and camera for hover calculations
    const earlyMousePos = refs.mousePositionRef.current;
    const earlyCamera = props.cameraRef?.current as Camera | undefined;

    // Use centralized hover manager to compute LIVE hover state for rendering
    // The manager handles both immediate rendering state AND delayed tooltip state
    let liveHoveredSunId: string | null = null;
    const hoverManager = refs.sunHoverManagerRef?.current;

    if (hoverManager && props.enableMouseInteraction && props.setHoveredSunId && props.setHoveredSun) {
      // CRITICAL: Check sun hover detection BEFORE processing hover manager
      // This allows us to clear planet tooltip immediately if mouse is over a sun
      const earlySunHoverCheck = checkSunHover(
        earlyMousePos?.x ?? 0,
        earlyMousePos?.y ?? 0,
        canvas.width,
        canvas.height,
        earlyCamera,
      );

      // When hovering a sun, immediately clear planet tooltip ref AND state
      // This MUST happen BEFORE processFrame to prevent race condition where
      // isPlanetTooltipShowing blocks the sun tooltip from appearing
      const shouldClearPlanetTooltip = earlySunHoverCheck !== null && refs.hoverInfoRef.current?.show;
      if (shouldClearPlanetTooltip) {
        // Clear ref immediately (synchronous)
        refs.hoverInfoRef.current = { project: null, x: 0, y: 0, show: false };
        // Also clear React state (will propagate next frame)
        props.setHoverInfo({ project: null, x: 0, y: 0, show: false });
      }

      // Process hover state through the centralized manager
      // This returns the LIVE hover ID for rendering (immediate)
      // It also manages tooltip state internally (with delay for interactivity)
      liveHoveredSunId = hoverManager.processFrame({
        mouseX: earlyMousePos?.x ?? 0,
        mouseY: earlyMousePos?.y ?? 0,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        camera: earlyCamera,
        isMouseOnScreen: earlyMousePos?.isOnScreen ?? false,
        isOverContentCard: cachedIsOverContentCard,
        isPlanetTooltipShowing: refs.hoverInfoRef.current?.show ?? false,
        tooltipElement: props.sunTooltipElementRef?.current ?? null,
        currentTooltipSunId: props.hoveredSunIdRef?.current ?? null,
        isMouseOverTooltipRef: props.isMouseOverSunTooltipRef?.current ?? false,
        callbacks: {
          setHoveredSunId: props.setHoveredSunId,
          setHoveredSun: props.setHoveredSun,
        },
        frameTime: currentFrameTime,
      });
    }

    // Draw suns (focus area orbital centers) - always visible
    // Pass LIVE hovered sun id (computed by hover manager), not stale React state
    startTiming("drawSuns");
    drawSuns(
      ctx,
      canvas.width,
      canvas.height,
      timestamp,
      props.isDarkMode,
      liveHoveredSunId,
      deltaTime,
      props.focusedSunId,
      currentPlanets,
    );
    endTiming("drawSuns");

    // Get current values from refs - use direct reference to avoid GC pressure
    const currentBlackHoles: BlackHole[] = props.blackHolesRef?.current ?? [];

    // Use refs directly to avoid object allocation every frame
    // Create cached default only once (lazily initialized)
    if (!cachedDefaultMousePosition) {
      cachedDefaultMousePosition = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        lastX: canvas.width / 2,
        lastY: canvas.height / 2,
        speedX: 0,
        speedY: 0,
        isClicked: false,
        clickTime: 0,
        isOnScreen: true,
      };
    }
    const currentMousePosition: MousePosition =
      refs.mousePositionRef.current ?? cachedDefaultMousePosition;

    // Use refs directly - these are read-only in animation loop
    const currentHoverInfo: HoverInfo = refs.hoverInfoRef.current;
    const currentGameState: GameState = refs.gameStateRef.current;

    // Get cosmic navigation state and camera - use cameraRef for synchronous access
    const currentCamera: Camera | undefined = props.cameraRef?.current as
      | Camera
      | undefined;
    const currentNavigationState: CosmicNavigationState | undefined =
      props.navigationState;
    const currentHoveredObjectId: string | null = props.hoveredObjectId || null;

    // NEW: Apply camera lerp if camera is available
    if (
      props.enableCosmicNavigation &&
      currentCamera?.target && // ← must have a target to lerp to
      props.setCamera
    ) {
      const updatedCamera = lerpCamera(currentCamera, 0.08);
      if (updatedCamera !== currentCamera) {
        props.setCamera(updatedCamera);
      }
    }

    // Check if mouse is actually over the canvas vs over a content card
    // Throttle this expensive DOM operation to every N frames
    const currentFrameCount = props.frameCountRef?.current ?? 0;
    let isOverContentCard = cachedIsOverContentCard;

    if (
      currentFrameCount - lastElementCheckFrame >=
      ANIMATION_TIMING_CONFIG.elementFromPointCheckInterval
    ) {
      lastElementCheckFrame = currentFrameCount;
      isOverContentCard = false;

      if (typeof document !== "undefined" && currentMousePosition.isOnScreen) {
        const elementAtMouse = document.elementFromPoint(
          currentMousePosition.x,
          currentMousePosition.y,
        );
        if (elementAtMouse) {
          // Check if the element is the canvas or inside the starfield container
          const isCanvas = elementAtMouse.tagName === "CANVAS";
          const isInsideStarfield =
            elementAtMouse.closest("[data-starfield]") !== null;
          // Check if the element is inside the hero section (which should allow tooltips)
          const isInsideHeroSection =
            elementAtMouse.closest("section[aria-label=\"hero section\"]") !==
            null;
          // Check if hovering over header/navigation (should allow tooltips since they're transparent)
          const isInsideHeader = elementAtMouse.closest("header") !== null;
          // Check if hovering over sidebar (should allow tooltips)
          const isInsideSidebar =
            elementAtMouse.closest("aside, [role=\"complementary\"]") !== null;
          // Check if element has explicit passthrough data attribute
          const hasPassthrough =
            elementAtMouse.closest("[data-starfield-passthrough=\"true\"]") !==
            null;

          // Only consider it as "over content card" if it's NOT any of the allowed elements
          isOverContentCard =
            !isCanvas &&
            !isInsideStarfield &&
            !isInsideHeroSection &&
            !isInsideHeader &&
            !isInsideSidebar &&
            !hasPassthrough;
        }
      }
      cachedIsOverContentCard = isOverContentCard;
    }

    // Planet hover state managed by planetHoverManager
    if (props.enablePlanets && props.enableMouseInteraction) {
      const planetHoverManager = refs.planetHoverManagerRef?.current;
      if (planetHoverManager) {
        const isHoveringPlanet = planetHoverManager.processFrame({
          mouseX: currentMousePosition.x,
          mouseY: currentMousePosition.y,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          camera: currentCamera,
          planets: currentPlanets,
          planetSize: props.planetSize,
          isMouseOnScreen: currentMousePosition.isOnScreen,
          isOverContentCard,
          currentHoverInfo,
          tooltipElement: props.projectTooltipElementRef?.current ?? null,
          isMouseOverTooltipRef: props.isMouseOverProjectTooltipRef?.current ?? false,
          callbacks: {
            setHoverInfo: props.setHoverInfo,
          },
          frameTime: currentFrameTime,
        });

        // When hovering a planet, immediately clear sun tooltip to avoid stale tooltips
        if (isHoveringPlanet && props.hoveredSunIdRef?.current !== null && props.setHoveredSunId && props.setHoveredSun) {
          props.setHoveredSunId(null);
          props.setHoveredSun(null);
        }
      }
    }

    // NOTE: Sun hover state is now managed by sunHoverManager (called earlier in this function)
    // The hover manager handles:
    // - Immediate rendering state (for hover ring)
    // - Delayed tooltip state (for interactivity)
    // See the processFrame() call near the drawSuns() section

    // Draw connections between stars (network effect) - only if not skipping heavy operations
    if (!shouldSkipHeavyOperations) {
      startTiming("drawConnections");
      drawConnections(
        ctx,
        currentStars,
        props.lineConnectionDistance,
        props.lineOpacity,
        props.colorScheme,
      );
      endTiming("drawConnections");
    }

    // Update star positions with proper null handling for centerPosition
    startTiming("updateStarPositions");
    updateStarPositions(
      currentStars,
      canvas.width,
      canvas.height,
      deltaTime,
      props.enableFlowEffect,
      props.flowStrength,
      currentMousePosition,
      props.enableMouseInteraction,
      currentBlackHoles,
      props.gravitationalPull,
      props.heroMode,
      props.centerPosition || { x: canvas.width / 2, y: canvas.height / 2 }, // Provide default if undefined
      props.mouseEffectRadius,
      props.maxVelocity,
      props.animationSpeed,
    );
    endTiming("updateStarPositions");

    // Note: handleBoundaries removed - updateStarPositions already handles wrapping
    // Adding it here caused double-wrapping and potential oscillation at edges

    // Draw black holes if enabled (hide when focused on a sun for cleaner view)
    if (props.enableBlackHole && !props.focusedSunId) {
      currentBlackHoles.forEach((blackHole: BlackHole) => {
        drawBlackHole(ctx, blackHole, deltaTime, props.particleSpeed * 0.01);
      });
    }

    // Draw portfolio comets/planets
    // Filter planets if a sun is focused (show only planets orbiting that sun)
    // Use cached filtered array to avoid allocation every frame
    let planetsToRender: Planet[];
    if (props.focusedSunId) {
      // Only recalculate if focusedSunId changed or planets array changed
      if (
        cachedFocusedSunId !== props.focusedSunId ||
        cachedPlanetsLength !== currentPlanets.length
      ) {
        cachedFilteredPlanets = currentPlanets.filter(
          (planet) => planet.orbitParentId === props.focusedSunId,
        );
        cachedFocusedSunId = props.focusedSunId;
        cachedPlanetsLength = currentPlanets.length;
      }
      planetsToRender = cachedFilteredPlanets;
    } else {
      // Clear cache when not focused
      if (cachedFocusedSunId !== null) {
        cachedFocusedSunId = null;
        cachedFilteredPlanets = [];
      }
      planetsToRender = currentPlanets;
    }

    startTiming("updatePlanets");
    updatePlanets(
      ctx,
      planetsToRender,
      deltaTime,
      props.planetSize,
      props.employeeDisplayStyle,
      currentCamera, // Pass the camera (may be undefined if cosmic navigation is disabled)
    );
    endTiming("updatePlanets");

    // Draw mouse effects
    drawMouseEffects(ctx, currentMousePosition, props, deltaTime);

    // Draw cosmic navigation if enabled
    if (props.enableCosmicNavigation && props.navigationState && props.camera) {
      drawCosmicNavigation(
        ctx,
        canvas.width,
        canvas.height,
        props.navigationState,
        props.camera,
        timestamp,
        props.hoveredObjectId || null,
        props.isDarkMode,
      );
    }

    // NEW: Draw cosmic objects if navigation is enabled
    if (
      props.enableCosmicNavigation &&
      currentCamera?.target && // ← must have a target to lerp to
      currentNavigationState
    ) {
      // Draw cosmic objects at 30fps for performance
      if (props.frameCountRef && props.frameCountRef.current % 2 === 0) {
        renderCosmicHierarchy(
          ctx,
          canvas.width,
          canvas.height,
          currentNavigationState,
          currentCamera,
          timestamp * (props.animationSpeed || 1),
          currentHoveredObjectId,
          props.starSize || 1,
          props.isDarkMode || true,
        );

        // Debug logging removed for performance
      }
    }

    // Process particles and effects
    processParticleEffects(
      ctx,
      timestamp,
      deltaTime,
      props,
      refs,
      currentStars,
      currentPlanets,
      currentGameState,
      shouldSkipHeavyOperations,
    );

    // Draw debug information if debug mode is enabled
    if (props.debugMode && !shouldSkipHeavyOperations) {
      // Calculate FPS for debug info - throttle to every 10 frames
      const frameCount = props.frameCountRef?.current ?? 0;
      if (frameCount % 10 === 0) {
        const fps = deltaTime > 0 ? 1000 / deltaTime : 0;

        // Make sure fpsValues exists
        if (!refs.fpsValues || !refs.fpsValues.current) {
          refs.fpsValues = { current: [] };
        }

        refs.fpsValues.current.push(fps);
        if (refs.fpsValues.current.length > 60) {
          refs.fpsValues.current.shift();
        }

        // Calculate average FPS over the last 60 frames
        const avgFps =
          refs.fpsValues.current.reduce((sum, val) => sum + val, 0) /
          refs.fpsValues.current.length;

        // Call the update function if provided
        if (props.updateFpsData) {
          props.updateFpsData(avgFps, timestamp);
        }
      }

      // Draw velocity vectors for stars (sample of stars to improve performance)
      // Use direct iteration with step instead of filter to avoid array allocation
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;
      for (let si = 0; si < currentStars.length; si += 20) {
        const star = currentStars[si];
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x + star.vx * 10, star.y + star.vy * 10);
        ctx.stroke();
      }

      // Draw mouse effect radius with a more visible outline
      if (currentMousePosition.isOnScreen) {
        ctx.beginPath();
        ctx.arc(
          currentMousePosition.x,
          currentMousePosition.y,
          props.mouseEffectRadius,
          0,
          TWO_PI,
        );
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // NEW: Draw camera info if cosmic navigation is enabled
      if (props.enableCosmicNavigation && currentCamera) {
        ctx.font = "12px Arial";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText(
          `Camera: x=${currentCamera.cx.toFixed(2)}, y=${currentCamera.cy.toFixed(2)}, zoom=${currentCamera.zoom.toFixed(2)}`,
          10,
          canvas.height - 60,
        );
        ctx.fillText(
          `Navigation: ${currentNavigationState?.currentLevel || "universe"}`,
          10,
          canvas.height - 40,
        );
      }
    }

    updateStarActivity(currentStars);

    // Restore canvas context if camera transformation was applied.
    // Must match the save condition above (any truthy camera → transform applied).
    const cameraForRestore = props.cameraRef?.current ?? props.camera;
    if (cameraForRestore) {
      ctx.restore();
    }

    // End frame-level profiling
    endTiming("frame");
    endFrame();

    // Update star positions in the ref - consolidate this to one place
    if (
      props.starsRef &&
      props.starsRef.current &&
      props.starsRef.current.length > 0
    ) {
      try {
        // Only update positions, don"t replace the entire array
        // Use a safer approach with bounds checking
        const minLength = Math.min(
          currentStars.length,
          props.starsRef.current.length,
        );
        for (let i = 0; i < minLength; i++) {
          props.starsRef.current[i].x = currentStars[i].x;
          props.starsRef.current[i].y = currentStars[i].y;
          props.starsRef.current[i].vx = currentStars[i].vx;
          props.starsRef.current[i].vy = currentStars[i].vy;
        }
      } catch (err) {
        logger.error("Error updating star positions:", err);
      }
    }

    // Continue the animation loop if still animating or restarting
    if (refs.isAnimatingRef.current || refs.isRestartingRef.current) {
      refs.animationRef.current = window.requestAnimationFrame(
        (nextTimestamp) => animate(nextTimestamp, props, refs),
      );
    } else {
      logger.debug(
        "Animation stopped because isAnimatingRef.current is false and not restarting",
      );
    }
  } catch (error) {
    logger.error("Error in animation loop:", error);

    // Log detailed error info
    logger.error("Animation state:", {
      isAnimating: refs.isAnimatingRef.current,
      isRestarting: refs.isRestartingRef.current,
      starsCount: props.starsRef?.current?.length || 0,
      canvasExists: !!props.canvasRef.current,
      timestamp,
    });

    // Try to recover by continuing the animation
    if (refs.isAnimatingRef.current || refs.isRestartingRef.current) {
      logger.debug("Attempting to recover from animation error");
      setTimeout(() => {
        refs.animationRef.current = window.requestAnimationFrame(
          (nextTimestamp) => animate(nextTimestamp, props, refs),
        );
      }, 100);
    }
  }
};

// Re-export functions from sunRendering for backward compatibility
export {
  resetAnimationModuleState,
  getFocusAreaSuns,
  checkSunHover,
  getCurrentSunPositions,
};

// Note: resetAnimateModuleCaches is also exported (defined above)
