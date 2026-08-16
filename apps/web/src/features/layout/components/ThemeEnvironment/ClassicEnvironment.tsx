import { useEffect, useMemo, useRef, type ReactElement } from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  CLASSIC_DEFAULT_SEED,
  CLASSIC_FRAME_BUDGET_MS,
  createClassicScene,
  drawClassicScene,
  type ClassicPointer,
} from "./classicScene";
import {
  CLASSIC_OVERVIEW_CAMERA,
  createClassicNodes,
  lerpClassicCamera,
  pickClassicNode,
  worldToScreen,
  type ClassicCamera,
  type ClassicNode,
} from "./classicWorld";
import {
  useEnvironmentCanvas,
  useNodeDock,
  EnvironmentTooltipDock,
  resolveEnvironmentQualityTier,
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

let cachedClassicAudioCtx: AudioContext | null = null;
const getClassicAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!cachedClassicAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      cachedClassicAudioCtx = new AudioCtx();
    }
  }
  if (cachedClassicAudioCtx && cachedClassicAudioCtx.state === "suspended") {
    cachedClassicAudioCtx.resume().catch(() => {});
  }
  return cachedClassicAudioCtx;
};

const playMechanicalClick = (type: "pin" | "focus" = "pin"): void => {
  try {
    const ctx = getClassicAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    const now = ctx.currentTime;
    if (type === "pin") {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    } else {
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Graceful fallback
  }
  try {
    navigator?.vibrate?.(8);
  } catch {
    // Ignore haptics fallback
  }
};

export const ClassicEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier = "high",
  paused,
  randomSeed,
  fixedTimestamp,
}: ClassicEnvironmentProps): ReactElement => {
  const pointerRef = useRef<ClassicPointer | null>(null);
  const hoveredNodeRef = useRef<ClassicNode | null>(null);
  const cameraRef = useRef<ClassicCamera>({ ...CLASSIC_OVERVIEW_CAMERA });
  const scrollYRef = useRef<number>(0);
  const modeProgressRef = useRef<number>(isDarkMode ? 1.0 : 0.0);

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? CLASSIC_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveEnvironmentQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createClassicScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const nodes = useMemo(() => createClassicNodes(), []);

  const {
    tooltip,
    setTooltip,
    pinnedNodes,
    handleTogglePin,
    handleUnpin,
    handleCloseAllPinned,
    handleFocusNode,
    handleResetCamera,
  } = useNodeDock<ClassicNode>({
    cameraRef,
    onPin: () => playMechanicalClick("pin"),
    onFocus: () => playMechanicalClick("focus"),
  });

  const isRunning =
    !reducedMotion &&
    !paused &&
    fixedTimestamp === undefined &&
    CLASSIC_FRAME_BUDGET_MS[resolvedQuality] > 0;

  const { canvasRef } = useEnvironmentCanvas({
    isRunning,
    fixedTimestamp,
    draw: (context, { width, height, timeMs, deltaSeconds }) => {
      const targetMode = isDarkMode ? 1.0 : 0.0;
      if (reducedMotion || fixedTimestamp !== undefined) {
        modeProgressRef.current = targetMode;
      } else {
        modeProgressRef.current +=
          (targetMode - modeProgressRef.current) *
          Math.min(deltaSeconds * 4.5, 1.0);
      }

      if (!reducedMotion && !paused && fixedTimestamp === undefined) {
        cameraRef.current = lerpClassicCamera(cameraRef.current);
      }

      drawClassicScene({
        ctx: context,
        width,
        height,
        scene,
        nodes,
        camera: cameraRef.current,
        focusedNode: null,
        hoveredNode: hoveredNodeRef.current,
        timeMs,
        isDarkMode,
        qualityTier: resolvedQuality,
        pointer: reducedMotion || paused ? null : pointerRef.current,
        reducedMotion,
        pinnedNodes,
        scrollY: scrollYRef.current,
        modeProgress: modeProgressRef.current,
      });
    },
    deps: [
      isDarkMode,
      reducedMotion,
      paused,
      resolvedQuality,
      scene,
      nodes,
      pinnedNodes,
    ],
  });

  useEffect(() => {
    const onScroll = (): void => {
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return (): void => window.removeEventListener("scroll", onScroll);
  }, []);

  const handlePointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ): void => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    pointerRef.current = { x: px, y: py };

    const hit = pickClassicNode(
      px,
      py,
      rect.width,
      rect.height,
      cameraRef.current,
      nodes,
    );

    if (hit !== hoveredNodeRef.current) {
      hoveredNodeRef.current = hit;
      if (hit) {
        const screenPos = worldToScreen(
          hit.x,
          hit.y,
          rect.width,
          rect.height,
          cameraRef.current,
        );
        setTooltip({ node: hit, x: screenPos.x, y: screenPos.y });
      } else {
        setTooltip(null);
      }
    }
  };

  const handlePointerLeave = (): void => {
    pointerRef.current = null;
    hoveredNodeRef.current = null;
    setTooltip(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const hit = pickClassicNode(
      px,
      py,
      rect.width,
      rect.height,
      cameraRef.current,
      nodes,
    );

    if (hit) {
      handleFocusNode(hit);
    }
  };

  return (
    <div
      className={styles.wrapper}
      data-classic-environment="true"
      data-quality-tier={resolvedQuality}
      data-seed={seed}
      data-time={fixedTimestamp ?? 0}
      data-frame-budget={CLASSIC_FRAME_BUDGET_MS[resolvedQuality]}
      data-classic-zoom={cameraRef.current.zoom.toFixed(2)}
      data-classic-node-count={nodes.length}
    >
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
