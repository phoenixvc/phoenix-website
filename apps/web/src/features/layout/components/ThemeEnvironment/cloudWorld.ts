import {
  FOCUS_AREA_CONFIG,
  PORTFOLIO_PROJECTS,
} from "@/constants/portfolioData";

export type CloudNodeKind = "cirrus" | "cumulus" | "stratus";

export interface CloudNode {
  id: string;
  kind: CloudNodeKind;
  name: string;
  subtitle: string;
  description: string;
  x: number;
  y: number;
  altitude: number;
  radius: number;
  accent: string;
  glow: string;
  href: string;
  metric?: string;
  parentId?: string;
  initials?: string;
}

export interface CloudCamera {
  cx: number;
  cy: number;
  zoom: number;
  target?: {
    cx: number;
    cy: number;
    zoom: number;
  };
}

export const CLOUD_OVERVIEW_CAMERA: CloudCamera = {
  cx: 0.5,
  cy: 0.5,
  zoom: 1,
};

export const CLOUD_ALTITUDE_ZOOM = 2.4;
export const CLOUD_DETAIL_ZOOM = 3.8;

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

export const createCloudNodes = (): CloudNode[] => {
  const nodes: CloudNode[] = [];

  const focusEntries = Object.entries(FOCUS_AREA_CONFIG);

  focusEntries.forEach(([key, area], index) => {
    const point = ringPoint(0.5, 0.46, 0.27, index, focusEntries.length);
    nodes.push({
      id: `cloud-focus-${key}`,
      kind: index % 2 === 0 ? "cumulus" : "cirrus",
      name: area.label,
      subtitle: "Atmospheric Domain",
      description: area.description,
      x: point.x,
      y: point.y,
      altitude: 0.4 + index * 0.1,
      radius: 22,
      accent: area.color || "#60A5FA",
      glow: "rgba(96, 165, 250, 0.45)",
      href: "/#focus-areas",
      metric: "Stratospheric Sector",
    });
  });

  PORTFOLIO_PROJECTS.slice(0, 8).forEach((project, index) => {
    const point = ringPoint(
      0.5,
      0.5,
      0.41,
      index,
      Math.min(PORTFOLIO_PROJECTS.length, 8),
      Math.PI / 5,
    );
    nodes.push({
      id: `cloud-project-${project.id}`,
      kind: "stratus",
      name: project.name,
      subtitle: project.focusArea
        ? FOCUS_AREA_CONFIG[project.focusArea]?.label || "Aerial Portfolio"
        : "Aerial Portfolio",
      description: project.tagline || project.bio || project.title,
      x: point.x,
      y: point.y,
      altitude: 0.65 + index * 0.04,
      radius: 16,
      accent: project.color || "#38BDF8",
      glow: "rgba(56, 189, 248, 0.45)",
      href: `/portfolio/${project.id}`,
      metric: project.status || "Active",
      initials: project.initials || project.name.slice(0, 2).toUpperCase(),
    });
  });

  return nodes;
};

export const worldToScreen = (
  x: number,
  y: number,
  width: number,
  height: number,
  camera: CloudCamera,
): { x: number; y: number; scale: number } => {
  const scale = camera.zoom;
  const screenX = width * 0.5 + (x - camera.cx) * width * scale;
  const screenY = height * 0.5 + (y - camera.cy) * height * scale;
  return { x: screenX, y: screenY, scale };
};

export const pickCloudNode = (
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: CloudCamera,
  nodes: CloudNode[],
): CloudNode | null => {
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

export const lerpCloudCamera = (
  camera: CloudCamera,
  speed = 0.08,
): CloudCamera => {
  const target = camera.target ?? {
    cx: camera.cx,
    cy: camera.cy,
    zoom: camera.zoom,
  };
  const cx = camera.cx + (target.cx - camera.cx) * speed;
  const cy = camera.cy + (target.cy - camera.cy) * speed;
  const zoom = camera.zoom + (target.zoom - camera.zoom) * speed;
  return {
    cx,
    cy,
    zoom,
    target: camera.target,
  };
};
