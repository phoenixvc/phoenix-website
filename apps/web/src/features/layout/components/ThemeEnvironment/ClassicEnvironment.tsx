import type { ReactElement } from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  CLASSIC_DEFAULT_SEED,
  CLASSIC_FRAME_BUDGET_MS,
  createClassicScene,
  drawClassicScene,
} from "./classicScene";
import {
  CLASSIC_OVERVIEW_CAMERA,
  createClassicNodes,
  lerpClassicCamera,
  pickClassicNode,
  worldToScreen,
} from "./classicWorld";
import {
  useThemeEnvironmentController,
  EnvironmentTooltipDock,
  createThemeTonePlayer,
} from "./shared";
import styles from "./classicEnvironment.module.css";

export interface ClassicEnvironmentProps {
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

const playClassicTone = createThemeTonePlayer({
  waveform: "square",
  pin: {
    startFreq: 800,
    endFreq: 1600,
    freqRampSeconds: 0.05,
    gainStart: 0.03,
    gainRampSeconds: 0.08,
  },
  focus: {
    startFreq: 600,
    endFreq: 1200,
    freqRampSeconds: 0.06,
    gainStart: 0.04,
    gainRampSeconds: 0.1,
  },
  stopSeconds: 0.1,
  vibrateMs: 8,
});

/**
 * Built once at module scope (like `playClassicTone` above) rather than as
 * an inline object literal inside the component: every field here is
 * already a stable module-level reference, so a fresh literal on each
 * render would just defeat `useThemeEnvironmentController`'s internal
 * `useMemo`s (keyed on `adapter`) and force its canvas effect to tear
 * down/rebuild every render for no reason.
 */
const classicAdapter = {
  themeKey: "classic",
  defaultSeed: CLASSIC_DEFAULT_SEED,
  frameBudgetMs: CLASSIC_FRAME_BUDGET_MS,
  overviewCamera: CLASSIC_OVERVIEW_CAMERA,
  createScene: createClassicScene,
  createNodes: createClassicNodes,
  drawScene: drawClassicScene,
  lerpCamera: lerpClassicCamera,
  pickNode: pickClassicNode,
  worldToScreen,
  playTone: playClassicTone,
};

export const ClassicEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier,
  paused,
  randomSeed,
  fixedTimestamp,
}: ClassicEnvironmentProps): ReactElement => {
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
    adapter: classicAdapter,
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
        dockLabel="Schematic Pinning"
        onTogglePin={handleTogglePin}
        onUnpin={handleUnpin}
        onCloseAllPinned={handleCloseAllPinned}
        onFocusNode={handleFocusNode}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
};

export default ClassicEnvironment;
