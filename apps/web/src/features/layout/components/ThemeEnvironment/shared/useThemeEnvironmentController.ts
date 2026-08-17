import {
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { EnvironmentMotionMode, EnvironmentQualityTier } from "../types";
import { useEnvironmentCanvas } from "./useEnvironmentCanvas";
import {
  useNodeDock,
  type DockableNode,
  type DockCameraState,
  type TooltipState,
} from "./useNodeDock";
import { resolveEnvironmentQualityTier } from "./resolveEnvironmentQualityTier";

export interface ThemeEnvironmentSceneArgs<TScene, TNode, TCamera, TPointer> {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: TScene;
  nodes: TNode[];
  camera: TCamera;
  focusedNode?: TNode | null;
  hoveredNode?: TNode | null;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: TPointer | null;
  reducedMotion: boolean;
  pinnedNodes?: TNode[];
  scrollY?: number;
  modeProgress?: number;
}

export interface ThemeEnvironmentAdapter<
  TNode extends DockableNode,
  TCamera extends DockCameraState,
  TPointer extends { x: number; y: number },
  TScene,
> {
  /** Data-attribute prefix, e.g. "ocean" -> data-ocean-environment, data-ocean-zoom, data-ocean-node-count. */
  themeKey: string;
  defaultSeed: number;
  frameBudgetMs: Record<EnvironmentQualityTier, number>;
  overviewCamera: TCamera;
  createScene: (seed: number, qualityTier: EnvironmentQualityTier) => TScene;
  createNodes: () => TNode[];
  drawScene: (
    args: ThemeEnvironmentSceneArgs<TScene, TNode, TCamera, TPointer>,
  ) => void;
  lerpCamera: (camera: TCamera) => TCamera;
  pickNode: (
    screenX: number,
    screenY: number,
    width: number,
    height: number,
    camera: TCamera,
    nodes: TNode[],
  ) => TNode | null;
  worldToScreen: (
    x: number,
    y: number,
    width: number,
    height: number,
    camera: TCamera,
  ) => { x: number; y: number; scale: number };
  /** Sound/haptic chime, e.g. from createThemeTonePlayer. */
  playTone: (type: "pin" | "focus") => void;
}

export interface UseThemeEnvironmentControllerOptions<
  TNode extends DockableNode,
  TCamera extends DockCameraState,
  TPointer extends { x: number; y: number },
  TScene,
> {
  adapter: ThemeEnvironmentAdapter<TNode, TCamera, TPointer, TScene>;
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

export interface UseThemeEnvironmentControllerResult<TNode> {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  resolvedQuality: EnvironmentQualityTier;
  seed: number;
  nodes: TNode[];
  tooltip: TooltipState<TNode> | null;
  pinnedNodes: TNode[];
  handleTogglePin: (node: TNode) => void;
  handleUnpin: (nodeId: string) => void;
  handleCloseAllPinned: () => void;
  handleFocusNode: (node: TNode) => void;
  handleResetCamera: () => void;
  handlePointerMove: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  handlePointerLeave: () => void;
  handleClick: (e: ReactMouseEvent<HTMLCanvasElement>) => void;
  /** Spread onto the wrapper div: data-{themeKey}-environment, data-quality-tier, data-seed, data-time, data-frame-budget, data-{themeKey}-zoom, data-{themeKey}-node-count. */
  wrapperProps: Record<string, string | number>;
}

/**
 * Shared controller for the Ocean/Cloud/Lavender/Classic quartet's
 * `*Environment.tsx` components. Previously each theme hand-rolled an
 * identical ~200 lines of pointer refs, camera lerp, mode-progress
 * animation, scroll tracking, and pointer/click hit-testing wiring around
 * its own renamed scene/world functions. This hook owns all of that;
 * each theme supplies only its own scene/world functions and chime via
 * `adapter`, and stays responsible for its own decorative canvas art
 * (`drawScene`) and CSS module.
 */
export function useThemeEnvironmentController<
  TNode extends DockableNode,
  TCamera extends DockCameraState,
  TPointer extends { x: number; y: number },
  TScene,
>({
  adapter,
  isDarkMode,
  motionMode = "full",
  qualityTier = "high",
  paused,
  randomSeed,
  fixedTimestamp,
}: UseThemeEnvironmentControllerOptions<
  TNode,
  TCamera,
  TPointer,
  TScene
>): UseThemeEnvironmentControllerResult<TNode> {
  const pointerRef = useRef<TPointer | null>(null);
  const hoveredNodeRef = useRef<TNode | null>(null);
  const cameraRef = useRef<TCamera>({ ...adapter.overviewCamera });
  const scrollYRef = useRef<number>(0);
  const modeProgressRef = useRef<number>(isDarkMode ? 1.0 : 0.0);

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? adapter.defaultSeed;
  const resolvedQuality = useMemo(
    () => resolveEnvironmentQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => adapter.createScene(seed, resolvedQuality),
    [adapter, seed, resolvedQuality],
  );
  const nodes = useMemo(() => adapter.createNodes(), [adapter]);

  const {
    tooltip,
    setTooltip,
    pinnedNodes,
    handleTogglePin,
    handleUnpin,
    handleCloseAllPinned,
    handleFocusNode,
    handleResetCamera,
  } = useNodeDock<TNode>({
    cameraRef,
    overviewCamera: adapter.overviewCamera,
    // Skip the chime/haptic when the user asked for reduced motion — it's
    // paired with the camera-lerp animation this same preference disables.
    onPin: () => {
      if (!reducedMotion) adapter.playTone("pin");
    },
    onFocus: () => {
      if (!reducedMotion) adapter.playTone("focus");
    },
  });

  const isRunning =
    !reducedMotion &&
    !paused &&
    fixedTimestamp === undefined &&
    adapter.frameBudgetMs[resolvedQuality] > 0;

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
        cameraRef.current = adapter.lerpCamera(cameraRef.current);
      }

      adapter.drawScene({
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
      adapter,
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
    e: ReactPointerEvent<HTMLCanvasElement>,
  ): void => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    pointerRef.current = { x: px, y: py } as TPointer;

    const hit = adapter.pickNode(
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
        const screenPos = adapter.worldToScreen(
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

  const handleClick = (e: ReactMouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const hit = adapter.pickNode(
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

  const wrapperProps: Record<string, string | number> = {
    [`data-${adapter.themeKey}-environment`]: "true",
    "data-quality-tier": resolvedQuality,
    "data-seed": seed,
    "data-time": fixedTimestamp ?? 0,
    "data-frame-budget": adapter.frameBudgetMs[resolvedQuality],
    [`data-${adapter.themeKey}-zoom`]: cameraRef.current.zoom.toFixed(2),
    [`data-${adapter.themeKey}-node-count`]: nodes.length,
  };

  return {
    canvasRef,
    resolvedQuality,
    seed,
    nodes,
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
  };
}
