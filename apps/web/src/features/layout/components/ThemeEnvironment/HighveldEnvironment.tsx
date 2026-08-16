import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import { Button } from "@/components/ui/button";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "./types";
import {
  HIGHVELD_DEFAULT_SEED,
  HIGHVELD_FRAME_BUDGET_MS,
  activeStrikeAt,
  createHighveldScene,
  drawHighveldScene,
  highveldPhaseAt,
  type HighveldPointer,
} from "./highveldScene";
import {
  HIGHVELD_OVERVIEW_CAMERA,
  cameraForNode,
  createHighveldNodes,
  lerpHighveldCamera,
  pickHighveldNode,
  type HighveldCamera,
  type HighveldNode,
} from "./highveldWorld";
import { useEnvironmentCanvas, resolveEnvironmentQualityTier } from "./shared";
import styles from "./highveldEnvironment.module.css";

interface HighveldEnvironmentProps {
  isDarkMode: boolean;
  motionMode: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

const HighveldEnvironment = ({
  isDarkMode,
  motionMode,
  qualityTier,
  paused,
  randomSeed,
  fixedTimestamp,
}: HighveldEnvironmentProps): ReactElement => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HighveldPointer | null>(null);
  const cameraRef = useRef<HighveldCamera>(HIGHVELD_OVERVIEW_CAMERA);
  const nodes = useMemo(() => createHighveldNodes(), []);
  const koppies = useMemo(
    () => nodes.filter((node) => node.kind === "koppie"),
    [nodes],
  );
  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? HIGHVELD_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveEnvironmentQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createHighveldScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HighveldNode | null>(null);
  const [hoverPoint, setHoverPoint] = useState({ x: 0, y: 0 });
  const [zoomLabel, setZoomLabel] = useState(HIGHVELD_OVERVIEW_CAMERA.zoom);

  // Draw inputs that change often live in refs so the animation loop is set up
  // once per environment rather than torn down on every focus change.
  const focusedIdRef = useRef<string | null>(null);
  focusedIdRef.current = focusedId;

  // `low` renders one representative frame and stops; medium throttles to
  // 30fps; high runs at the display rate. Matches the published budgets.
  const isRunning =
    !paused &&
    !reducedMotion &&
    fixedTimestamp === undefined &&
    resolvedQuality !== "low";
  const frameThrottleMs = resolvedQuality === "medium" ? 1000 / 30 : 0;

  const { canvasRef, repaint } = useEnvironmentCanvas({
    isRunning,
    frameThrottleMs,
    fixedTimestamp,
    repaintOnResizeWhenIdle: true,
    draw: (context, { width, height, timeMs }) => {
      if (isRunning) {
        cameraRef.current = lerpHighveldCamera(cameraRef.current);
      } else if (cameraRef.current.target) {
        cameraRef.current = { ...cameraRef.current.target };
      }

      drawHighveldScene({
        ctx: context,
        width,
        height,
        scene,
        nodes,
        camera: cameraRef.current,
        focusedId: focusedIdRef.current,
        timeMs,
        isDarkMode,
        qualityTier: resolvedQuality,
        pointer: reducedMotion || paused ? null : pointerRef.current,
        reducedMotion,
      });

      // Reported straight to the DOM so the day cycle and lightning are
      // observable without re-rendering React every frame.
      const wrapper = wrapperRef.current;
      if (wrapper) {
        wrapper.dataset.highveldPhase = highveldPhaseAt(timeMs, isDarkMode);
        wrapper.dataset.highveldBolt = activeStrikeAt(scene, timeMs)
          ? "active"
          : "idle";
      }
    },
    deps: [isDarkMode, nodes, paused, reducedMotion, resolvedQuality, scene],
  });

  useEffect(() => {
    if (!isRunning) {
      repaint();
    }
  }, [focusedId, zoomLabel, isRunning, repaint]);

  useEffect(() => {
    if (isRunning || typeof document === "undefined" || !document.fonts) {
      return undefined;
    }
    // Node initials are canvas text, which bakes in whatever face was
    // available at paint time. Static tiers never paint again, so without
    // this they keep the fallback glyphs for the life of the page.
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (!disposed) {
        repaint();
      }
    });
    return (): void => {
      disposed = true;
    };
  }, [isRunning, repaint]);

  const focusNode = (node: HighveldNode): void => {
    const target = cameraForNode(node);
    cameraRef.current = reducedMotion
      ? { ...target }
      : { ...cameraRef.current, target };
    setFocusedId(node.id);
    setZoomLabel(target.zoom);
  };

  const resetView = (): void => {
    cameraRef.current = reducedMotion
      ? { ...HIGHVELD_OVERVIEW_CAMERA }
      : { ...cameraRef.current, target: { ...HIGHVELD_OVERVIEW_CAMERA } };
    setFocusedId(null);
    setHovered(null);
    setZoomLabel(HIGHVELD_OVERVIEW_CAMERA.zoom);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    pointerRef.current = { x: event.clientX, y: event.clientY };
    setHovered(
      pickHighveldNode(
        event.clientX,
        event.clientY,
        nodes,
        cameraRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
      ),
    );
    setHoverPoint({ x: event.clientX, y: event.clientY });
  };

  const handlePointerLeave = (): void => {
    pointerRef.current = null;
    setHovered(null);
  };

  const handleClick = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const node = pickHighveldNode(
      event.clientX,
      event.clientY,
      nodes,
      cameraRef.current,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    if (!node) {
      resetView();
      return;
    }
    focusNode(node);
  };

  useEffect(() => {
    const node = canvasRef.current?.parentElement;
    if (!node) {
      return undefined;
    }
    const onWheel = (event: WheelEvent): void => {
      if (reducedMotion || paused) {
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
    node.addEventListener("wheel", onWheel, { passive: false });
    return (): void => node.removeEventListener("wheel", onWheel);
  }, [canvasRef, paused, reducedMotion]);

  return (
    <>
      <div
        ref={wrapperRef}
        className={styles.wrapper}
        data-highveld-plateau
        data-quality-tier={resolvedQuality}
        data-seed={seed}
        data-time={fixedTimestamp ?? "realtime"}
        data-weather={scene.weather}
        data-mode={isDarkMode ? "dark" : "light"}
        data-frame-budget={HIGHVELD_FRAME_BUDGET_MS[resolvedQuality]}
        data-highveld-zoom={zoomLabel}
        data-highveld-focus={focusedId ?? "overview"}
        data-highveld-node-count={nodes.length}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <svg
          className={styles.foreground}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMax slice"
          focusable="false"
          aria-hidden="true"
        >
          <g className={styles.swayNear}>
            <path
              className={styles.tuft}
              d="M-20 900 C40 862 70 830 96 792 C112 836 138 866 176 900 Z"
            />
            <path className={styles.stalk} d="M40 900 C52 828 34 792 62 742" />
            <path className={styles.stalk} d="M96 900 C104 836 88 800 118 756" />
            <path className={styles.stalk} d="M150 900 C160 820 140 776 170 716" />
            <path className={styles.stalk} d="M206 900 C214 842 198 806 226 764" />
            <path className={styles.stalk} d="M262 900 C272 830 252 788 284 736" />
            <path className={styles.stalk} d="M330 900 C338 848 322 812 350 774" />
            <circle className={styles.cosmos} cx="170" cy="712" r="9" />
            <circle className={styles.cosmosPale} cx="284" cy="732" r="7" />
          </g>
          <g className={styles.swayFar}>
            <path
              className={styles.tuft}
              d="M1460 900 C1400 858 1372 824 1348 786 C1330 832 1302 866 1264 900 Z"
            />
            <path
              className={styles.stalk}
              d="M1400 900 C1390 830 1408 790 1382 740"
            />
            <path
              className={styles.stalk}
              d="M1344 900 C1336 838 1352 800 1324 754"
            />
            <path
              className={styles.stalk}
              d="M1290 900 C1280 822 1300 780 1272 726"
            />
            <path
              className={styles.stalk}
              d="M1232 900 C1224 844 1240 806 1212 766"
            />
            <path
              className={styles.stalk}
              d="M1178 900 C1168 832 1188 792 1156 744"
            />
            <path
              className={styles.stalk}
              d="M1112 900 C1104 850 1120 814 1092 778"
            />
            <circle className={styles.cosmos} cx="1272" cy="722" r="8" />
            <circle className={styles.cosmosPale} cx="1156" cy="740" r="7" />
          </g>
        </svg>
      </div>

      {hovered ? (
        <div
          className={styles.tooltip}
          style={{ left: hoverPoint.x + 16, top: hoverPoint.y + 16 }}
          data-highveld-tooltip={hovered.id}
          aria-hidden="true"
        >
          <strong>{hovered.name}</strong>
          <span>{hovered.description}</span>
        </div>
      ) : null}

      <div className={styles.hud} role="toolbar" aria-label="Highveld navigation">
        {koppies.map((koppie) => (
          <Button
            key={koppie.id}
            type="button"
            variant="ghost"
            className={styles.hudButton}
            data-highveld-zoom-target={koppie.id}
            aria-pressed={focusedId === koppie.id}
            onClick={(event) => {
              event.stopPropagation();
              focusNode(koppie);
            }}
          >
            {koppie.name}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          className={styles.hudButton}
          data-highveld-zoom-target="overview"
          onClick={(event) => {
            event.stopPropagation();
            resetView();
          }}
        >
          Whole plateau
        </Button>
      </div>
    </>
  );
};

export default HighveldEnvironment;
