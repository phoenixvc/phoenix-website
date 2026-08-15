import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import type {
  EnvironmentMotionMode,
  EnvironmentQualityTier,
} from "./types";
import {
  CLOUD_DEFAULT_SEED,
  CLOUD_FRAME_BUDGET_MS,
  createCloudScene,
  drawCloudScene,
  type CloudPointer,
} from "./cloudScene";
import {
  CLOUD_OVERVIEW_CAMERA,
  createCloudNodes,
  lerpCloudCamera,
  pickCloudNode,
  worldToScreen,
  type CloudCamera,
  type CloudNode,
} from "./cloudWorld";
import styles from "./cloudEnvironment.module.css";

export interface CloudEnvironmentProps {
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

interface TooltipState {
  node: CloudNode;
  x: number;
  y: number;
}

const resolveQualityTier = (
  requested: EnvironmentQualityTier | undefined,
): EnvironmentQualityTier => {
  if (requested) {
    return requested;
  }
  if (typeof window === "undefined") {
    return "medium";
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  const width = window.innerWidth;
  if (width < 768 || cores <= 4) {
    return "low";
  }
  if (cores >= 8 && width >= 1280) {
    return "high";
  }
  return "medium";
};

let cachedCloudAudioCtx: AudioContext | null = null;
const getCloudAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!cachedCloudAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      cachedCloudAudioCtx = new AudioCtx();
    }
  }
  if (cachedCloudAudioCtx && cachedCloudAudioCtx.state === "suspended") {
    cachedCloudAudioCtx.resume().catch(() => {});
  }
  return cachedCloudAudioCtx;
};

const playWindHarmonic = (type: "pin" | "focus" = "pin"): void => {
  try {
    const ctx = getCloudAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    if (type === "pin") {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    } else {
      osc.frequency.setValueAtTime(392.0, now); // G4
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.25); // D5
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

export const CloudEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier = "high",
  paused,
  randomSeed,
  fixedTimestamp,
}: CloudEnvironmentProps): ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<CloudPointer | null>(null);
  const hoveredNodeRef = useRef<CloudNode | null>(null);
  const cameraRef = useRef<CloudCamera>({ ...CLOUD_OVERVIEW_CAMERA });
  const scrollYRef = useRef<number>(0);
  const modeProgressRef = useRef<number>(isDarkMode ? 1.0 : 0.0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [pinnedNodes, setPinnedNodes] = useState<CloudNode[]>([]);

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? CLOUD_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createCloudScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const nodes = useMemo(() => createCloudNodes(), []);

  const handleTogglePin = (node: CloudNode): void => {
    playWindHarmonic("pin");
    setPinnedNodes((prev) => {
      const exists = prev.some((p) => p.id === node.id);
      if (exists) {
        return prev.filter((p) => p.id !== node.id);
      }
      return [...prev, node];
    });
  };

  const handleUnpin = (nodeId: string): void => {
    setPinnedNodes((prev) => prev.filter((p) => p.id !== nodeId));
  };

  const handleCloseAllPinned = (): void => {
    setPinnedNodes([]);
    cameraRef.current = {
      ...cameraRef.current,
      target: { cx: 0.5, cy: 0.5, zoom: 1 },
    };
  };

  const handleFocusNode = (node: CloudNode): void => {
    playWindHarmonic("focus");
    cameraRef.current = {
      ...cameraRef.current,
      target: { cx: node.x, cy: node.y, zoom: 1.45 },
    };
  };

  const handleResetCamera = (): void => {
    cameraRef.current = {
      ...cameraRef.current,
      target: { cx: 0.5, cy: 0.5, zoom: 1 },
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      return undefined;
    }

    let frameId = 0;
    let lastTimestamp = performance.now();
    const start = performance.now();

    const resize = (): void => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const paint = (timestamp: number): void => {
      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;
      const timeMs = fixedTimestamp ?? timestamp - start;

      const targetMode = isDarkMode ? 1.0 : 0.0;
      if (reducedMotion || fixedTimestamp !== undefined) {
        modeProgressRef.current = targetMode;
      } else {
        modeProgressRef.current +=
          (targetMode - modeProgressRef.current) *
          Math.min(deltaSeconds * 4.5, 1.0);
      }

      if (!reducedMotion && !paused && fixedTimestamp === undefined) {
        cameraRef.current = lerpCloudCamera(cameraRef.current);
      }

      drawCloudScene({
        ctx: context,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
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

      if (
        !reducedMotion &&
        !paused &&
        fixedTimestamp === undefined &&
        CLOUD_FRAME_BUDGET_MS[resolvedQuality] > 0
      ) {
        frameId = window.requestAnimationFrame(paint);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const onScroll = (): void => {
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    paint(performance.now());

    return (): void => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [
    isDarkMode,
    reducedMotion,
    paused,
    fixedTimestamp,
    resolvedQuality,
    scene,
    nodes,
    pinnedNodes,
  ]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    pointerRef.current = { x: px, y: py };

    const hit = pickCloudNode(
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

    const hit = pickCloudNode(
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
      data-cloud-environment="true"
      data-quality-tier={resolvedQuality}
      data-seed={seed}
      data-time={fixedTimestamp ?? 0}
      data-frame-budget={CLOUD_FRAME_BUDGET_MS[resolvedQuality]}
      data-cloud-zoom={cameraRef.current.zoom.toFixed(2)}
      data-cloud-node-count={nodes.length}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />

      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className={styles.tooltipTitle}>
            <span>{tooltip.node.name}</span>
            <button
              className={styles.tooltipPinButton}
              onClick={() => handleTogglePin(tooltip.node)}
            >
              {pinnedNodes.some((p) => p.id === tooltip.node.id)
                ? "Unpin"
                : "Pin Node"}
            </button>
          </div>
          <div className={styles.tooltipSubtitle}>
            {tooltip.node.subtitle}
          </div>
          <div className={styles.tooltipDescription}>
            {tooltip.node.description}
          </div>
          <div className={styles.tooltipFooter}>
            <span className={styles.tooltipMetric}>
              {tooltip.node.metric}
            </span>
            <button
              className={styles.tooltipPinButton}
              onClick={() => handleFocusNode(tooltip.node)}
            >
              Focus View
            </button>
          </div>
        </div>
      )}

      {pinnedNodes.length > 0 && (
        <div className={styles.dock}>
          <div className={styles.dockHeader}>
            <span className={styles.dockTitle}>
              Skywatch ({pinnedNodes.length})
            </span>
            <button
              className={styles.dockCloseAll}
              onClick={handleCloseAllPinned}
            >
              Close All
            </button>
          </div>
          {pinnedNodes.map((pNode) => (
            <div key={pNode.id} className={styles.dockCard}>
              <div className={styles.dockCardHeader}>
                <span className={styles.dockCardName}>{pNode.name}</span>
                <button
                  className={styles.dockCardRemove}
                  onClick={() => handleUnpin(pNode.id)}
                >
                  ×
                </button>
              </div>
              <p className={styles.dockCardDescription}>
                {pNode.description}
              </p>
              <div className={styles.dockCardActions}>
                <button
                  className={styles.dockFocusBtn}
                  onClick={() => handleFocusNode(pNode)}
                >
                  Center
                </button>
                <button
                  className={styles.dockFocusBtn}
                  onClick={handleResetCamera}
                >
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CloudEnvironment;
