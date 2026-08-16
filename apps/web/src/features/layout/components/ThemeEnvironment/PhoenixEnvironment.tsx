import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { Button } from "@/components/ui/button";
import type {
  EnvironmentMotionMode,
  EnvironmentQualityTier,
} from "./types";
import {
  PHOENIX_DEFAULT_SEED,
  PHOENIX_FRAME_BUDGET_MS,
  createPhoenixScene,
  drawPhoenixScene,
  type PhoenixDragSpark,
  type PhoenixPointer,
} from "./phoenixScene";
import {
  PHOENIX_OVERVIEW_CAMERA,
  createPhoenixNodes,
  lerpPhoenixCamera,
  pickPhoenixNode,
  worldToScreen,
  type PhoenixCamera,
  type PhoenixNode,
} from "./phoenixWorld";
import { useEnvironmentCanvas, resolveEnvironmentQualityTier } from "./shared";
import styles from "./phoenixEnvironment.module.css";

export interface PhoenixEnvironmentProps {
  isDarkMode: boolean;
  motionMode?: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused?: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

interface TooltipState {
  node: PhoenixNode;
  x: number;
  y: number;
}

const SPARK_COLORS = ["#fffbeb", "#fbbf24", "#f97316", "#ef4444", "#fed7aa"];

let cachedAudioCtx: AudioContext | null = null;
const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!cachedAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      cachedAudioCtx = new AudioCtx();
    }
  }
  if (cachedAudioCtx && cachedAudioCtx.state === "suspended") {
    cachedAudioCtx.resume().catch(() => {});
  }
  return cachedAudioCtx;
};

const playEmberChime = (type: "pin" | "focus" = "pin"): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    if (type === "pin") {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Audio autoplay gracefully handled
  }
  try {
    navigator?.vibrate?.(12);
  } catch {
    // Ignore haptic fallback
  }
};

export const PhoenixEnvironment = ({
  isDarkMode,
  motionMode = "full",
  qualityTier = "high",
  paused,
  randomSeed,
  fixedTimestamp,
}: PhoenixEnvironmentProps): ReactElement => {
  const pointerRef = useRef<PhoenixPointer | null>(null);
  const isDraggingRef = useRef(false);
  const dragSparksRef = useRef<PhoenixDragSpark[]>([]);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredNodeRef = useRef<PhoenixNode | null>(null);
  const cameraRef = useRef<PhoenixCamera>({ ...PHOENIX_OVERVIEW_CAMERA });
  const scrollYRef = useRef<number>(0);
  const modeProgressRef = useRef<number>(isDarkMode ? 1.0 : 0.0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [pinnedNodes, setPinnedNodes] = useState<PhoenixNode[]>([]);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const reducedMotion = motionMode === "reduced";
  const seed = randomSeed ?? PHOENIX_DEFAULT_SEED;
  const resolvedQuality = useMemo(
    () => resolveEnvironmentQualityTier(qualityTier),
    [qualityTier],
  );
  const scene = useMemo(
    () => createPhoenixScene(seed, resolvedQuality),
    [seed, resolvedQuality],
  );
  const nodes = useMemo(() => createPhoenixNodes(), []);
  const pinnedNodesRef = useRef<PhoenixNode[]>([]);
  pinnedNodesRef.current = pinnedNodes;

  const handleTogglePin = (node: PhoenixNode): void => {
    playEmberChime("pin");
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

  const handleFocusNode = (node: PhoenixNode): void => {
    playEmberChime("focus");
    cameraRef.current = {
      ...cameraRef.current,
      target: { cx: node.x, cy: node.y, zoom: 1.5 },
    };
  };

  const handleResetCamera = (): void => {
    cameraRef.current = {
      ...cameraRef.current,
      target: { cx: 0.5, cy: 0.5, zoom: 1 },
    };
  };

  const isRunning = !paused && !reducedMotion && fixedTimestamp === undefined;
  const frameThrottleMs =
    PHOENIX_FRAME_BUDGET_MS[resolvedQuality] === 0 ? 0 : 1000 / 30;

  const updateSparks = (deltaSeconds: number): void => {
    const sparks = dragSparksRef.current;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= deltaSeconds;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx;
      s.y += s.vy;
      s.vy -= 0.12 * deltaSeconds * 60; // Thermal rise
      s.rotation += s.spin;
    }
  };

  const { canvasRef } = useEnvironmentCanvas({
    isRunning,
    frameThrottleMs,
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

      if (isRunning) {
        cameraRef.current = lerpPhoenixCamera(cameraRef.current);
        updateSparks(deltaSeconds);
      }

      drawPhoenixScene({
        ctx: context,
        width,
        height,
        scene,
        timeMs,
        isDarkMode,
        qualityTier: resolvedQuality,
        pointer: reducedMotion || paused ? null : pointerRef.current,
        reducedMotion,
        camera: cameraRef.current,
        nodes,
        hoveredNode: hoveredNodeRef.current,
        dragSparks: dragSparksRef.current,
        scrollY: scrollYRef.current,
        modeProgress: modeProgressRef.current,
        pinnedNodeIds: pinnedNodesRef.current.map((n) => n.id),
      });
    },
    deps: [isDarkMode, nodes, paused, reducedMotion, resolvedQuality, scene],
  });

  useEffect(() => {
    const spawnDragSpark = (
      x: number,
      y: number,
      vx: number,
      vy: number,
    ): void => {
      if (reducedMotion || paused || dragSparksRef.current.length > 45) return;
      const color =
        SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      dragSparksRef.current.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: vx * 0.35 + (Math.random() - 0.5) * 1.5,
        vy: vy * 0.35 - (0.5 + Math.random() * 1.2),
        length: 12 + Math.random() * 18,
        width: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25,
        curve: (Math.random() - 0.5) * 0.6,
        color,
        life: 0.8 + Math.random() * 0.6,
        maxLife: 1.4,
      });
    };

    const handleGlobalPointerDown = (event: PointerEvent): void => {
      // Don't drag if clicking an interactive element
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(`.${styles.nodeTooltip}`) ||
        target?.closest(`.${styles.pinnedDock}`)
      ) {
        return;
      }

      const canvasEl = canvasRef.current;
      if (canvasEl) {
        const picked = pickPhoenixNode(
          event.clientX,
          event.clientY,
          nodes,
          cameraRef.current,
          canvasEl.clientWidth,
          canvasEl.clientHeight,
        );
        if (picked) {
          handleTogglePin(picked);
          return;
        }
      }

      isDraggingRef.current = true;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      spawnDragSpark(event.clientX, event.clientY, 0, -2);
    };

    const handleGlobalPointerUp = (): void => {
      isDraggingRef.current = false;
      lastPointerRef.current = null;
    };

    const handleGlobalPointerMove = (event: PointerEvent): void => {
      if (reducedMotion || paused) {
        return;
      }
      const canvasEl = canvasRef.current;
      pointerRef.current = { x: event.clientX, y: event.clientY };

      if (isDraggingRef.current && lastPointerRef.current) {
        const vx = event.clientX - lastPointerRef.current.x;
        const vy = event.clientY - lastPointerRef.current.y;
        const dist = Math.hypot(vx, vy);
        if (dist > 3) {
          spawnDragSpark(event.clientX, event.clientY, vx, vy);
          spawnDragSpark(event.clientX, event.clientY, vx * 0.6, vy * 0.6);
        }
      }
      lastPointerRef.current = { x: event.clientX, y: event.clientY };

      if (canvasEl) {
        const picked = pickPhoenixNode(
          event.clientX,
          event.clientY,
          nodes,
          cameraRef.current,
          canvasEl.clientWidth,
          canvasEl.clientHeight,
        );
        hoveredNodeRef.current = picked;
        // Pinned nodes already have their full detail showing in the dock
        // — re-showing the hover tooltip on top of it duplicates the
        // content and, for nodes near the dock's fixed top-right position,
        // visually collides with it. The canvas glyph itself already marks
        // pinned nodes (via pinnedNodeIds passed into drawPhoenixScene).
        const isPinned = pinnedNodesRef.current.some(
          (p) => p.id === picked?.id,
        );
        if (picked && !isPinned) {
          const screen = worldToScreen(
            picked.x,
            picked.y,
            cameraRef.current,
            canvasEl.clientWidth,
            canvasEl.clientHeight,
          );
          setTooltip({ node: picked, x: screen.x, y: screen.y });
        } else {
          setTooltip(null);
        }
      }
    };

    const handleScroll = (): void => {
      scrollYRef.current = window.scrollY || 0;
    };

    const handleGlobalPointerLeave = (): void => {
      pointerRef.current = null;
      hoveredNodeRef.current = null;
      isDraggingRef.current = false;
      lastPointerRef.current = null;
      setTooltip(null);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointerdown", handleGlobalPointerDown, {
      passive: true,
    });
    window.addEventListener("pointerup", handleGlobalPointerUp, {
      passive: true,
    });
    window.addEventListener("pointermove", handleGlobalPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerleave", handleGlobalPointerLeave, {
      passive: true,
    });

    return (): void => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerleave", handleGlobalPointerLeave);
    };
  }, [canvasRef, nodes, paused, reducedMotion]);

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
        data-phoenix-focus="overview"
        data-phoenix-node-count={nodes.length}
      >
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

        {/* Pinned Projects Dock */}
        {pinnedNodes.length > 0 &&
          (isDockCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              className={styles.collapseTogglePill}
              onClick={() => setIsDockCollapsed(false)}
              title="Expand pinned sectors"
            >
              &#x1f4cc; {pinnedNodes.length} Pinned Sectors &#x25be;
            </Button>
          ) : (
            <div className={styles.pinnedDock}>
              <div className={styles.dockControlsHeader}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Button
                    type="button"
                    variant="ghost"
                    className={styles.actionIconBtn}
                    onClick={handleResetCamera}
                    title="Reset starfield camera to overview"
                  >
                    Overview &#x29bf;
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={styles.actionIconBtn}
                    onClick={() => setIsDockCollapsed(true)}
                    title="Minimize dock"
                  >
                    Minimize &mdash;
                  </Button>
                </div>
                {pinnedNodes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className={styles.closeAllButton}
                    onClick={handleCloseAllPinned}
                  >
                    Close All ({pinnedNodes.length})
                  </Button>
                )}
              </div>
              {pinnedNodes.map((node) => (
                <div key={node.id} className={styles.pinnedCard}>
                  <div className={styles.tooltipHeader}>
                    <span className={styles.tooltipBadge}>
                      {node.kind === "sanctuary"
                        ? "Solar Sanctuary"
                        : node.kind === "altar"
                          ? "Focus Altar"
                          : "Portfolio Beacon"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.unpinButton}
                      onClick={() => handleUnpin(node.id)}
                      aria-label={`Unpin ${node.name}`}
                      title="Unpin project"
                    >
                      &times;
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className={styles.cardFocusBtn}
                    onClick={() => handleFocusNode(node)}
                    title="Center celestial starfield on this beacon"
                  >
                    <h4 className={styles.tooltipTitle}>{node.name}</h4>
                  </Button>
                  <p className={styles.tooltipDesc}>{node.description}</p>
                  {node.href && (
                    <a href={node.href} className={styles.tooltipLink}>
                      Explore Sector &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          ))}

        {/* Hover Tooltip */}
        {tooltip && (
          <div
            className={styles.nodeTooltip}
            style={{
              left: `${Math.max(130, Math.min(window.innerWidth - 130, tooltip.x))}px`,
              top: `${tooltip.y}px`,
            }}
          >
            <div className={styles.tooltipHeader}>
              <span className={styles.tooltipBadge}>
                {tooltip.node.kind === "sanctuary"
                  ? "Solar Sanctuary"
                  : tooltip.node.kind === "altar"
                    ? "Focus Altar"
                    : "Portfolio Beacon"}
              </span>
              <Button
                type="button"
                variant="ghost"
                className={styles.pinButton}
                onClick={() => handleTogglePin(tooltip.node)}
                title={
                  pinnedNodes.some((p) => p.id === tooltip.node.id)
                    ? "Unpin project"
                    : "Pin to screen"
                }
              >
                {pinnedNodes.some((p) => p.id === tooltip.node.id)
                  ? "Pinned ✓"
                  : "Pin ◆"}
              </Button>
            </div>
            <h4 className={styles.tooltipTitle}>{tooltip.node.name}</h4>
            <p className={styles.tooltipDesc}>{tooltip.node.description}</p>
            {tooltip.node.href && (
              <a href={tooltip.node.href} className={styles.tooltipLink}>
                Explore Sector &rarr;
              </a>
            )}
          </div>
        )}

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
    </>
  );
};

PhoenixEnvironment.displayName = "PhoenixEnvironment";

export default PhoenixEnvironment;
