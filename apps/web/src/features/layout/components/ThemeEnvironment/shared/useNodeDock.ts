import { useState, type MutableRefObject } from "react";

export interface DockCameraTarget {
  cx: number;
  cy: number;
  zoom: number;
}

export interface DockCameraState {
  target?: DockCameraTarget;
  cx: number;
  cy: number;
  zoom: number;
}

export interface DockableNode {
  id: string;
  x: number;
  y: number;
}

export interface TooltipState<TNode> {
  node: TNode;
  x: number;
  y: number;
}

export interface UseNodeDockOptions<TNode extends DockableNode> {
  /** The theme's own camera ref — mutated directly, exactly as each theme already does. */
  cameraRef: MutableRefObject<DockCameraState>;
  /** Zoom level applied when focusing a node. Every current quartet theme uses 1.45. */
  focusZoom?: number;
  /** Target used by "reset"/"close all". Every current quartet theme hardcodes {0.5, 0.5, 1}. */
  overviewCamera?: DockCameraTarget;
  /** Optional sound/haptic hook, called on pin/unpin toggle (e.g. a theme's chime). */
  onPin?: (node: TNode) => void;
  /** Optional sound/haptic hook, called when a node is focused. */
  onFocus?: (node: TNode) => void;
}

export interface UseNodeDockResult<TNode> {
  tooltip: TooltipState<TNode> | null;
  setTooltip: (tooltip: TooltipState<TNode> | null) => void;
  pinnedNodes: TNode[];
  handleTogglePin: (node: TNode) => void;
  handleUnpin: (nodeId: string) => void;
  handleCloseAllPinned: () => void;
  handleFocusNode: (node: TNode) => void;
  handleResetCamera: () => void;
}

/**
 * Shared tooltip + pinned-node "dock" state and handlers for the
 * Ocean/Cloud/Lavender/Classic quartet, which previously carried four
 * verbatim copies of this exact state shape and handler set (differing
 * only in renamed types and a chime function). Rendering stays with
 * `EnvironmentTooltipDock`; scene/camera math stays with each theme.
 */
export function useNodeDock<TNode extends DockableNode>({
  cameraRef,
  focusZoom = 1.45,
  overviewCamera = { cx: 0.5, cy: 0.5, zoom: 1 },
  onPin,
  onFocus,
}: UseNodeDockOptions<TNode>): UseNodeDockResult<TNode> {
  const [tooltip, setTooltip] = useState<TooltipState<TNode> | null>(null);
  const [pinnedNodes, setPinnedNodes] = useState<TNode[]>([]);

  const handleTogglePin = (node: TNode): void => {
    onPin?.(node);
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
      target: { ...overviewCamera },
    };
  };

  const handleFocusNode = (node: TNode): void => {
    onFocus?.(node);
    cameraRef.current = {
      ...cameraRef.current,
      target: { cx: node.x, cy: node.y, zoom: focusZoom },
    };
  };

  const handleResetCamera = (): void => {
    cameraRef.current = {
      ...cameraRef.current,
      target: { ...overviewCamera },
    };
  };

  return {
    tooltip,
    setTooltip,
    pinnedNodes,
    handleTogglePin,
    handleUnpin,
    handleCloseAllPinned,
    handleFocusNode,
    handleResetCamera,
  };
}
