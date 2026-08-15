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
import styles from "./classicEnvironment.module.css";

export interface ClassicEnvironmentProps {
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

interface TooltipState {
  node: ClassicNode;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<ClassicPointer | null>(null);
  const hoveredNodeRef = useRef<ClassicNode | null>(null);
  const cameraRef = useRef<ClassicCamera>({ ...CLASSIC_OVERVIEW_CAMERA });
  const scrollYRef = useRef<number>(0);
  const modeProgressRef = useRef<number>(isDarkMode ? 1.0 : 0.0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [pinnedNodes, setPinnedNodes] = useState<ClassicNode[]>([]);

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? CLASSIC_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createClassicScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const nodes = useMemo(() => createClassicNodes(), []);

  const handleTogglePin = (node: ClassicNode): void => {
    playMechanicalClick("pin");
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

  const handleFocusNode = (node: ClassicNode): void => {
    playMechanicalClick("focus");
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
        cameraRef.current = lerpClassicCamera(cameraRef.current);
      }

      drawClassicScene({
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
        CLASSIC_FRAME_BUDGET_MS[resolvedQuality] > 0
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
              Schematic Pinning ({pinnedNodes.length})
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

export default ClassicEnvironment;
