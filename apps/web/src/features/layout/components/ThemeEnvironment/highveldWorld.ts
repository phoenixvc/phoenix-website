import {
  FOCUS_AREA_CONFIG,
  PORTFOLIO_PROJECTS,
} from "@/constants/portfolioData";

export type HighveldNodeKind = "koppie" | "thorn" | "pan";

export interface HighveldNode {
  id: string;
  kind: HighveldNodeKind;
  name: string;
  description: string;
  href: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  parentId?: string;
  initials?: string;
}

export interface HighveldCamera {
  cx: number;
  cy: number;
  zoom: number;
  target?: Pick<HighveldCamera, "cx" | "cy" | "zoom">;
}

export const HIGHVELD_OVERVIEW_CAMERA: HighveldCamera = {
  cx: 0.5,
  cy: 0.52,
  zoom: 1,
};

export const HIGHVELD_KOPPIE_ZOOM = 2.35;
export const HIGHVELD_DETAIL_ZOOM = 3.7;

/**
 * World y doubles as depth: 0.55 reads as far plateau, 0.9 as the near field.
 * The horizon sits here so koppies break it the way they do on the real thing.
 */
export const HIGHVELD_HORIZON_Y = 0.62;

/**
 * Rings of nodes sit on a receding ground plane, so the vertical radius is
 * squashed. Without this the "ring" reads as a circle painted on glass.
 */
const GROUND_PLANE_SQUASH = 0.42;

const groundRingPoint = (
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
    y: cy + Math.sin(angle) * radius * GROUND_PLANE_SQUASH,
  };
};

export const createHighveldNodes = (): HighveldNode[] => {
  // All three koppies sit on the horizon, where they break the skyline the way
  // they do on the real plateau. Interactive nodes spread across the near
  // plain in front of them — anything placed above HIGHVELD_HORIZON_Y would
  // render in the sky.
  const koppies: HighveldNode[] = [
    {
      id: "focus-areas-koppie",
      kind: "koppie",
      name: "Focus Koppies",
      description: "Investment sectors rising off the plateau",
      href: "/#focus-areas",
      x: 0.24,
      y: 0.635,
      radius: 0.09,
      color: "#9C6B3F",
    },
    {
      id: "portfolio-koppie",
      kind: "koppie",
      name: "Portfolio Ridge",
      description: "Portfolio companies along the ridgeline",
      href: "/portfolio",
      x: 0.72,
      y: 0.625,
      radius: 0.1,
      color: "#C8912F",
    },
    {
      id: "information-koppie",
      kind: "koppie",
      name: "The Homestead",
      description: "Company stories, notes, and contact",
      href: "/about",
      x: 0.46,
      y: 0.645,
      radius: 0.07,
      color: "#8A6A4A",
    },
  ];

  const focusAreas = Object.values(FOCUS_AREA_CONFIG);
  const thorns: HighveldNode[] = focusAreas.map((area, index) => {
    const point = groundRingPoint(0.24, 0.7, 0.14, index, focusAreas.length);
    return {
      id: `${area.id}-thorn`,
      kind: "thorn",
      name: area.label,
      description: area.description,
      href: "/#focus-areas",
      x: point.x,
      y: point.y,
      radius: 0.034,
      color: area.color,
      parentId: "focus-areas-koppie",
      initials: area.label
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2),
    };
  });

  const projects = PORTFOLIO_PROJECTS.filter(
    (project) => project.listed !== false,
  );
  const pans: HighveldNode[] = projects.map((project, index) => {
    const point = groundRingPoint(0.68, 0.77, 0.19, index, projects.length);
    return {
      id: project.id,
      kind: "pan",
      name: project.name,
      description: project.tagline || project.title,
      href: `/portfolio/${project.id}`,
      x: point.x,
      y: point.y,
      radius: 0.022 + Math.min((project.mass || 100) / 8000, 0.012),
      color: project.color,
      parentId: "portfolio-koppie",
      initials: project.initials,
    };
  });

  return [...koppies, ...thorns, ...pans];
};

export const lerpHighveldCamera = (
  camera: HighveldCamera,
  smoothing = 0.12,
): HighveldCamera => {
  if (!camera.target) {
    return camera;
  }

  const next: HighveldCamera = {
    cx: camera.cx + (camera.target.cx - camera.cx) * smoothing,
    cy: camera.cy + (camera.target.cy - camera.cy) * smoothing,
    zoom: camera.zoom + (camera.target.zoom - camera.zoom) * smoothing,
    target: camera.target,
  };

  if (
    Math.abs(next.zoom - camera.target.zoom) < 0.01 &&
    Math.abs(next.cx - camera.target.cx) < 0.002 &&
    Math.abs(next.cy - camera.target.cy) < 0.002
  ) {
    return {
      cx: camera.target.cx,
      cy: camera.target.cy,
      zoom: camera.target.zoom,
    };
  }

  return next;
};

export const worldToScreen = (
  x: number,
  y: number,
  camera: HighveldCamera,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: (x - camera.cx) * camera.zoom * width + width / 2,
  y: (y - camera.cy) * camera.zoom * height + height / 2,
});

export const screenToWorld = (
  x: number,
  y: number,
  camera: HighveldCamera,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: camera.cx + (x - width / 2) / (camera.zoom * width),
  y: camera.cy + (y - height / 2) / (camera.zoom * height),
});

/**
 * Nodes nearer the viewer (larger world y) draw bigger. Keeps the ground plane
 * reading as distance rather than as a flat map.
 */
export const depthScaleFor = (y: number): number =>
  0.68 + Math.max(0, y - HIGHVELD_HORIZON_Y) * 1.9;

export const pickHighveldNode = (
  pointerX: number,
  pointerY: number,
  nodes: HighveldNode[],
  camera: HighveldCamera,
  width: number,
  height: number,
): HighveldNode | null => {
  let closest: HighveldNode | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  const minSize = Math.min(width, height);

  nodes.forEach((node) => {
    const screen = worldToScreen(node.x, node.y, camera, width, height);
    const radius = Math.max(
      18,
      node.radius * depthScaleFor(node.y) * camera.zoom * minSize,
    );
    const distance = Math.hypot(pointerX - screen.x, pointerY - screen.y);
    if (distance <= radius && distance < closestDistance) {
      closest = node;
      closestDistance = distance;
    }
  });

  return closest;
};

export const cameraForNode = (
  node: HighveldNode,
): Pick<HighveldCamera, "cx" | "cy" | "zoom"> => ({
  cx: node.x,
  cy: node.y,
  zoom: node.kind === "koppie" ? HIGHVELD_KOPPIE_ZOOM : HIGHVELD_DETAIL_ZOOM,
});
