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

export type LavenderNodeKind = "glade" | "spire" | "haven";

export interface LavenderNode extends EnvironmentNodeBase {
  kind: LavenderNodeKind;
  bloom: number;
}

export type LavenderCamera = EnvironmentCamera;

export const LAVENDER_OVERVIEW_CAMERA: LavenderCamera = {
  ...ENVIRONMENT_OVERVIEW_CAMERA,
};

export const LAVENDER_GLADE_ZOOM = 2.4;
export const LAVENDER_DETAIL_ZOOM = 3.8;

export const createLavenderNodes = (): LavenderNode[] => {
  const nodes: LavenderNode[] = [];

  const focusEntries = Object.entries(FOCUS_AREA_CONFIG);

  focusEntries.forEach(([key, area], index) => {
    const point = ringPoint(0.5, 0.47, 0.28, index, focusEntries.length);
    nodes.push({
      id: `lavender-focus-${key}`,
      kind: index % 2 === 0 ? "glade" : "spire",
      name: area.label,
      subtitle: "Botanical Domain",
      description: area.description,
      x: point.x,
      y: point.y,
      bloom: 0.4 + index * 0.1,
      radius: 21,
      accent: area.color || "#C084FC",
      glow: "rgba(192, 132, 252, 0.45)",
      href: "/#focus-areas",
      metric: "Active Flora",
    });
  });

  PORTFOLIO_PROJECTS.slice(0, 8).forEach((project, index) => {
    const point = ringPoint(
      0.5,
      0.5,
      0.42,
      index,
      Math.min(PORTFOLIO_PROJECTS.length, 8),
      Math.PI / 7,
    );
    nodes.push({
      id: `lavender-project-${project.id}`,
      kind: "haven",
      name: project.name,
      subtitle: project.focusArea
        ? FOCUS_AREA_CONFIG[project.focusArea]?.label || "Flora Portfolio"
        : "Flora Portfolio",
      description: project.tagline || project.bio || project.title,
      x: point.x,
      y: point.y,
      bloom: 0.65 + index * 0.04,
      radius: 15,
      accent: project.color || "#E879F9",
      glow: "rgba(232, 121, 249, 0.45)",
      href: `/portfolio/${project.id}`,
      metric: project.status || "Active",
      initials: project.initials || project.name.slice(0, 2).toUpperCase(),
    });
  });

  return nodes;
};

export { worldToScreen };

export const pickLavenderNode = (
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: LavenderCamera,
  nodes: LavenderNode[],
): LavenderNode | null =>
  pickEnvironmentNode(screenX, screenY, width, height, camera, nodes);

export const lerpLavenderCamera = (
  camera: LavenderCamera,
  speed = 0.08,
): LavenderCamera => lerpEnvironmentCamera(camera, speed);
