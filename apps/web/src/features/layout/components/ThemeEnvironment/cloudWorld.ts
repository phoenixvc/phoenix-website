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

export type CloudNodeKind = "cirrus" | "cumulus" | "stratus";

export interface CloudNode extends EnvironmentNodeBase {
  kind: CloudNodeKind;
  altitude: number;
}

export type CloudCamera = EnvironmentCamera;

export const CLOUD_OVERVIEW_CAMERA: CloudCamera = {
  ...ENVIRONMENT_OVERVIEW_CAMERA,
};

export const CLOUD_ALTITUDE_ZOOM = 2.4;
export const CLOUD_DETAIL_ZOOM = 3.8;

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

export { worldToScreen };

export const pickCloudNode = (
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: CloudCamera,
  nodes: CloudNode[],
): CloudNode | null =>
  pickEnvironmentNode(screenX, screenY, width, height, camera, nodes);

export const lerpCloudCamera = (
  camera: CloudCamera,
  speed = 0.08,
): CloudCamera => lerpEnvironmentCamera(camera, speed);
