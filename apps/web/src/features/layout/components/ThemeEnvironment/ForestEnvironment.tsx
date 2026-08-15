import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useNavigate } from "react-router-dom";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  FOREST_DEFAULT_SEED,
  FOREST_FRAME_BUDGET_MS,
  createForestScene,
  drawForestScene,
  type ForestPointer,
} from "./forestScene";
import {
  FOREST_OVERVIEW_CAMERA,
  cameraForNode,
  createForestNodes,
  lerpForestCamera,
  pickForestNode,
  type ForestCamera,
  type ForestNode,
} from "./forestWorld";
import styles from "./forestEnvironment.module.css";

interface ForestEnvironmentProps {
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

const ForestEnvironment = ({
  isDarkMode,
  motionMode,
  qualityTier,
  paused,
  randomSeed,
  fixedTimestamp,
}: ForestEnvironmentProps): ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<ForestPointer | null>(null);
  const cameraRef = useRef<ForestCamera>(FOREST_OVERVIEW_CAMERA);
  const nodes = useMemo(() => createForestNodes(), []);
  const groves = useMemo(
    () => nodes.filter((node) => node.kind === "grove"),
    [nodes],
  );
  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? FOREST_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createForestScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const navigate = useNavigate();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<ForestNode | null>(null);
  const [hoverPoint, setHoverPoint] = useState({ x: 0, y: 0 });
  const [zoomLabel, setZoomLabel] = useState(FOREST_OVERVIEW_CAMERA.zoom);
  const hoveredIdRef = useRef<string | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  focusedIdRef.current = focusedId;

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
      if (!reducedMotion && !paused) {
        cameraRef.current = lerpForestCamera(cameraRef.current);
      } else if (cameraRef.current.target) {
        cameraRef.current = {
          ...cameraRef.current.target,
        };
      }
      drawForestScene({
        ctx: context,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        scene,
        nodes,
        camera: cameraRef.current,
        focusedId: focusedIdRef.current,
        hoveredId: hoveredIdRef.current,
        timeMs,
        isDarkMode,
        qualityTier: resolvedQuality,
        pointer: pointerRef.current,
        reducedMotion,
      });
    };

    const tick = (timestamp: number): void => {
      const budget = FOREST_FRAME_BUDGET_MS[resolvedQuality];
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
    fixedTimestamp,
    isDarkMode,
    nodes,
    paused,
    reducedMotion,
    resolvedQuality,
    scene,
  ]);

  const focusNode = useCallback(
    (node: ForestNode): void => {
      const target = cameraForNode(node);
      cameraRef.current = reducedMotion
        ? { ...target }
        : { ...cameraRef.current, target };
      setFocusedId(node.id);
      setZoomLabel(target.zoom);
    },
    [reducedMotion],
  );

  const resetView = (): void => {
    cameraRef.current = reducedMotion
      ? { ...FOREST_OVERVIEW_CAMERA }
      : { ...cameraRef.current, target: { ...FOREST_OVERVIEW_CAMERA } };
    setFocusedId(null);
    setHovered(null);
    setZoomLabel(FOREST_OVERVIEW_CAMERA.zoom);
  };

  useEffect(() => {
    const blockingSelector =
      "a, button, input, textarea, select, [role='button'], [contenteditable='true']";
    const forestSurface = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) {
        return false;
      }
      return Boolean(
        target.closest(
          "[data-forest-canopy], [data-starfield-passthrough='true']",
        ),
      );
    };

    const onPointerMove = (event: PointerEvent): void => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      pointerRef.current = { x: event.clientX, y: event.clientY };
      const node = pickForestNode(
        event.clientX,
        event.clientY,
        nodes,
        cameraRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      hoveredIdRef.current = node?.id ?? null;
      setHovered(node);
      setHoverPoint({ x: event.clientX, y: event.clientY });
      document.body.style.cursor = node ? "pointer" : "";
    };

    const onClick = (event: MouseEvent): void => {
      const canvas = canvasRef.current;
      if (!canvas || !(event.target instanceof Element)) {
        return;
      }
      if (event.target.closest(blockingSelector)) {
        return;
      }
      if (!forestSurface(event.target)) {
        return;
      }
      const node = pickForestNode(
        event.clientX,
        event.clientY,
        nodes,
        cameraRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      if (!node) {
        return;
      }
      event.preventDefault();
      const alreadyFocused = focusedIdRef.current === node.id;
      focusNode(node);
      if (node.kind === "clearing" || alreadyFocused) {
        void navigate(node.href);
      }
    };

    const onWheel = (event: WheelEvent): void => {
      if (reducedMotion || paused || !forestSurface(event.target)) {
        return;
      }
      event.preventDefault();
      const nextZoom = Math.min(
        4.2,
        Math.max(1, cameraRef.current.zoom + (event.deltaY > 0 ? -0.18 : 0.18)),
      );
      cameraRef.current = {
        ...cameraRef.current,
        target: {
          cx: cameraRef.current.cx,
          cy: cameraRef.current.cy,
          zoom: nextZoom,
        },
      };
      setZoomLabel(Number(nextZoom.toFixed(2)));
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("click", onClick, true);
    window.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    return (): void => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("wheel", onWheel, true);
      document.body.style.cursor = "";
    };
  }, [focusNode, navigate, nodes, paused, reducedMotion]);

  return (
    <>
      <div
        className={styles.wrapper}
        data-forest-canopy
        data-quality-tier={resolvedQuality}
        data-seed={seed}
        data-time={fixedTimestamp ?? "realtime"}
        data-weather={scene.weather}
        data-mode={isDarkMode ? "dark" : "light"}
        data-frame-budget={FOREST_FRAME_BUDGET_MS[resolvedQuality]}
        data-forest-zoom={zoomLabel}
        data-forest-focus={focusedId ?? "overview"}
        data-forest-hover={hovered?.id ?? "none"}
        data-forest-node-count={nodes.length}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-hidden="true"
        />
        <svg
          className={styles.canopy}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMax slice"
          focusable="false"
          aria-hidden="true"
        >
          <g className={styles.swaySlow}>
            <path
              className={styles.nearBranch}
              d="M0 0 H460 C380 70 270 150 150 230 C70 280 30 340 0 400 Z"
            />
            <path
              className={styles.fern}
              d="M40 90 C90 130 70 190 40 240 C90 210 130 160 90 110 Z"
            />
          </g>
          <g className={styles.sway}>
            <path
              className={styles.nearBranch}
              d="M1440 0 H960 C1060 80 1210 160 1320 250 C1380 300 1420 370 1440 430 Z"
            />
            <path
              className={styles.fern}
              d="M1380 110 C1320 160 1340 230 1388 280 C1330 240 1280 180 1330 130 Z"
            />
          </g>
          <path
            className={`${styles.vine} ${styles.grow}`}
            d="M90 0 C120 180 40 280 110 460 C150 580 70 700 130 900"
          />
          <path
            className={`${styles.vine} ${styles.growDelayed}`}
            d="M1320 0 C1280 160 1380 280 1300 470 C1250 600 1340 730 1280 900"
          />
          <circle
            className={`${styles.moss} ${styles.pulse}`}
            cx="180"
            cy="70"
            r="18"
          />
          <circle
            className={`${styles.moss} ${styles.pulse}`}
            cx="1240"
            cy="90"
            r="16"
          />
          <circle
            className={`${styles.moss} ${styles.pulse}`}
            cx="80"
            cy="160"
            r="10"
          />
          <circle
            className={`${styles.spark} ${styles.pulse}`}
            cx="320"
            cy="210"
            r="3"
          />
          <circle
            className={`${styles.spark} ${styles.pulse}`}
            cx="1080"
            cy="260"
            r="2.5"
          />
          <circle
            className={`${styles.spark} ${styles.pulse}`}
            cx="720"
            cy="80"
            r="2"
          />
          <circle
            className={`${styles.spark} ${styles.drift}`}
            cx="260"
            cy="340"
            r="1.6"
          />
          <circle
            className={`${styles.spark} ${styles.drift}`}
            cx="980"
            cy="180"
            r="1.8"
          />
          <circle
            className={`${styles.spark} ${styles.drift}`}
            cx="540"
            cy="120"
            r="1.4"
          />
          <circle
            className={`${styles.spark} ${styles.drift}`}
            cx="1180"
            cy="420"
            r="2"
          />
          <circle
            className={`${styles.spark} ${styles.drift}`}
            cx="160"
            cy="520"
            r="1.5"
          />
        </svg>
      </div>

      {hovered ? (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(hoverPoint.x + 16, window.innerWidth - 260),
            top: Math.min(hoverPoint.y + 16, window.innerHeight - 96),
          }}
          data-forest-tooltip={hovered.id}
        >
          <strong>{hovered.name}</strong>
          <span>{hovered.description}</span>
        </div>
      ) : null}

      <div className={styles.hud} role="toolbar" aria-label="Forest navigation">
        {groves.map((grove) => (
          <button
            key={grove.id}
            type="button"
            className={styles.hudButton}
            data-forest-zoom-target={grove.id}
            aria-pressed={focusedId === grove.id}
            onClick={(event) => {
              event.stopPropagation();
              focusNode(grove);
            }}
          >
            {grove.name}
          </button>
        ))}
        <button
          type="button"
          className={styles.hudButton}
          data-forest-zoom-target="overview"
          onClick={(event) => {
            event.stopPropagation();
            resetView();
          }}
        >
          Whole forest
        </button>
      </div>
    </>
  );
};

export default ForestEnvironment;
