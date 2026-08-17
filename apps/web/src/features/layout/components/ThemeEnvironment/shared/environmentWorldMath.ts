/**
 * Shared geometry/camera primitives for the Ocean/Cloud/Lavender/Classic
 * quartet's `*World.ts` files. Each theme previously carried a
 * byte-identical copy of `ringPoint`, `worldToScreen`, its node
 * hit-testing loop, and its camera lerp — differing only in the Camera/
 * Node type names used in their signatures. The quartet's actual content
 * (node labels, colors, kind vocabulary, ring layout numbers) stays in
 * each theme's own `*World.ts`; only this pure math is shared.
 */

export interface EnvironmentCamera {
  cx: number;
  cy: number;
  zoom: number;
  target?: {
    cx: number;
    cy: number;
    zoom: number;
  };
}

/** Every quartet theme's `X_OVERVIEW_CAMERA` was this same literal. */
export const ENVIRONMENT_OVERVIEW_CAMERA: EnvironmentCamera = {
  cx: 0.5,
  cy: 0.5,
  zoom: 1,
};

/**
 * Fields every quartet node shares beyond its own `kind` vocabulary and
 * per-theme z-axis field (Ocean's `depth`, Cloud's `altitude`, Lavender's
 * `bloom`, Classic's `elevation` — kept per-theme since they're distinct
 * property names, not just distinct values).
 */
export interface EnvironmentNodeBase {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  x: number;
  y: number;
  radius: number;
  accent: string;
  glow: string;
  href: string;
  metric?: string;
  parentId?: string;
  initials?: string;
}

export const ringPoint = (
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number,
  offset = -Math.PI / 2,
): { x: number; y: number } => {
  const angle = offset + (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
};

export const worldToScreen = <TCamera extends EnvironmentCamera>(
  x: number,
  y: number,
  width: number,
  height: number,
  camera: TCamera,
): { x: number; y: number; scale: number } => {
  const scale = camera.zoom;
  const screenX = width * 0.5 + (x - camera.cx) * width * scale;
  const screenY = height * 0.5 + (y - camera.cy) * height * scale;
  return { x: screenX, y: screenY, scale };
};

export const pickEnvironmentNode = <
  TNode extends { x: number; y: number; radius: number },
  TCamera extends EnvironmentCamera,
>(
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: TCamera,
  nodes: TNode[],
): TNode | null => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const pos = worldToScreen(node.x, node.y, width, height, camera);
    const hitRadius = (node.radius + 14) * pos.scale;
    const dx = screenX - pos.x;
    const dy = screenY - pos.y;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      return node;
    }
  }
  return null;
};

export const lerpEnvironmentCamera = <TCamera extends EnvironmentCamera>(
  camera: TCamera,
  speed = 0.08,
): TCamera => {
  const target = camera.target ?? {
    cx: camera.cx,
    cy: camera.cy,
    zoom: camera.zoom,
  };
  const cx = camera.cx + (target.cx - camera.cx) * speed;
  const cy = camera.cy + (target.cy - camera.cy) * speed;
  const zoom = camera.zoom + (target.zoom - camera.zoom) * speed;
  return {
    ...camera,
    cx,
    cy,
    zoom,
    target: camera.target,
  };
};
