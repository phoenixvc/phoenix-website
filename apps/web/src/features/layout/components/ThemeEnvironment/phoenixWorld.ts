import {
  FOCUS_AREA_CONFIG,
  PORTFOLIO_PROJECTS,
} from "@/constants/portfolioData";

export type PhoenixNodeKind = "sanctuary" | "altar" | "beacon";

export interface PhoenixNode {
  id: string;
  kind: PhoenixNodeKind;
  name: string;
  description: string;
  href: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  secondaryColor?: string;
  parentId?: string;
  initials?: string;
}

export interface PhoenixCamera {
  cx: number;
  cy: number;
  zoom: number;
  target?: Pick<PhoenixCamera, "cx" | "cy" | "zoom">;
}

export const PHOENIX_OVERVIEW_CAMERA: PhoenixCamera = {
  cx: 0.5,
  cy: 0.5,
  zoom: 1,
};

export const PHOENIX_SANCTUARY_ZOOM = 2.4;
export const PHOENIX_DETAIL_ZOOM = 3.8;

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

export const createPhoenixNodes = (): PhoenixNode[] => {
  const sanctuaries: PhoenixNode[] = [
    {
      id: "focus-sanctuary",
      kind: "sanctuary",
      name: "Solar Sanctuaries",
      description: "Core investment domains forging new technological frontiers",
      href: "/#focus-areas",
      x: 0.32,
      y: 0.44,
      radius: 0.095,
      color: "#f59e0b",
      secondaryColor: "#ef4444",
    },
    {
      id: "portfolio-hearth",
      kind: "sanctuary",
      name: "Portfolio Hearth",
      description: "Active ventures rising and blazing trails across the ecosystem",
      href: "/portfolio",
      x: 0.68,
      y: 0.40,
      radius: 0.105,
      color: "#f97316",
      secondaryColor: "#fbbf24",
    },
    {
      id: "origin-spire",
      kind: "sanctuary",
      name: "Origin Spire",
      description: "Philosophy, intelligence, and leadership",
      href: "/about",
      x: 0.5,
      y: 0.72,
      radius: 0.085,
      color: "#ef4444",
      secondaryColor: "#f59e0b",
    },
  ];

  const focusAreas = Object.values(FOCUS_AREA_CONFIG);
  const altars: PhoenixNode[] = focusAreas.map((area, index) => {
    const point = ringPoint(0.32, 0.44, 0.14, index, focusAreas.length);
    return {
      id: `${area.id}-altar`,
      kind: "altar",
      name: area.label,
      description: area.description,
      href: "/#focus-areas",
      x: point.x,
      y: point.y,
      radius: 0.035,
      color: area.color || "#f59e0b",
      secondaryColor: "#f97316",
      parentId: "focus-sanctuary",
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
  const beacons: PhoenixNode[] = projects.map((project, index) => {
    const point = ringPoint(0.68, 0.40, 0.17, index, projects.length);
    return {
      id: project.id,
      kind: "beacon",
      name: project.name,
      description: project.tagline || project.title,
      href: `/portfolio/${project.id}`,
      x: point.x,
      y: point.y,
      radius: 0.024 + Math.min((project.mass || 100) / 8000, 0.014),
      color: project.color || "#f97316",
      secondaryColor: "#fbbf24",
      parentId: "portfolio-hearth",
      initials: project.initials,
    };
  });

  return [...sanctuaries, ...altars, ...beacons];
};

export const lerpPhoenixCamera = (
  camera: PhoenixCamera,
  smoothing = 0.12,
): PhoenixCamera => {
  if (!camera.target) {
    return camera;
  }

  const next: PhoenixCamera = {
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
  camera: PhoenixCamera,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: (x - camera.cx) * camera.zoom * width + width / 2,
  y: (y - camera.cy) * camera.zoom * height + height / 2,
});

export const screenToWorld = (
  x: number,
  y: number,
  camera: PhoenixCamera,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: camera.cx + (x - width / 2) / (camera.zoom * width),
  y: camera.cy + (y - height / 2) / (camera.zoom * height),
});

export const pickPhoenixNode = (
  pointerX: number,
  pointerY: number,
  nodes: PhoenixNode[],
  camera: PhoenixCamera,
  width: number,
  height: number,
): PhoenixNode | null => {
  let closest: PhoenixNode | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  const minSize = Math.min(width, height);

  nodes.forEach((node) => {
    const screen = worldToScreen(node.x, node.y, camera, width, height);
    const radius = Math.max(20, node.radius * camera.zoom * minSize);
    const distance = Math.hypot(pointerX - screen.x, pointerY - screen.y);
    if (distance <= radius && distance < closestDistance) {
      closest = node;
      closestDistance = distance;
    }
  });

  return closest;
};

export const cameraForPhoenixNode = (
  node: PhoenixNode,
): Pick<PhoenixCamera, "cx" | "cy" | "zoom"> => ({
  cx: node.x,
  cy: node.y,
  zoom: node.kind === "sanctuary" ? PHOENIX_SANCTUARY_ZOOM : PHOENIX_DETAIL_ZOOM,
});
