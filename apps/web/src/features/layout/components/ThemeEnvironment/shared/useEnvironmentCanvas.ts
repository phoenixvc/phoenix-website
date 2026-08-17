import { useEffect, useRef, type DependencyList, type RefObject } from "react";

export interface EnvironmentDrawInfo {
  width: number;
  height: number;
  /** Deterministic-fixture-aware elapsed time, in ms since mount. */
  timeMs: number;
  /** Wall-clock delta since the previous paint, clamped to 100ms, in seconds. */
  deltaSeconds: number;
}

export interface UseEnvironmentCanvasOptions {
  /** Paints one frame. Receives the live 2D context and frame timing info. */
  draw: (ctx: CanvasRenderingContext2D, info: EnvironmentDrawInfo) => void;
  /**
   * Whether the animation loop should keep requesting frames right now.
   * Callers derive this from their own paused/reducedMotion/qualityTier
   * rules — the hook only owns the loop mechanics, not the policy. When
   * false, one frame paints and the loop stops until this flips back to
   * true (or `repaint()` is called imperatively).
   */
  isRunning: boolean;
  /**
   * Minimum ms between draw() calls while the loop is running. 0 (default)
   * paints on every animation frame; pass a theme's own throttle cadence
   * (e.g. 1000/30) to reproduce its existing frame-budget behavior.
   */
  frameThrottleMs?: number;
  /**
   * A deterministic timestamp (Playwright fixture / visual-regression
   * mode). When set, draw() is called exactly once with this value and the
   * RAF loop never starts, regardless of `isRunning`.
   */
  fixedTimestamp?: number;
  /** 2D context alpha option. Every current theme paints opaque (false). */
  alpha?: boolean;
  /**
   * When true, a resize while the loop isn't running (`isRunning` false)
   * triggers an immediate repaint instead of leaving the canvas showing
   * pre-resize content. Themes whose static tiers already force a
   * repaint-on-resize should opt in explicitly; default is off so themes
   * that never did this keep their exact prior behavior.
   */
  repaintOnResizeWhenIdle?: boolean;
  /** Extra values that should re-run the setup effect (scene, nodes, ...). */
  deps?: DependencyList;
}

export interface UseEnvironmentCanvasResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Imperative repaint — for themes that need to force a redraw outside the loop (e.g. after a camera change while a static quality tier isn't running its own loop). */
  repaint: () => void;
}

/**
 * Shared canvas-lifecycle primitive for `ThemeEnvironment/*Environment.tsx`.
 *
 * Owns the boilerplate every theme previously hand-rolled identically: a
 * canvas ref, DPR-aware resize (+ resize listener), and a requestAnimationFrame
 * loop that respects a caller-supplied running/throttle policy. It does NOT
 * own pointer/click/wheel interaction wiring or scene/camera state — those
 * differ enough per theme (canvas-scoped vs window-scoped listeners, hit
 * testing, camera lerp) that folding them in here would change behavior
 * rather than just deduplicate it. Themes keep their own interaction
 * effects and pass their per-frame drawing through `draw`.
 */
export function useEnvironmentCanvas({
  draw,
  isRunning,
  frameThrottleMs = 0,
  fixedTimestamp,
  alpha = false,
  repaintOnResizeWhenIdle = false,
  deps = [],
}: UseEnvironmentCanvasOptions): UseEnvironmentCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const repaintRef = useRef<() => void>(() => {});
  // Read through a ref inside the effect below rather than closing over
  // `draw` directly: `draw` is intentionally excluded from the effect's own
  // deps (callers already re-run it via `deps`), so a stale closure would
  // silently paint with last-setup's `draw` for one frame after `draw`
  // itself changes but nothing else in `deps` did.
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d", { alpha });
    if (!context) {
      return undefined;
    }

    let frameId = 0;
    let lastMark = 0;
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
      drawRef.current(context, {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        timeMs,
        deltaSeconds,
      });
    };

    repaintRef.current = (): void => paint(fixedTimestamp ?? performance.now());

    const tick = (timestamp: number): void => {
      if (frameThrottleMs === 0 || timestamp - lastMark >= frameThrottleMs) {
        paint(timestamp);
        lastMark = timestamp;
      }
      if (isRunning && fixedTimestamp === undefined) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    resize();
    // Always paint once on mount/setup, independent of isRunning, so the
    // canvas never shows a blank frame before the loop (if any) kicks in.
    paint(performance.now());
    if (isRunning && fixedTimestamp === undefined) {
      frameId = window.requestAnimationFrame(tick);
    }

    const handleResize = (): void => {
      resize();
      if (repaintOnResizeWhenIdle && (!isRunning || fixedTimestamp !== undefined)) {
        paint(fixedTimestamp ?? performance.now());
      }
    };
    window.addEventListener("resize", handleResize);

    return (): void => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      repaintRef.current = (): void => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, frameThrottleMs, fixedTimestamp, alpha, repaintOnResizeWhenIdle, ...deps]);

  return {
    canvasRef,
    repaint: (): void => repaintRef.current(),
  };
}
