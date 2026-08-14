import {
  FOCUS_AREA_CONFIG,
  PORTFOLIO_PROJECTS,
} from "@/constants/portfolioData";

export type ForestNodeKind = "grove" | "tree" | "clearing";

export interface ForestNode {
  id: string;
  kind: ForestNodeKind;
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

export interface ForestCamera {
  cx: number;
  cy: number;
  zoom: number;
  target?: Pick<ForestCamera, "cx" | "cy" | "zoom">;
}

export const FOREST_OVERVIEW_CAMERA: ForestCamera = {
  cx: 0.5,
  cy: 0.52,
  zoom: 1,
};

export const FOREST_GROVE_ZOOM = 2.35;
export const FOREST_DETAIL_ZOOM = 3.7;

const ringPoint = (
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

export const createForestNodes = (): ForestNode[] => {
  const groves: ForestNode[] = [
    {
      id: "focus-areas-grove",
      kind: "grove",
      name: "Focus Groves",
      description: "Investment sectors growing under the canopy",
      href: "/#focus-areas",
      x: 0.3,
      y: 0.46,
      radius: 0.09,
      color: "#4c7a4a",
    },
    {
      id: "portfolio-grove",
      kind: "grove",
      name: "Portfolio Glade",
      description: "Portfolio companies as living trees",
      href: "/portfolio",
      x: 0.7,
      y: 0.38,
      radius: 0.1,
      color: "#d4a017",
    },
    {
      id: "information-grove",
      kind: "grove",
      name: "Knowledge Hollow",
      description: "Company stories, notes, and contact",
      href: "/about",
      x: 0.5,
      y: 0.74,
      radius: 0.08,
      color: "#8b6b4a",
    },
  ];

  const focusAreas = Object.values(FOCUS_AREA_CONFIG);
  const trees: ForestNode[] = focusAreas.map((area, index) => {
    const point = ringPoint(0.3, 0.46, 0.13, index, focusAreas.length);
    return {
      id: `${area.id}-tree`,
      kind: "tree",
      name: area.label,
      description: area.description,
      href: "/#focus-areas",
      x: point.x,
      y: point.y,
      radius: 0.034,
      color: area.color,
      parentId: "focus-areas-grove",
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
  const clearings: ForestNode[] = projects.map((project, index) => {
    const point = ringPoint(0.7, 0.38, 0.16, index, projects.length);
    return {
      id: project.id,
      kind: "clearing",
      name: project.name,
      description: project.tagline || project.title,
      href: `/portfolio/${project.id}`,
      x: point.x,
      y: point.y,
      radius: 0.022 + Math.min((project.mass || 100) / 8000, 0.012),
      color: project.color,
      parentId: "portfolio-grove",
      initials: project.initials,
    };
  });

  return [...groves, ...trees, ...clearings];
};

export const lerpForestCamera = (
  camera: ForestCamera,
  smoothing = 0.12,
): ForestCamera => {
  if (!camera.target) {
    return camera;
  }

  const next: ForestCamera = {
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
  camera: ForestCamera,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: (x - camera.cx) * camera.zoom * width + width / 2,
  y: (y - camera.cy) * camera.zoom * height + height / 2,
});

export const screenToWorld = (
  x: number,
  y: number,
  camera: ForestCamera,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: camera.cx + (x - width / 2) / (camera.zoom * width),
  y: camera.cy + (y - height / 2) / (camera.zoom * height),
});

export const pickForestNode = (
  pointerX: number,
  pointerY: number,
  nodes: ForestNode[],
  camera: ForestCamera,
  width: number,
  height: number,
): ForestNode | null => {
  let closest: ForestNode | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  const minSize = Math.min(width, height);

  nodes.forEach((node) => {
    const screen = worldToScreen(node.x, node.y, camera, width, height);
    const radius = Math.max(36, node.radius * camera.zoom * minSize);
    const distance = Math.hypot(pointerX - screen.x, pointerY - screen.y);
    if (distance <= radius && distance < closestDistance) {
      closest = node;
      closestDistance = distance;
    }
  });

  return closest;
};

export const cameraForNode = (
  node: ForestNode,
): Pick<ForestCamera, "cx" | "cy" | "zoom"> => ({
  cx: node.x,
  cy: node.y,
  zoom: node.kind === "grove" ? FOREST_GROVE_ZOOM : FOREST_DETAIL_ZOOM,
});
