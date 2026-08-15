import {
  FOCUS_AREA_CONFIG,
  PORTFOLIO_PROJECTS,
} from "@/constants/portfolioData";

export type OceanNodeKind = "spire" | "vent" | "reef";

export interface OceanNode {
  id: string;
  kind: OceanNodeKind;
  name: string;
  subtitle: string;
  description: string;
  x: number;
  y: number;
  depth: number;
  radius: number;
  accent: string;
  glow: string;
  href: string;
  metric?: string;
  parentId?: string;
  initials?: string;
}

export interface OceanCamera {
  cx: number;
  cy: number;
  zoom: number;
  target?: {
    cx: number;
    cy: number;
    zoom: number;
  };
}

export const OCEAN_OVERVIEW_CAMERA: OceanCamera = {
  cx: 0.5,
  cy: 0.5,
  zoom: 1,
};

export const OCEAN_SPIRE_ZOOM = 2.4;
export const OCEAN_DETAIL_ZOOM = 3.8;

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

export const createOceanNodes = (): OceanNode[] => {
  const nodes: OceanNode[] = [];

  const focusEntries = Object.entries(FOCUS_AREA_CONFIG);

  focusEntries.forEach(([key, area], index) => {
    const point = ringPoint(0.5, 0.48, 0.28, index, focusEntries.length);
    nodes.push({
      id: `ocean-focus-${key}`,
      kind: index % 2 === 0 ? "spire" : "vent",
      name: area.label,
      subtitle: "Abyssal Sector",
      description: area.description,
      x: point.x,
      y: point.y,
      depth: 0.35 + index * 0.1,
      radius: 20,
      accent: area.color || "#00F0FF",
      glow: "rgba(0, 240, 255, 0.45)",
      href: "/#focus-areas",
      metric: "Active Domain",
    });
  });

  PORTFOLIO_PROJECTS.slice(0, 8).forEach((project, index) => {
    const point = ringPoint(
      0.5,
      0.5,
      0.42,
      index,
      Math.min(PORTFOLIO_PROJECTS.length, 8),
      Math.PI / 6,
    );
    nodes.push({
      id: `ocean-project-${project.id}`,
      kind: "reef",
      name: project.name,
      subtitle: project.focusArea
        ? FOCUS_AREA_CONFIG[project.focusArea]?.label || "Pelagic Portfolio"
        : "Pelagic Portfolio",
      description: project.tagline || project.bio || project.title,
      x: point.x,
      y: point.y,
      depth: 0.6 + index * 0.05,
      radius: 15,
      accent: project.color || "#14B8A6",
      glow: "rgba(20, 184, 166, 0.4)",
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
  camera: OceanCamera,
): { x: number; y: number; scale: number } => {
  const scale = camera.zoom;
  const screenX = width * 0.5 + (x - camera.cx) * width * scale;
  const screenY = height * 0.5 + (y - camera.cy) * height * scale;
  return { x: screenX, y: screenY, scale };
};

export const pickOceanNode = (
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: OceanCamera,
  nodes: OceanNode[],
): OceanNode | null => {
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

export const lerpOceanCamera = (
  camera: OceanCamera,
  speed = 0.08,
): OceanCamera => {
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
