import type { ReactElement } from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  LAVENDER_DEFAULT_SEED,
  LAVENDER_FRAME_BUDGET_MS,
  createLavenderScene,
  drawLavenderScene,
} from "./lavenderScene";
import {
  LAVENDER_OVERVIEW_CAMERA,
  createLavenderNodes,
  lerpLavenderCamera,
  pickLavenderNode,
  worldToScreen,
} from "./lavenderWorld";
import {
  useThemeEnvironmentController,
  EnvironmentTooltipDock,
  createThemeTonePlayer,
} from "./shared";
import styles from "./lavenderEnvironment.module.css";

export interface LavenderEnvironmentProps {
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

const playLavenderTone = createThemeTonePlayer({
  waveform: "sine",
  pin: {
    startFreq: 587.33, // D5
    endFreq: 880.0, // A5
    freqRampSeconds: 0.2,
    gainStart: 0.04,
    gainRampSeconds: 0.3,
  },
  focus: {
    startFreq: 440.0, // A4
    endFreq: 659.25, // E5
    freqRampSeconds: 0.25,
    gainStart: 0.05,
    gainRampSeconds: 0.35,
  },
  stopSeconds: 0.35,
  vibrateMs: 10,
});

/**
 * Built once at module scope (like `playLavenderTone` above) rather than as
 * an inline object literal inside the component: every field here is
 * already a stable module-level reference, so a fresh literal on each
 * render would just defeat `useThemeEnvironmentController`'s internal
 * `useMemo`s (keyed on `adapter`) and force its canvas effect to tear
 * down/rebuild every render for no reason.
 */
const lavenderAdapter = {
  themeKey: "lavender",
  defaultSeed: LAVENDER_DEFAULT_SEED,
  frameBudgetMs: LAVENDER_FRAME_BUDGET_MS,
  overviewCamera: LAVENDER_OVERVIEW_CAMERA,
  createScene: createLavenderScene,
  createNodes: createLavenderNodes,
  drawScene: drawLavenderScene,
  lerpCamera: lerpLavenderCamera,
  pickNode: pickLavenderNode,
  worldToScreen,
  playTone: playLavenderTone,
};

export const LavenderEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier,
  paused,
  randomSeed,
  fixedTimestamp,
}: LavenderEnvironmentProps): ReactElement => {
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
    adapter: lavenderAdapter,
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
        dockLabel="Flora Watch"
        onTogglePin={handleTogglePin}
        onUnpin={handleUnpin}
        onCloseAllPinned={handleCloseAllPinned}
        onFocusNode={handleFocusNode}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
};

export default LavenderEnvironment;
