import { forwardRef } from "react";
import Starfield, { type StarfieldRef } from "../Starfield/Starfield";
import type {
  EnvironmentMotionMode,
  EnvironmentQualityTier,
  ThemeEnvironmentProps,
} from "./types";

interface CosmicFrontierEnvironmentProps extends Omit<
  ThemeEnvironmentProps,
  "themeName" | "fixture"
> {
  motionMode: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

const CosmicFrontierEnvironment = forwardRef<
  StarfieldRef,
  CosmicFrontierEnvironmentProps
>(
  (
    {
      isDarkMode,
      sidebarWidth,
      gameMode,
      debugMode,
      drawDebugInfo,
      motionMode,
      qualityTier,
      paused,
      randomSeed,
      fixedTimestamp,
    },
    ref,
  ) => {
    const reducedMotion = motionMode === "reduced";

    return (
      <Starfield
        ref={ref}
        sidebarWidth={sidebarWidth}
        isDarkMode={isDarkMode}
        enableFlowEffect={!reducedMotion}
        enableBlackHole={!reducedMotion}
        enableMouseInteraction={!reducedMotion && !paused}
        enablePlanets={true}
        starDensity={reducedMotion ? 0.75 : 1.8}
        starSize={1.5}
        particleSpeed={reducedMotion ? 0 : 0.05}
        flowStrength={reducedMotion ? 0 : 0.01}
        gravitationalPull={reducedMotion ? 0 : 0.05}
        mouseEffectRadius={220}
        mouseEffectColor="rgba(138, 43, 226, 0.15)"
        blackHoleSize={1.5}
        gameMode={!reducedMotion && gameMode}
        maxVelocity={reducedMotion ? 0 : 0.5}
        debugMode={debugMode}
        animationSpeed={reducedMotion ? 0 : 1}
        drawDebugInfo={drawDebugInfo}
        reducedMotion={reducedMotion}
        paused={paused}
        qualityTier={qualityTier}
        randomSeed={randomSeed}
        fixedTimestamp={fixedTimestamp}
      />
    );
  },
);

CosmicFrontierEnvironment.displayName = "CosmicFrontierEnvironment";

export default CosmicFrontierEnvironment;
