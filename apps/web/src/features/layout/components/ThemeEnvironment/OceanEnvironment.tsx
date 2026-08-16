import { useEffect, useMemo, useRef, type ReactElement } from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  OCEAN_DEFAULT_SEED,
  OCEAN_FRAME_BUDGET_MS,
  createOceanScene,
  drawOceanScene,
  type OceanPointer,
} from "./oceanScene";
import {
  OCEAN_OVERVIEW_CAMERA,
  createOceanNodes,
  lerpOceanCamera,
  pickOceanNode,
  worldToScreen,
  type OceanCamera,
  type OceanNode,
} from "./oceanWorld";
import {
  useEnvironmentCanvas,
  useNodeDock,
  EnvironmentTooltipDock,
  resolveEnvironmentQualityTier,
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

let cachedOceanAudioCtx: AudioContext | null = null;
const getOceanAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!cachedOceanAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      cachedOceanAudioCtx = new AudioCtx();
    }
  }
  if (cachedOceanAudioCtx && cachedOceanAudioCtx.state === "suspended") {
    cachedOceanAudioCtx.resume().catch(() => {});
  }
  return cachedOceanAudioCtx;
};

const playSonarPing = (type: "pin" | "focus" = "pin"): void => {
  try {
    const ctx = getOceanAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    if (type === "pin") {
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(1280, now + 0.18);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    } else {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Graceful fallback
  }
  try {
    navigator?.vibrate?.(10);
  } catch {
    // Ignore haptics fallback
  }
};

export const OceanEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier = "high",
  paused,
  randomSeed,
  fixedTimestamp,
}: OceanEnvironmentProps): ReactElement => {
  const pointerRef = useRef<OceanPointer | null>(null);
  const hoveredNodeRef = useRef<OceanNode | null>(null);
  const cameraRef = useRef<OceanCamera>({ ...OCEAN_OVERVIEW_CAMERA });
  const scrollYRef = useRef<number>(0);
  const modeProgressRef = useRef<number>(isDarkMode ? 1.0 : 0.0);

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? OCEAN_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveEnvironmentQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createOceanScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const nodes = useMemo(() => createOceanNodes(), []);

  const {
    tooltip,
    setTooltip,
    pinnedNodes,
    handleTogglePin,
    handleUnpin,
    handleCloseAllPinned,
    handleFocusNode,
    handleResetCamera,
  } = useNodeDock<OceanNode>({
    cameraRef,
    onPin: () => playSonarPing("pin"),
    onFocus: () => playSonarPing("focus"),
  });

  const isRunning =
    !reducedMotion &&
    !paused &&
    fixedTimestamp === undefined &&
    OCEAN_FRAME_BUDGET_MS[resolvedQuality] > 0;

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
        cameraRef.current = lerpOceanCamera(cameraRef.current);
      }

      drawOceanScene({
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

    const hit = pickOceanNode(
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

    const hit = pickOceanNode(
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
      data-ocean-environment="true"
      data-quality-tier={resolvedQuality}
      data-seed={seed}
      data-time={fixedTimestamp ?? 0}
      data-frame-budget={OCEAN_FRAME_BUDGET_MS[resolvedQuality]}
      data-ocean-zoom={cameraRef.current.zoom.toFixed(2)}
      data-ocean-node-count={nodes.length}
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
