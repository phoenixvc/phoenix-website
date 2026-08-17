import type { ReactElement } from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  CLOUD_DEFAULT_SEED,
  CLOUD_FRAME_BUDGET_MS,
  createCloudScene,
  drawCloudScene,
} from "./cloudScene";
import {
  CLOUD_OVERVIEW_CAMERA,
  createCloudNodes,
  lerpCloudCamera,
  pickCloudNode,
  worldToScreen,
} from "./cloudWorld";
import {
  useThemeEnvironmentController,
  EnvironmentTooltipDock,
  createThemeTonePlayer,
} from "./shared";
import styles from "./cloudEnvironment.module.css";

export interface CloudEnvironmentProps {
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

const playCloudTone = createThemeTonePlayer({
  waveform: "sine",
  pin: {
    startFreq: 523.25, // C5
    endFreq: 783.99, // G5
    freqRampSeconds: 0.2,
    gainStart: 0.04,
    gainRampSeconds: 0.3,
  },
  focus: {
    startFreq: 392.0, // G4
    endFreq: 587.33, // D5
    freqRampSeconds: 0.25,
    gainStart: 0.05,
    gainRampSeconds: 0.35,
  },
  stopSeconds: 0.35,
  vibrateMs: 10,
});

/**
 * Built once at module scope (like `playCloudTone` above) rather than as an
 * inline object literal inside the component: every field here is already a
 * stable module-level reference, so a fresh literal on each render would
 * just defeat `useThemeEnvironmentController`'s internal `useMemo`s (keyed
 * on `adapter`) and force its canvas effect to tear down/rebuild every
 * render for no reason.
 */
const cloudAdapter = {
  themeKey: "cloud",
  defaultSeed: CLOUD_DEFAULT_SEED,
  frameBudgetMs: CLOUD_FRAME_BUDGET_MS,
  overviewCamera: CLOUD_OVERVIEW_CAMERA,
  createScene: createCloudScene,
  createNodes: createCloudNodes,
  drawScene: drawCloudScene,
  lerpCamera: lerpCloudCamera,
  pickNode: pickCloudNode,
  worldToScreen,
  playTone: playCloudTone,
};

export const CloudEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier,
  paused,
  randomSeed,
  fixedTimestamp,
}: CloudEnvironmentProps): ReactElement => {
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
    adapter: cloudAdapter,
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
        dockLabel="Skywatch"
        onTogglePin={handleTogglePin}
        onUnpin={handleUnpin}
        onCloseAllPinned={handleCloseAllPinned}
        onFocusNode={handleFocusNode}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
};

export default CloudEnvironment;
