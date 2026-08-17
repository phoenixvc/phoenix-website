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

export type ClassicNodeKind = "schematic" | "node" | "vector";

export interface ClassicNode extends EnvironmentNodeBase {
  kind: ClassicNodeKind;
  elevation: number;
}

export type ClassicCamera = EnvironmentCamera;

export const CLASSIC_OVERVIEW_CAMERA: ClassicCamera = {
  ...ENVIRONMENT_OVERVIEW_CAMERA,
};

export const CLASSIC_SCHEMATIC_ZOOM = 2.4;
export const CLASSIC_DETAIL_ZOOM = 3.8;

export const createClassicNodes = (): ClassicNode[] => {
  const nodes: ClassicNode[] = [];

  const focusEntries = Object.entries(FOCUS_AREA_CONFIG);

  focusEntries.forEach(([key, area], index) => {
    const point = ringPoint(0.5, 0.48, 0.28, index, focusEntries.length);
    nodes.push({
      id: `classic-focus-${key}`,
      kind: "schematic",
      name: area.label,
      subtitle: "Engineering Sector",
      description: area.description,
      x: point.x,
      y: point.y,
      elevation: 0.4 + index * 0.1,
      radius: 20,
      accent: area.color || "#38BDF8",
      glow: "rgba(56, 189, 248, 0.4)",
      href: "/#focus-areas",
      metric: "Primary Domain",
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
      id: `classic-project-${project.id}`,
      kind: "vector",
      name: project.name,
      subtitle: project.focusArea
        ? FOCUS_AREA_CONFIG[project.focusArea]?.label || "Blueprint Asset"
        : "Blueprint Asset",
      description: project.tagline || project.bio || project.title,
      x: point.x,
      y: point.y,
      elevation: 0.65 + index * 0.04,
      radius: 15,
      accent: project.color || "#60A5FA",
      glow: "rgba(96, 165, 250, 0.4)",
      href: `/portfolio/${project.id}`,
      metric: project.status || "Active",
      initials: project.initials || project.name.slice(0, 2).toUpperCase(),
    });
  });

  return nodes;
};

export { worldToScreen };

export const pickClassicNode = (
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: ClassicCamera,
  nodes: ClassicNode[],
): ClassicNode | null =>
  pickEnvironmentNode(screenX, screenY, width, height, camera, nodes);

export const lerpClassicCamera = (
  camera: ClassicCamera,
  speed = 0.08,
): ClassicCamera => lerpEnvironmentCamera(camera, speed);
