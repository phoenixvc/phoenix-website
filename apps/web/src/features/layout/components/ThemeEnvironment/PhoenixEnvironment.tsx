import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import type {
  EnvironmentMotionMode,
  EnvironmentQualityTier,
} from "./types";
import {
  PHOENIX_DEFAULT_SEED,
  PHOENIX_FRAME_BUDGET_MS,
  createPhoenixScene,
  drawPhoenixScene,
  type PhoenixPointer,
} from "./phoenixScene";
import {
  PHOENIX_OVERVIEW_CAMERA,
  cameraForPhoenixNode,
  createPhoenixNodes,
  lerpPhoenixCamera,
  pickPhoenixNode,
  worldToScreen,
  type PhoenixCamera,
  type PhoenixNode,
} from "./phoenixWorld";
import styles from "./phoenixEnvironment.module.css";

export interface PhoenixEnvironmentProps {
  isDarkMode: boolean;
  motionMode: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
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

const PhoenixEnvironment = ({
  isDarkMode,
  motionMode,
  qualityTier,
  paused,
  randomSeed,
  fixedTimestamp,
}: PhoenixEnvironmentProps): ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<PhoenixPointer | null>(null);
  const cameraRef = useRef<PhoenixCamera>({ ...PHOENIX_OVERVIEW_CAMERA });
  const [hoveredNode, setHoveredNode] = useState<PhoenixNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [activeFocus, setActiveFocus] = useState<string>("overview");

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? PHOENIX_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createPhoenixScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const nodes = useMemo(() => createPhoenixNodes(), []);

  const setCameraTarget = useCallback(
    (target: Pick<PhoenixCamera, "cx" | "cy" | "zoom">, focusId: string) => {
      cameraRef.current.target = target;
      if (reducedMotion || paused || fixedTimestamp !== undefined) {
        cameraRef.current.cx = target.cx;
        cameraRef.current.cy = target.cy;
        cameraRef.current.zoom = target.zoom;
      }
      setActiveFocus(focusId);
    },
    [fixedTimestamp, paused, reducedMotion],
  );

  const resetOverview = useCallback(() => {
    setCameraTarget(PHOENIX_OVERVIEW_CAMERA, "overview");
  }, [setCameraTarget]);

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
    let lastMark = 0;
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
      const timeMs = fixedTimestamp ?? timestamp - start;
      if (!reducedMotion && !paused && fixedTimestamp === undefined) {
        cameraRef.current = lerpPhoenixCamera(cameraRef.current);
      }
      drawPhoenixScene({
        ctx: context,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        scene,
        timeMs,
        isDarkMode,
        qualityTier: resolvedQuality,
        pointer: reducedMotion || paused ? null : pointerRef.current,
        reducedMotion,
        camera: cameraRef.current,
        nodes,
        hoveredNode,
      });
    };

    const tick = (timestamp: number): void => {
      const budget = PHOENIX_FRAME_BUDGET_MS[resolvedQuality];
      if (budget === 0 || timestamp - lastMark >= 1000 / 30) {
        paint(timestamp);
        lastMark = timestamp;
      }
      if (!paused && !reducedMotion && fixedTimestamp === undefined) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    resize();
    paint(fixedTimestamp ?? 0);
    if (!paused && !reducedMotion && fixedTimestamp === undefined) {
      frameId = window.requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    return (): void => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [
    activeFocus,
    fixedTimestamp,
    hoveredNode,
    isDarkMode,
    nodes,
    paused,
    reducedMotion,
    resolvedQuality,
    scene,
  ]);

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (reducedMotion || paused) {
      return;
    }
    const pointer = { x: event.clientX, y: event.clientY };
    pointerRef.current = pointer;

    const canvas = canvasRef.current;
    if (canvas) {
      const hit = pickPhoenixNode(
        pointer.x,
        pointer.y,
        nodes,
        cameraRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      setHoveredNode(hit);
      if (hit) {
        const screen = worldToScreen(
          hit.x,
          hit.y,
          cameraRef.current,
          canvas.clientWidth,
          canvas.clientHeight,
        );
        setTooltipPos({
          x: Math.min(Math.max(screen.x, 150), canvas.clientWidth - 150),
          y: Math.max(screen.y - 45, 60),
        });
      } else {
        setTooltipPos(null);
      }
    }
  };

  const handlePointerLeave = (): void => {
    pointerRef.current = null;
    setHoveredNode(null);
    setTooltipPos(null);
  };

  const handleCanvasClick = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hit = pickPhoenixNode(
      event.clientX,
      event.clientY,
      nodes,
      cameraRef.current,
      canvas.clientWidth,
      canvas.clientHeight,
    );

    if (hit) {
      setCameraTarget(cameraForPhoenixNode(hit), hit.id);
    }
  };

  return (
    <>
      <div
        className={styles.wrapper}
        data-phoenix-environment
        data-quality-tier={resolvedQuality}
        data-seed={seed}
        data-time={fixedTimestamp ?? "realtime"}
        data-atmosphere={scene.atmosphere}
        data-mode={isDarkMode ? "dark" : "light"}
        data-frame-budget={PHOENIX_FRAME_BUDGET_MS[resolvedQuality]}
        data-phoenix-zoom={cameraRef.current.zoom.toFixed(2)}
        data-phoenix-focus={activeFocus}
        data-phoenix-node-count={nodes.length}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

        <div className={styles.overlay} aria-hidden="true">
          {/* Left Stylized Phoenix Wing Motif */}
          <svg
            className={styles.wingLeft}
            viewBox="0 0 500 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="phxWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="45%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M0 0 C120 40 240 120 320 220 C350 260 380 310 420 360 C370 330 310 290 260 270 C210 250 140 230 0 240 Z"
              fill="url(#phxWingGrad)"
            />
            <path
              d="M0 0 C90 60 180 150 240 250 C210 220 160 190 0 170 Z"
              fill="url(#phxWingGrad)"
              opacity="0.65"
            />
            <path
              d="M0 0 C60 80 120 180 160 280 C130 240 90 210 0 190 Z"
              fill="url(#phxWingGrad)"
              opacity="0.45"
            />
          </svg>

          {/* Right Stylized Phoenix Wing Motif */}
          <svg
            className={styles.wingRight}
            viewBox="0 0 500 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 0 C120 40 240 120 320 220 C350 260 380 310 420 360 C370 330 310 290 260 270 C210 250 140 230 0 240 Z"
              fill="url(#phxWingGrad)"
            />
            <path
              d="M0 0 C90 60 180 150 240 250 C210 220 160 190 0 170 Z"
              fill="url(#phxWingGrad)"
              opacity="0.65"
            />
          </svg>

          {/* Solar Rebirth Crest */}
          <svg
            className={styles.solarCrest}
            viewBox="0 0 200 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="phxCrestGrad" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
                <stop offset="85%" stopColor="#ef4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="40" r="32" fill="url(#phxCrestGrad)" />
            <path
              d="M100 0 L108 28 L136 36 L112 52 L118 80 L100 64 L82 80 L88 52 L64 36 L92 28 Z"
              fill="#f59e0b"
              opacity="0.75"
            />
            <path
              d="M100 15 L104 32 L120 38 L106 48 L110 65 L100 55 L90 65 L94 48 L80 38 L96 32 Z"
              fill="#fffbeb"
              opacity="0.9"
            />
          </svg>

          {/* Bottom Ambient Heat & Ember Plume Glow */}
          <div className={styles.emberPlumeGlow} />
        </div>
      </div>

      {/* Interactive Tooltip Card */}
      {hoveredNode && tooltipPos && (
        <div
          className={styles.tooltip}
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <strong>{hoveredNode.name}</strong>
          <span>{hoveredNode.description}</span>
        </div>
      )}

      {/* Phoenix World Navigation HUD */}
      <div className={styles.hud} role="toolbar" aria-label="Phoenix navigation">
        <button
          type="button"
          className={styles.hudButton}
          aria-pressed={activeFocus === "overview"}
          onClick={(e) => {
            e.stopPropagation();
            resetOverview();
          }}
        >
          Whole Realm
        </button>
        <button
          type="button"
          className={styles.hudButton}
          aria-pressed={activeFocus === "portfolio-hearth"}
          onClick={(e) => {
            e.stopPropagation();
            const node = nodes.find((n) => n.id === "portfolio-hearth");
            if (node) setCameraTarget(cameraForPhoenixNode(node), node.id);
          }}
        >
          Portfolio Hearth
        </button>
        <button
          type="button"
          className={styles.hudButton}
          aria-pressed={activeFocus === "focus-sanctuary"}
          onClick={(e) => {
            e.stopPropagation();
            const node = nodes.find((n) => n.id === "focus-sanctuary");
            if (node) setCameraTarget(cameraForPhoenixNode(node), node.id);
          }}
        >
          Solar Sanctuaries
        </button>
        <button
          type="button"
          className={styles.hudButton}
          aria-pressed={activeFocus === "origin-spire"}
          onClick={(e) => {
            e.stopPropagation();
            const node = nodes.find((n) => n.id === "origin-spire");
            if (node) setCameraTarget(cameraForPhoenixNode(node), node.id);
          }}
        >
          Origin Spire
        </button>
      </div>
    </>
  );
};

PhoenixEnvironment.displayName = "PhoenixEnvironment";

export default PhoenixEnvironment;
