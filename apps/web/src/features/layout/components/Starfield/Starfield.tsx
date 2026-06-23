import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import styles from "./starfield.module.css";
import { logger } from "@/utils/logger";
import {
  GameState,
  InteractiveStarfieldProps,
  MousePosition,
  DebugSettings,
} from "./types";
// Camera type is used internally by useCameraAnimation hook
import { ProjectTooltip } from "./projectTooltip";
import {
  fetchIpAddress,
  getHighScoresForIP,
  initGameState,
  saveScore,
} from "./gameState";
import ScoreOverlay from "./scoreOverlay";
import { useAnimationLoop } from "./hooks/useAnimationLoop";
import { useMouseInteraction } from "./hooks/useMouseInteraction";
import { useParticleEffects } from "./hooks/useParticleEffects";
import { useDebugControls } from "./hooks/useDebugControls";
import { useTooltipRefs } from "./hooks/useTooltipRefs";
import { useCanvasClick } from "./hooks/useCanvasClick";
import { usePerformanceTier } from "./hooks/usePerformanceTier";
import { useProjectHoverState } from "./hooks/useProjectHoverState";
import { useCameraAnimation } from "./hooks/useCameraAnimation";
import { useStarfieldAPI } from "./hooks/useStarfieldAPI";
import DebugControlsOverlay from "./DebugControlsOverlay";
import PerformanceDebugPanel from "./PerformanceDebugPanel";
import { useStarInitialization } from "./hooks/useStarInitialization";
import { resetConnectionStagger } from "./stars";
// applyClickForce, createClickExplosion moved to useStarfieldAPI hook
import {
  resetAnimationModuleState,
  resetAnimateModuleCaches,
} from "./hooks/animation/animate";
import { getSunStates, resetSunSystem } from "./sunSystem";
import SunTooltip from "./sunTooltip";
// CAMERA_CONFIG is used internally by useCameraAnimation hook

// Define the ref type
export type StarfieldRef = {
  updateDebugSetting: <K extends keyof DebugSettings>(
    _key: K,
    _value: DebugSettings[K],
  ) => void;
};

// PerformanceTier type is imported from usePerformanceTier hook

// Convert to forwardRef
const InteractiveStarfield = forwardRef<
  StarfieldRef,
  InteractiveStarfieldProps
>(
  (
    {
      enableFlowEffect = false,
      enableBlackHole = true,
      enableMouseInteraction = true,
      enableEmployeeStars = true,
      starDensity = 1.0,
      colorScheme = "white",
      starSize = 1.0,
      sidebarWidth = 0,
      centerOffsetX = 0,
      centerOffsetY = 0,
      flowStrength = 0.01,
      gravitationalPull = 0.05,
      particleSpeed = 0.00001,
      employeeStarSize = 0.7,
      employeeDisplayStyle = "avatar",
      blackHoleSize = 1.0,
      heroMode = false,
      containerRef = null,
      lineConnectionDistance = 150,
      lineOpacity = 0.3,
      mouseEffectRadius = 150,
      mouseEffectColor = "rgba(255, 255, 255, 0.1)",
      initialMousePosition = null,
      isDarkMode = false,
      gameMode = false,
      debugMode = false,
      maxVelocity = 0.5,
      animationSpeed = 1.0,
      drawDebugInfo: externalDrawDebugInfo,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dimensionsRef = useRef({ width: 0, height: 0 });
    const containerBoundsRef = useRef({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: 0,
      height: 0,
    });
    const centerPositionRef = useRef({ x: 0, y: 0 });
    const frameCountRef = useRef(0);
    const hasRunInitialSetupRef = useRef(false);
    const cancelAnimationRef = useRef<() => void>(() => {});
    const animationControllerRef = useRef<{
      cancelAnimation: () => void;
      restartAnimation: () => void;
    }>({
      cancelAnimation: () => {},
      restartAnimation: () => {},
    });

    // Performance tier management (adaptive FPS-based quality)
    const {
      performanceTier,
      currentFps,
      timestamp,
      isStarfieldReady,
      showPerformancePanel,
      setShowPerformancePanel,
      updateFpsData,
      fpsValuesRef,
    } = usePerformanceTier();

    // Project and sun hover state management
    const {
      hoverInfo,
      setHoverInfo,
      pinnedProjects,
      handlePinProject,
      handleUnpinProject,
      handleUnpinAll,
      hoveredSun,
      setHoveredSun,
      hoveredSunId,
      setHoveredSunId,
      focusedSunId,
      setFocusedSunId,
    } = useProjectHoverState();

    // Centralized tooltip ref management (prevents stuck refs when tooltips unmount)
    const tooltipRefs = useTooltipRefs({
      hoveredSunId,
      hoverInfo,
      setHoverInfo,
    });

    // Game state
    const [gameState, setGameState] = useState<GameState>(initGameState());
    const prevModeRef = useRef<boolean>(false);

    // Use debug controls hook
    const { debugSettings, updateDebugSetting, drawDebugInfo } =
      useDebugControls({
        initialDebugMode: debugMode,
        initialAnimationSpeed: animationSpeed,
        initialMaxVelocity: maxVelocity,
        initialFlowStrength: flowStrength * 5,
        initialGravitationalPull: gravitationalPull,
        initialParticleSpeed: particleSpeed,
        initialStarSize: starSize,
        initialEmployeeOrbitSpeed: 0.01,
        initialMouseEffectRadius: mouseEffectRadius,
        initialLineConnectionDistance: lineConnectionDistance,
        initialLineOpacity: lineOpacity,
        sidebarWidth: sidebarWidth,
      });

    // Expose updateDebugSetting to parent components through ref
    useImperativeHandle(
      ref,
      (): StarfieldRef => ({
        updateDebugSetting: (key, value): void => {
          updateDebugSetting(key, value);
        },
      }),
      [updateDebugSetting],
    );

    const {
      clickBursts,
      setClickBursts,
      clickBurstsRef,
      collisionEffects,
      setCollisionEffects,
      createCollisionEffect,
    } = useParticleEffects();

    // Use the star initialization hook
    const {
      stars,
      starsRef,
      // blackHoles and employeeStars values not used, only refs needed
      blackHolesRef,
      employeeStarsRef,
      initializeElements,
      ensureStarsExist,
      resetStars,
      isStarsInitializedRef,
    } = useStarInitialization({
      canvasRef,
      dimensionsRef,
      starDensity: performanceTier === "low" ? starDensity * 0.5 : starDensity, // Reduce density on low tier
      sidebarWidth,
      centerOffsetX,
      centerOffsetY,
      starSize,
      colorScheme,
      enableBlackHole,
      blackHoleSize,
      particleSpeed,
      enableEmployeeStars,
      employeeStarSize,
      debugSettings,
      cancelAnimation: () => cancelAnimationRef.current(),
    });

    // Camera zoom animation management
    const {
      camera: internalCamera,
      setCamera: setInternalCamera,
      cameraStateRef,
      cameraAnimationRef,
      zoomToSun,
    } = useCameraAnimation({
      focusedSunId,
      setFocusedSunId,
      employeeStarsRef,
      dimensionsRef,
    });

    // Reset sun hover state when zoom state changes (both zoom in and zoom out)
    // This prevents the sun tooltip from staying visible during camera transitions
    const prevFocusedSunIdRef = useRef<string | null>(focusedSunId);
    useEffect(() => {
      // Clear hover on any zoom transition (in or out)
      if (prevFocusedSunIdRef.current !== focusedSunId) {
        setHoveredSunId(null);
        setHoveredSun(null);
      }
      prevFocusedSunIdRef.current = focusedSunId;
    }, [focusedSunId, setHoveredSunId, setHoveredSun]);

    const mousePositionRef = useRef<MousePosition>({
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      speedX: 0,
      speedY: 0,
      isClicked: false,
      clickTime: 0,
      isOnScreen: false, // Start false - only true after real mouse interaction
    });

    // Get mouse interaction hooks
    // Pass mousePositionRef for synchronous updates on touch/mouse leave events
    // This prevents the "stuck hover" bug where animation frames run before
    // the async React state/useEffect flow propagates isOnScreen: false
    const { mousePosition, setMousePosition, handleMouseEvents } =
      useMouseInteraction(
        enableMouseInteraction,
        mouseEffectRadius,
        stars,
        gameMode,
        gameState,
        setGameState,
        mousePositionRef, // Pass ref for synchronous updates
      );

    useEffect(() => {
      // Update the ref with the latest state
      mousePositionRef.current = mousePosition;
    }, [mousePosition]);

    // Create a custom debug draw function that uses either the external or internal debug function
    const customDrawDebugInfo = useCallback(
      (ctx: CanvasRenderingContext2D): void => {
        if (externalDrawDebugInfo) {
          externalDrawDebugInfo(
            ctx,
            dimensionsRef.current.width,
            dimensionsRef.current.height,
            mousePosition,
            starsRef.current,
            debugSettings.mouseEffectRadius,
          );
        } else {
          // Use the default debug info function if none is provided
          drawDebugInfo(
            ctx,
            dimensionsRef.current.width,
            dimensionsRef.current.height,
            mousePosition,
            starsRef.current,
            debugSettings.mouseEffectRadius,
          );
        }
      },
      [
        drawDebugInfo,
        externalDrawDebugInfo,
        mousePosition,
        debugSettings.mouseEffectRadius,
        starsRef,
      ],
    );

    // Global starfield API for external interactions (testing, debugging)
    useStarfieldAPI({ starsRef, canvasRef });

    // Initialize elements on mount - intentionally runs once
    useEffect(() => {
      const initTimeout = setTimeout((): void => {
        if (!isStarsInitializedRef.current || starsRef.current.length === 0) {
          initializeElements();

          // Force animation restart after initialization
          setTimeout((): void => {
            if (animationControllerRef.current) {
              animationControllerRef.current.restartAnimation();
            }
          }, 200);
        }
      }, 100);

      return (): void => clearTimeout(initTimeout);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Detect debug mode changes
    useEffect(() => {
      const lastDebugMode = debugSettings.isDebugMode;

      // When debug mode changes, ensure stars are reset properly
      return (): void => {
        if (lastDebugMode !== debugSettings.isDebugMode) {
          setTimeout((): void => {
            resetStars();
          }, 50);
        }
      };
    }, [debugSettings.isDebugMode, resetStars]);

    // Fetch IP address on component mount for game mode
    useEffect(() => {
      if (gameMode) {
        const getIP = async (): Promise<void> => {
          const ip = await fetchIpAddress();
          if (ip) {
            setGameState((prev) => ({
              ...prev,
              ipAddress: ip,
              highScores: getHighScoresForIP(ip),
            }));
          }
        };
        void getIP(); // Actually invoke the async function
      }
    }, [gameMode]);

    // NOTE: Global click handler for unpinning on background click was removed
    // (dead code - was commented out). If needed, add to useProjectHoverState hook.

    // Set up canvas and handle resize
    useEffect(() => {
      if (hasRunInitialSetupRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      // Handle resize without triggering state updates in a loop
      const handleResize = (): void => {
        const { innerWidth: width, innerHeight: height } = window;

        // Set canvas dimensions directly
        canvas.width = width;
        canvas.height = height;

        // Update refs directly
        dimensionsRef.current = { width, height };

        // Update container bounds if in hero mode
        if (heroMode && containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          containerBoundsRef.current = {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
          centerPositionRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }

        // Call initialize directly
        setTimeout((): void => {
          initializeElements();
        }, 50);
      };

      // Initial setup
      handleResize();

      // Add resize event listener
      window.addEventListener("resize", handleResize);

      // Add mouse event listeners
      if (enableMouseInteraction) {
        handleMouseEvents.setup();
      }

      // Mark initial setup as complete
      hasRunInitialSetupRef.current = true;

      // Cleanup
      return (): void => {
        window.removeEventListener("resize", handleResize);

        if (enableMouseInteraction) {
          handleMouseEvents.cleanup();
        }

        // Save score when component unmounts
        if (gameMode && gameState.score > 0 && gameState.ipAddress) {
          saveScore(gameState);
        }
      };
    }, [
      enableMouseInteraction,
      heroMode,
      containerRef,
      gameMode,
      gameState,
      handleMouseEvents,
      initializeElements,
    ]);

    useEffect(() => {
      const currentMode = isDarkMode;

      // Only run this effect if the mode has actually changed
      if (currentMode !== prevModeRef.current) {
        prevModeRef.current = currentMode;

        // First stop the current animation
        cancelAnimationRef.current();

        // Force a complete reset of stars
        resetStars();

        // Recalculate canvas dimensions to fix coordinate offset issues
        const canvas = canvasRef.current;
        if (canvas) {
          const { innerWidth: width, innerHeight: height } = window;
          canvas.width = width;
          canvas.height = height;
          dimensionsRef.current = { width, height };

          // Update container bounds if in hero mode
          if (heroMode && containerRef?.current) {
            const rect = containerRef.current.getBoundingClientRect();
            containerBoundsRef.current = {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
            };
            centerPositionRef.current = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
          }
        }

        // Reset animation error count and ensure stars exist
        if (ensureStarsExist) {
          ensureStarsExist();
        }

        // Then restart with a delay to ensure everything is ready
        const restartTimeout = setTimeout((): void => {
          // Use the stored animation controller to restart
          if (animationControllerRef.current) {
            animationControllerRef.current.restartAnimation();
          }
        }, 300);

        return (): void => {
          clearTimeout(restartTimeout);
        };
      }
    }, [isDarkMode, resetStars, ensureStarsExist, heroMode, containerRef]);

    // Apply initial mouse position if provided
    useEffect(() => {
      if (initialMousePosition && initialMousePosition.isActive) {
        setMousePosition((prev) => ({
          ...prev,
          x: initialMousePosition.x,
          y: initialMousePosition.y,
          lastX: initialMousePosition.x,
          lastY: initialMousePosition.y,
          isOnScreen: true,
        }));
      }
    }, [initialMousePosition, setMousePosition]);

    // REDUNDANT MOUSE LISTENERS REMOVED HERE
    // Relies on useMouseInteraction (lines 515)

    // Refs for frequently-changing values to avoid useMemo recalculation every frame
    // These are updated via useEffect and accessed in animation loop via refs
    const hoverInfoRef = useRef(hoverInfo);
    const gameStateRef = useRef(gameState);
    const clickBurstsRefLocal = useRef(clickBursts);
    const collisionEffectsRef = useRef(collisionEffects);
    const hoveredSunIdRef = useRef(hoveredSunId);
    const focusedSunIdRef = useRef(focusedSunId);

    // Keep refs in sync with state (but don't trigger useMemo recalculation)
    useEffect(() => {
      hoverInfoRef.current = hoverInfo;
    }, [hoverInfo]);
    useEffect(() => {
      gameStateRef.current = gameState;
    }, [gameState]);
    useEffect(() => {
      clickBurstsRefLocal.current = clickBursts;
    }, [clickBursts]);
    useEffect(() => {
      collisionEffectsRef.current = collisionEffects;
    }, [collisionEffects]);
    useEffect(() => {
      hoveredSunIdRef.current = hoveredSunId;
    }, [hoveredSunId]);
    useEffect(() => {
      focusedSunIdRef.current = focusedSunId;
    }, [focusedSunId]);

    // Memoize animation loop parameters to prevent unnecessary re-renders
    // PERFORMANCE: Only include STATIC dependencies that rarely change
    // Dynamic values (mousePosition, hoverInfo, gameState, etc.) are accessed via refs
    // to prevent useMemo recalculation 60x/sec
    const animationParams = useMemo(
      () => ({
        canvasRef,
        dimensions: dimensionsRef.current,
        stars: starsRef.current,
        blackHoles: blackHolesRef.current,
        mousePosition: mousePositionRef.current, // Initial snapshot for initialization
        mousePositionRef, // Pass ref itself for live updates in animation loop
        enableFlowEffect: performanceTier !== "low" && enableFlowEffect, // Disable heavy flow in low tier
        enableBlackHole,
        enableMouseInteraction,
        enablePlanets: enableEmployeeStars,
        flowStrength: debugSettings.flowStrength,
        gravitationalPull: debugSettings.gravitationalPull,
        particleSpeed: debugSettings.particleSpeed,
        planetSize: employeeStarSize,
        employeeDisplayStyle,
        heroMode,
        centerPosition: centerPositionRef.current,
        hoverInfo: hoverInfoRef.current, // Read from ref
        setHoverInfo,
        colorScheme,
        lineConnectionDistance: performanceTier === "low" ? 0 : debugSettings.lineConnectionDistance, // Disable connections in low tier
        lineOpacity: debugSettings.lineOpacity,
        mouseEffectRadius: debugSettings.mouseEffectRadius,
        mouseEffectColor,
        clickBursts: clickBurstsRefLocal.current, // Read from ref
        setClickBursts,
        clickBurstsRef,
        gameMode,
        gameState: gameStateRef.current, // Read from ref
        setGameState,
        collisionEffects: collisionEffectsRef.current, // Read from ref
        setCollisionEffects,
        createCollisionEffect,
        isDarkMode,
        frameCountRef,
        debugMode: debugSettings.isDebugMode,
        drawDebugInfo: customDrawDebugInfo,
        maxVelocity: debugSettings.maxVelocity,
        animationSpeed: debugSettings.animationSpeed,
        starSize: starSize,
        starsRef,
        blackHolesRef,
        planetsRef: employeeStarsRef,
        ensureStarsExist,
        updateFpsData,
        fpsValuesRef,
        hoveredSunIdRef, // Use ref for synchronous access in animation loop
        focusedSunId,
        focusedSunIdRef, // Live ref — loop reads this so focus-mode clears on zoom-out
        camera: internalCamera,
        setCamera: setInternalCamera,
        isMouseOverProjectTooltipRef: tooltipRefs.isMouseOverProjectTooltipRef,
        isMouseOverSunTooltipRef: tooltipRefs.isMouseOverSunTooltipRef,
        setHoveredSunId,
        setHoveredSun,
        cameraRef: cameraStateRef,
        sidebarWidth,
        sunTooltipElementRef: tooltipRefs.sunTooltipElementRef,
        projectTooltipElementRef: tooltipRefs.projectTooltipElementRef,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        // STATIC dependencies only - these rarely change
        enableFlowEffect,
        enableBlackHole,
        enableMouseInteraction,
        enableEmployeeStars,
        heroMode,
        gameMode,
        debugSettings.isDebugMode,
        debugSettings.maxVelocity,
        debugSettings.animationSpeed,
        debugSettings.flowStrength,
        debugSettings.gravitationalPull,
        debugSettings.mouseEffectRadius,
        debugSettings.lineConnectionDistance,
        debugSettings.lineOpacity,
        colorScheme,
        employeeStarSize,
        employeeDisplayStyle,
        mouseEffectColor,
        isDarkMode,
        starSize,
        // hoveredSunId removed - now uses ref for synchronous access
        focusedSunId,
        sidebarWidth,
        performanceTier, // Add performance tier as dep
      ],
    );

    // Use the animation loop with memoized parameters - ONLY CALL THIS ONCE
    const { cancelAnimation, restartAnimation } =
      useAnimationLoop(animationParams);

    // Update the refs with the animation controller functions
    useEffect(() => {
      animationControllerRef.current = {
        cancelAnimation,
        restartAnimation,
      };
      cancelAnimationRef.current = cancelAnimation;
    }, [cancelAnimation, restartAnimation]);

    // Clean up animation on unmount
    useEffect(() => {
      return (): void => {
        cancelAnimationRef.current();
      };
    }, []);

    // Clean up module-level state on unmount to prevent memory leaks
    useEffect(() => {
      return (): void => {
        // Reset all module-level states when component unmounts
        // This prevents stale state and memory leaks on remount
        resetSunSystem();
        resetAnimationModuleState();
        resetAnimateModuleCaches();
        resetConnectionStagger();

        // Clear any lingering animation frames
        // Note: tooltip timeout cleanup is handled by useTooltipRefs hook
        // Note: camera animation cleanup is handled by useCameraAnimation hook
        // Note: global API cleanup is handled by useStarfieldAPI hook
        if (cameraAnimationRef.current) {
          cancelAnimationFrame(cameraAnimationRef.current);
          cameraAnimationRef.current = null;
        }
      };
    }, []);

    // NOTE: Starfield initialization delay is now handled by usePerformanceTier hook
    // NOTE: _handleEmployeeOrbitSpeedChange removed - unused debug handler

    const applyStarfieldRepulsion = useCallback(
      (
        x: number,
        y: number,
        radius: number = 300,
        force: number = 100,
      ): number => {
        if (window.starfieldAPI) {
          // Log before calling the API

          // Call the API function
          const affectedStars = window.starfieldAPI.applyForce(
            x,
            y,
            radius,
            force,
          );

          // Log the result

          // Create an explosion effect
          window.starfieldAPI.createExplosion(x, y);

          return affectedStars;
        } else {
          logger.warn("[Starfield] starfieldAPI is not available");
          return 0;
        }
      },
      [],
    );

    // NOTE: zoomToSun and camera animation now handled by useCameraAnimation hook

    // Unified canvas click/touch handling via dedicated hook
    const { handleCanvasClick, handleTouchEnd } = useCanvasClick({
      canvasRef,
      planetsRef: employeeStarsRef,
      cameraRef: cameraStateRef,
      setMousePosition,
      onSunClick: zoomToSun,
      onPlanetClick: handlePinProject, // Auto-pin on mobile planet click
      applyStarfieldRepulsion,
    });

    return (
      <>
        {/* Background elements with positive z-index */}
        <div className={styles.starfieldWrapper} data-starfield>
          <div
            className={`${styles.starfieldBackground} ${isDarkMode ? "" : styles.light}`}
          ></div>
          <div
            className={`${styles.nebulaOverlay} ${isDarkMode ? "" : styles.light}`}
          ></div>
          <div
            className={`${styles.frontierAccent} ${isDarkMode ? "" : styles.light}`}
          ></div>
          <div
            className={`${styles.purpleAccent} ${isDarkMode ? "" : styles.light}`}
          ></div>

          {/* Canvas for interactive elements - fade in after initialization */}
          <canvas
            ref={canvasRef}
            className={`${styles.starfieldCanvas} ${isStarfieldReady ? styles.starfieldReady : styles.starfieldInitializing}`}
            aria-hidden="true"
            onClick={(e): void => {
              e.stopPropagation();
              handleCanvasClick(e);
            }}
            onTouchStart={(e): void => {
              e.stopPropagation();
            }}
            onTouchEnd={(e): void => {
              e.stopPropagation();
              handleTouchEnd(e);
            }}
        />
      </div>

      {/* Only render debug controls when debug mode is active */}
      {debugSettings.isDebugMode && (
        <DebugControlsOverlay
          debugSettings={debugSettings}
          updateDebugSetting={updateDebugSetting}
          resetStars={resetStars}
          sidebarWidth={sidebarWidth}
          stars={stars}
          mousePosition={mousePosition}
          fps={currentFps}
          timestamp={timestamp}
          setMousePosition={setMousePosition}
          isDarkMode={isDarkMode}
          onTogglePerformancePanel={() => setShowPerformancePanel(prev => !prev)}
          showPerformancePanel={showPerformancePanel}
        />
      )}

      {/* Performance Debug Panel */}
      {showPerformancePanel && (
        <PerformanceDebugPanel
          isVisible={true}
          onClose={() => setShowPerformancePanel(false)}
          sidebarWidth={sidebarWidth}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Pinned Projects Dock */}
      {pinnedProjects.length > 0 && (
        <div className={styles.pinnedDock} data-starfield-passthrough="true">
          {pinnedProjects.length > 1 && (
            <button
              className={styles.closeAllButton}
              onClick={handleUnpinAll}
            >
              Close All
            </button>
          )}
          {pinnedProjects.map((project) => (
            <ProjectTooltip
              key={project.id}
              project={project}
              x={0}
              y={0}
              isPinned={true}
              isDocked={true}
              isDarkMode={isDarkMode}
              onUnpin={() => handleUnpinProject(project.id)}
            />
          ))}
        </div>
      )}

      {/* Hover Tooltip - now allowed even if projects are pinned */}
      {hoverInfo.show && hoverInfo.project && (
        <ProjectTooltip
          ref={tooltipRefs.projectTooltipElementRef}
          project={hoverInfo.project}
          x={hoverInfo.x}
          y={hoverInfo.y}
          isDarkMode={isDarkMode}
          onPin={handlePinProject}
          onMouseEnter={tooltipRefs.handleProjectTooltipMouseEnter}
          onMouseLeave={tooltipRefs.handleProjectTooltipMouseLeave}
        />
      )}

      {/* Sun tooltip when hovering over a focus area sun - only show if no project tooltip is visible */}
      {hoveredSun && !hoverInfo.show && (
        <SunTooltip
          ref={tooltipRefs.sunTooltipElementRef}
          sun={hoveredSun}
          isDarkMode={isDarkMode}
          onClick={(sunId): void => zoomToSun(sunId)}
          onMouseEnter={tooltipRefs.handleSunTooltipMouseEnter}
          onMouseLeave={tooltipRefs.handleSunTooltipMouseLeave}
        />
      )}

      {/* Vignette overlay when focused on a sun */}
      {focusedSunId && (
        <div className={`${styles.cameraVignette} ${!isDarkMode ? styles.cameraVignetteLight : ""}`} />
      )}

      {/* Focus area indicator when zoomed into a sun */}
      {focusedSunId && ((): React.ReactElement | null => {
        const sunState = getSunStates().find(s => s.id === focusedSunId);
        return sunState ? (
          <div className={`${styles.focusAreaIndicator} ${!isDarkMode ? styles.focusAreaIndicatorLight : ""}`}>
            <div className={styles.focusAreaLabel}>
              <span className={styles.focusAreaIcon}>🔍</span>
              <span className={styles.focusAreaName}>{sunState.name}</span>
            </div>
          </div>
        ) : null;
      })()}

      {/* Zoom out button when focused on a sun */}
      {focusedSunId && (
        <button
          className={`${styles.zoomOutButton} ${!isDarkMode ? styles.zoomOutButtonLight : ""}`}
          onClick={(): void => zoomToSun(focusedSunId)}
          style={{
            left: `calc(50% + ${sidebarWidth / 2}px)`
          }}
        >
          <span className={styles.zoomOutIcon}>←</span>
          Zoom Out
        </button>
      )}

      {/* Add score overlay if in game mode */}
      {gameMode && (
        <ScoreOverlay
          remainingClicks={gameState.remainingClicks}
          currentScore={gameState.score}
          highScores={gameState.highScores}
        />
      )}
    </>
  );
});

export default InteractiveStarfield;
