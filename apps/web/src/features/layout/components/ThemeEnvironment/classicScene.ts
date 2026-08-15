import type { EnvironmentQualityTier } from "./types";
import {
  type ClassicCamera,
  type ClassicNode,
  worldToScreen,
} from "./classicWorld";

export const CLASSIC_FRAME_BUDGET_MS = {
  low: 0,
  medium: 6,
  high: 8,
} as const;

export const CLASSIC_DEFAULT_SEED = 20260818;

export interface ClassicPointer {
  x: number;
  y: number;
}

export interface ClassicGridLine {
  offset: number;
  axis: "x" | "y";
  major: boolean;
}

export interface ClassicScene {
  seed: number;
  gridStep: number;
}

export interface DrawClassicSceneOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: ClassicScene;
  nodes: ClassicNode[];
  camera: ClassicCamera;
  focusedNode?: ClassicNode | null;
  hoveredNode?: ClassicNode | null;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: ClassicPointer | null;
  reducedMotion: boolean;
  pinnedNodes?: ClassicNode[];
  scrollY?: number;
  modeProgress?: number;
}

export const createClassicScene = (
  seed: number,
  _qualityTier: EnvironmentQualityTier,
): ClassicScene => {
  return {
    seed,
    gridStep: 48,
  };
};

export const drawClassicScene = ({
  ctx,
  width,
  height,
  scene: _scene,
  nodes,
  camera,
  focusedNode: _focusedNode,
  hoveredNode,
  timeMs,
  isDarkMode,
  qualityTier: _qualityTier,
  pointer,
  reducedMotion,
  pinnedNodes = [],
  scrollY = 0,
  modeProgress = isDarkMode ? 1.0 : 0.0,
}: DrawClassicSceneOptions): void => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const t = timeMs * 0.001;
  const parallaxX = pointer && !reducedMotion ? (pointer.x - width * 0.5) * 0.03 : 0;
  const parallaxY = pointer && !reducedMotion ? (pointer.y - height * 0.5) * 0.03 : 0;

  // 1. Blueprint Background Canvas
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (modeProgress > 0.5) {
    // Dark Engineering Blueprint (#090D16 -> #0D1322)
    bgGrad.addColorStop(0, "#070B12");
    bgGrad.addColorStop(0.5, "#0A0F1A");
    bgGrad.addColorStop(1, "#080C14");
  } else {
    // Light Drafting Paper (#F8FAFC -> #F1F5F9)
    bgGrad.addColorStop(0, "#F8FAFC");
    bgGrad.addColorStop(0.5, "#F1F5F9");
    bgGrad.addColorStop(1, "#E2E8F0");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Precision Architectural Grid
  ctx.save();
  const gridSpacing = 44 * camera.zoom;
  const offsetX = (width * 0.5 - camera.cx * width * camera.zoom + parallaxX) % gridSpacing;
  const offsetY =
    (height * 0.5 - camera.cy * height * camera.zoom - scrollY * 0.15 + parallaxY) % gridSpacing;

  const minorGridColor =
    modeProgress > 0.5 ? "rgba(56, 189, 248, 0.07)" : "rgba(2, 132, 199, 0.08)";
  const majorGridColor =
    modeProgress > 0.5 ? "rgba(56, 189, 248, 0.18)" : "rgba(2, 132, 199, 0.2)";

  // Vertical lines
  for (let x = offsetX - gridSpacing; x <= width + gridSpacing; x += gridSpacing) {
    const isMajor = Math.floor((x - offsetX) / gridSpacing) % 4 === 0;
    ctx.strokeStyle = isMajor ? majorGridColor : minorGridColor;
    ctx.lineWidth = isMajor ? 1.0 : 0.6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = offsetY - gridSpacing; y <= height + gridSpacing; y += gridSpacing) {
    const isMajor = Math.floor((y - offsetY) / gridSpacing) % 4 === 0;
    ctx.strokeStyle = isMajor ? majorGridColor : minorGridColor;
    ctx.lineWidth = isMajor ? 1.0 : 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Pointer Orthographic Alignment Crosshair
  if (pointer && !reducedMotion) {
    ctx.save();
    ctx.strokeStyle =
      modeProgress > 0.5 ? "rgba(56, 189, 248, 0.35)" : "rgba(2, 132, 199, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Horizontal crosshair
    ctx.beginPath();
    ctx.moveTo(0, pointer.y);
    ctx.lineTo(width, pointer.y);
    ctx.stroke();

    // Vertical crosshair
    ctx.beginPath();
    ctx.moveTo(pointer.x, 0);
    ctx.lineTo(pointer.x, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small center reticle
    ctx.strokeStyle =
      modeProgress > 0.5 ? "rgba(56, 189, 248, 0.7)" : "rgba(2, 132, 199, 0.8)";
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Vector Schematic Dimensions & Connecting Lines
  ctx.save();
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const posA = worldToScreen(nodeA.x, nodeA.y, width, height, camera);
      const posB = worldToScreen(nodeB.x, nodeB.y, width, height, camera);
      const dx = posA.x - posB.x;
      const dy = posA.y - posB.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < width * 0.38) {
        const lineAlpha = (1 - dist / (width * 0.38)) * 0.28;
        ctx.strokeStyle =
          modeProgress > 0.5
            ? `rgba(56, 189, 248, ${lineAlpha})`
            : `rgba(2, 132, 199, ${lineAlpha * 0.9})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.lineTo(posB.x, posB.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  ctx.restore();

  // 5. Blueprint Precision Vector Nodes
  nodes.forEach((node) => {
    ctx.save();
    const pos = worldToScreen(node.x, node.y, width, height, camera);
    const isHovered = hoveredNode?.id === node.id;
    const isPinned = pinnedNodes.some((p) => p.id === node.id);

    const baseRadius = node.radius * pos.scale;
    const radius = isHovered ? baseRadius * 1.2 : baseRadius;

    // Outer Drafting Compass Reticle
    const rot = reducedMotion ? 0 : t * 0.4 + node.x * 5;
    const ringRadius = radius * (1.4 + (isPinned ? 0.3 : 0));

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rot);

    ctx.strokeStyle = isPinned ? "#38BDF8" : node.accent;
    ctx.lineWidth = isPinned ? 2.0 : 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 1.5);
    ctx.stroke();

    // Small tick marks
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const tx = Math.cos(angle) * ringRadius;
      const ty = Math.sin(angle) * ringRadius;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx * 1.12, ty * 1.12);
      ctx.stroke();
    }
    ctx.restore();

    // Core Solid Geometric Marker
    ctx.fillStyle = modeProgress > 0.5 ? "#090D16" : "#FFFFFF";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = node.accent;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Center crosshair in node
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x - radius * 0.5, pos.y);
    ctx.lineTo(pos.x + radius * 0.5, pos.y);
    ctx.moveTo(pos.x, pos.y - radius * 0.5);
    ctx.lineTo(pos.x, pos.y + radius * 0.5);
    ctx.stroke();

    // Node label
    ctx.fillStyle = modeProgress > 0.5 ? "#F8FAFC" : "#0F172A";
    ctx.font = `600 ${Math.max(11, Math.floor(13 * pos.scale))}px "Plus Jakarta Sans", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.name, pos.x, pos.y + radius + 14 * pos.scale);

    ctx.restore();
  });

  ctx.restore();
};
