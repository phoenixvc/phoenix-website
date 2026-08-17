import type { ReactElement } from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  OCEAN_DEFAULT_SEED,
  OCEAN_FRAME_BUDGET_MS,
  createOceanScene,
  drawOceanScene,
} from "./oceanScene";
import {
  OCEAN_OVERVIEW_CAMERA,
  createOceanNodes,
  lerpOceanCamera,
  pickOceanNode,
  worldToScreen,
} from "./oceanWorld";
import {
  useThemeEnvironmentController,
  EnvironmentTooltipDock,
  createThemeTonePlayer,
} from "./shared";
import styles from "./oceanEnvironment.module.css";

export interface OceanEnvironmentProps {
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

const playOceanTone = createThemeTonePlayer({
  waveform: "sine",
  pin: {
    startFreq: 640,
    endFreq: 1280,
    freqRampSeconds: 0.18,
    gainStart: 0.04,
    gainRampSeconds: 0.25,
  },
  focus: {
    startFreq: 440,
    endFreq: 880,
    freqRampSeconds: 0.22,
    gainStart: 0.05,
    gainRampSeconds: 0.3,
  },
  stopSeconds: 0.3,
  vibrateMs: 10,
});

export const OceanEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier = "high",
  paused,
  randomSeed,
  fixedTimestamp,
}: OceanEnvironmentProps): ReactElement => {
  const {
    canvasRef,
    tooltip,
    pinnedNodes,
    handleTogglePin,
    handleUnpin,
    handleCloseAllPinned,
    handleFocusNode,
    handleResetCamera,
    handlePointerMove,
    handlePointerLeave,
    handleClick,
    wrapperProps,
  } = useThemeEnvironmentController({
    isDarkMode,
    motionMode,
    qualityTier,
    paused,
    randomSeed,
    fixedTimestamp,
    adapter: {
      themeKey: "ocean",
      defaultSeed: OCEAN_DEFAULT_SEED,
      frameBudgetMs: OCEAN_FRAME_BUDGET_MS,
      overviewCamera: OCEAN_OVERVIEW_CAMERA,
      createScene: createOceanScene,
      createNodes: createOceanNodes,
      drawScene: drawOceanScene,
      lerpCamera: lerpOceanCamera,
      pickNode: pickOceanNode,
      worldToScreen,
      playTone: playOceanTone,
    },
  });

  return (
    <div className={styles.wrapper} {...wrapperProps}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />

      <EnvironmentTooltipDock
        styles={styles}
        tooltip={tooltip}
        pinnedNodes={pinnedNodes}
        dockLabel="Abyssal Watch"
        onTogglePin={handleTogglePin}
        onUnpin={handleUnpin}
        onCloseAllPinned={handleCloseAllPinned}
        onFocusNode={handleFocusNode}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
};

export default OceanEnvironment;
