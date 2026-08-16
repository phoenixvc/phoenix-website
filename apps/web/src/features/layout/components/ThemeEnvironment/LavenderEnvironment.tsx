import { useEffect, useMemo, useRef, type ReactElement } from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  LAVENDER_DEFAULT_SEED,
  LAVENDER_FRAME_BUDGET_MS,
  createLavenderScene,
  drawLavenderScene,
  type LavenderPointer,
} from "./lavenderScene";
import {
  LAVENDER_OVERVIEW_CAMERA,
  createLavenderNodes,
  lerpLavenderCamera,
  pickLavenderNode,
  worldToScreen,
  type LavenderCamera,
  type LavenderNode,
} from "./lavenderWorld";
import {
  useEnvironmentCanvas,
  useNodeDock,
  EnvironmentTooltipDock,
  resolveEnvironmentQualityTier,
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

let cachedLavenderAudioCtx: AudioContext | null = null;
const getLavenderAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!cachedLavenderAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      cachedLavenderAudioCtx = new AudioCtx();
    }
  }
  if (cachedLavenderAudioCtx && cachedLavenderAudioCtx.state === "suspended") {
    cachedLavenderAudioCtx.resume().catch(() => {});
  }
  return cachedLavenderAudioCtx;
};

const playCelestaChime = (type: "pin" | "focus" = "pin"): void => {
  try {
    const ctx = getLavenderAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    if (type === "pin") {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.2); // A5
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    } else {
      osc.frequency.setValueAtTime(440.0, now); // A4
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.25); // E5
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Graceful fallback
  }
  try {
    navigator?.vibrate?.(10);
  } catch {
    // Ignore haptics fallback
  }
};

export const LavenderEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier = "high",
  paused,
  randomSeed,
  fixedTimestamp,
}: LavenderEnvironmentProps): ReactElement => {
  const pointerRef = useRef<LavenderPointer | null>(null);
  const hoveredNodeRef = useRef<LavenderNode | null>(null);
  const cameraRef = useRef<LavenderCamera>({ ...LAVENDER_OVERVIEW_CAMERA });
  const scrollYRef = useRef<number>(0);
  const modeProgressRef = useRef<number>(isDarkMode ? 1.0 : 0.0);

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? LAVENDER_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveEnvironmentQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createLavenderScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const nodes = useMemo(() => createLavenderNodes(), []);

  const {
    tooltip,
    setTooltip,
    pinnedNodes,
    handleTogglePin,
    handleUnpin,
    handleCloseAllPinned,
    handleFocusNode,
    handleResetCamera,
  } = useNodeDock<LavenderNode>({
    cameraRef,
    onPin: () => playCelestaChime("pin"),
    onFocus: () => playCelestaChime("focus"),
  });

  const isRunning =
    !reducedMotion &&
    !paused &&
    fixedTimestamp === undefined &&
    LAVENDER_FRAME_BUDGET_MS[resolvedQuality] > 0;

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
        cameraRef.current = lerpLavenderCamera(cameraRef.current);
      }

      drawLavenderScene({
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

    const hit = pickLavenderNode(
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

    const hit = pickLavenderNode(
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
      data-lavender-environment="true"
      data-quality-tier={resolvedQuality}
      data-seed={seed}
      data-time={fixedTimestamp ?? 0}
      data-frame-budget={LAVENDER_FRAME_BUDGET_MS[resolvedQuality]}
      data-lavender-zoom={cameraRef.current.zoom.toFixed(2)}
      data-lavender-node-count={nodes.length}
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
