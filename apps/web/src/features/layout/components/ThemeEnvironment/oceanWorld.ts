import {
  FOCUS_AREA_CONFIG,
  PORTFOLIO_PROJECTS,
} from "@/constants/portfolioData";
import {
  ENVIRONMENT_OVERVIEW_CAMERA,
  ringPoint,
  worldToScreen,
  pickEnvironmentNode,
  lerpEnvironmentCamera,
  type EnvironmentCamera,
  type EnvironmentNodeBase,
} from "./shared";

export type OceanNodeKind = "spire" | "vent" | "reef";

export interface OceanNode extends EnvironmentNodeBase {
  kind: OceanNodeKind;
  depth: number;
}

export type OceanCamera = EnvironmentCamera;

export const OCEAN_OVERVIEW_CAMERA: OceanCamera = {
  ...ENVIRONMENT_OVERVIEW_CAMERA,
};

export const OCEAN_SPIRE_ZOOM = 2.4;
export const OCEAN_DETAIL_ZOOM = 3.8;

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

export { worldToScreen };

export const pickOceanNode = (
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: OceanCamera,
  nodes: OceanNode[],
): OceanNode | null =>
  pickEnvironmentNode(screenX, screenY, width, height, camera, nodes);

export const lerpOceanCamera = (
  camera: OceanCamera,
  speed = 0.08,
): OceanCamera => lerpEnvironmentCamera(camera, speed);
