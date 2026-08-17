import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import type { TooltipState } from "./useNodeDock";

export interface DockableTooltipNode {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  metric?: string;
}

/**
 * A theme's CSS-module import (Vite types this as an index-signature
 * `CSSModuleClasses`, so this stays structurally loose rather than a named
 * interface). Every quartet theme (Ocean/Cloud/Lavender/Classic) already
 * defines the same class names below identically — only the rule bodies
 * (colors, blur, accent) differ per theme:
 *
 * tooltip, tooltipTitle, tooltipSubtitle, tooltipDescription, tooltipFooter,
 * tooltipMetric, tooltipPinButton, dock, dockHeader, dockTitle,
 * dockCloseAll, dockCard, dockCardHeader, dockCardName, dockCardRemove,
 * dockCardDescription, dockCardActions, dockFocusBtn.
 *
 * Passing the theme's own `styles` import through keeps each theme
 * visually distinct without re-implementing this markup four times.
 */
export type EnvironmentDockStyles = Readonly<Record<string, string>>;

export interface EnvironmentTooltipDockProps<TNode extends DockableTooltipNode> {
  styles: EnvironmentDockStyles;
  tooltip: TooltipState<TNode> | null;
  pinnedNodes: TNode[];
  /** e.g. "Abyssal Watch" (Ocean) / "Flora Watch" (Lavender) — the one genuinely per-theme string in this pattern. */
  dockLabel: string;
  onTogglePin: (node: TNode) => void;
  onUnpin: (nodeId: string) => void;
  onCloseAllPinned: () => void;
  onFocusNode: (node: TNode) => void;
  onResetCamera: () => void;
}

/**
 * Shared hover-tooltip + pinned-node "dock" UI for the Ocean/Cloud/Lavender/
 * Classic quartet (previously ~80 lines of verbatim-identical JSX per
 * theme, `OceanEnvironment.tsx:364-444` and three renamed copies). Buttons
 * route through the design-system `Button` (ghost variant, so each theme's
 * own CSS module classes keep full control of appearance) instead of raw
 * `<button className={styles....}>` elements.
 */
export function EnvironmentTooltipDock<TNode extends DockableTooltipNode>({
  styles,
  tooltip,
  pinnedNodes,
  dockLabel,
  onTogglePin,
  onUnpin,
  onCloseAllPinned,
  onFocusNode,
  onResetCamera,
}: EnvironmentTooltipDockProps<TNode>): ReactElement {
  return (
    <>
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className={styles.tooltipTitle}>
            <span>{tooltip.node.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="unstyled"
              className={styles.tooltipPinButton}
              onClick={() => onTogglePin(tooltip.node)}
            >
              {pinnedNodes.some((p) => p.id === tooltip.node.id)
                ? "Unpin"
                : "Pin Node"}
            </Button>
          </div>
          <div className={styles.tooltipSubtitle}>{tooltip.node.subtitle}</div>
          <div className={styles.tooltipDescription}>
            {tooltip.node.description}
          </div>
          <div className={styles.tooltipFooter}>
            <span className={styles.tooltipMetric}>{tooltip.node.metric}</span>
            <Button
              type="button"
              variant="ghost"
              size="unstyled"
              className={styles.tooltipPinButton}
              onClick={() => onFocusNode(tooltip.node)}
            >
              Focus View
            </Button>
          </div>
        </div>
      )}

      {pinnedNodes.length > 0 && (
        <div className={styles.dock}>
          <div className={styles.dockHeader}>
            <span className={styles.dockTitle}>
              {dockLabel} ({pinnedNodes.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="unstyled"
              className={styles.dockCloseAll}
              onClick={onCloseAllPinned}
            >
              Close All
            </Button>
          </div>
          {pinnedNodes.map((pNode) => (
            <div key={pNode.id} className={styles.dockCard}>
              <div className={styles.dockCardHeader}>
                <span className={styles.dockCardName}>{pNode.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="unstyled"
                  className={styles.dockCardRemove}
                  onClick={() => onUnpin(pNode.id)}
                >
                  ×
                </Button>
              </div>
              <p className={styles.dockCardDescription}>{pNode.description}</p>
              <div className={styles.dockCardActions}>
                <Button
                  type="button"
                  variant="ghost"
                  size="unstyled"
                  className={styles.dockFocusBtn}
                  onClick={() => onFocusNode(pNode)}
                >
                  Center
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="unstyled"
                  className={styles.dockFocusBtn}
                  onClick={onResetCamera}
                >
                  Reset
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
