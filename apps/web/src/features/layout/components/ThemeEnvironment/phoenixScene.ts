import type { EnvironmentQualityTier } from "./types";
import {
  type PhoenixCamera,
  type PhoenixNode,
  worldToScreen,
} from "./phoenixWorld";

export const PHOENIX_FRAME_BUDGET_MS = {
  low: 0,
  medium: 6,
  high: 8,
} as const;

export const PHOENIX_SCENE_LIMITS = {
  low: { embers: 22, ash: 12, flares: 1, ribbons: 1, parallax: 0 },
  medium: { embers: 48, ash: 24, flares: 2, ribbons: 2, parallax: 0.35 },
  high: { embers: 88, ash: 42, flares: 3, ribbons: 3, parallax: 0.65 },
} as const;

export const PHOENIX_DAY_CYCLE_MS = 60_000;
export const PHOENIX_DEFAULT_SEED = 20260814;

export type PhoenixDayPhase =
  | "dawn-ember"
  | "zenith-blaze"
  | "dusk-cinder"
  | "hearth-rebirth";
export type PhoenixAtmosphere = "radiant" | "smoldering";

export interface PhoenixPointer {
  x: number;
  y: number;
}

export interface PhoenixPalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  ridgeFar: string;
  ridgeMid: string;
  ridgeNear: string;
  magmaGlow: string;
  auroraFlare: string;
  emberCore: string;
  emberA: string;
  emberB: string;
  emberC: string;
  ashA: string;
  ashB: string;
  vignette: string;
  heatShimmer: string;
  nodeGlow: string;
  nodeRing: string;
  nodeText: string;
}

interface PhoenixFeather {
  x: number;
  y: number;
  length: number;
  width: number;
  speed: number;
  drift: number;
  sway: number;
  swayFreq: number;
  rotation: number;
  spin: number;
  flutterSpeed: number;
  phase: number;
  curve: number;
  color: "emberA" | "emberB" | "emberC";
  alpha: number;
}

interface Ash {
  x: number;
  y: number;
  size: number;
  fallSpeed: number;
  driftSpeed: number;
  rotation: number;
  spin: number;
  phase: number;
  color: "ashA" | "ashB";
}

interface SolarRibbon {
  x: number;
  width: number;
  height: number;
  curvature: number;
  phase: number;
  alpha: number;
}

interface Ridge {
  y: number;
  height: number;
  depth: number;
  frequency: number;
}

export interface PhoenixScene {
  seed: number;
  atmosphere: PhoenixAtmosphere;
  feathers: PhoenixFeather[];
  ashFlakes: Ash[];
  ribbons: SolarRibbon[];
  ridges: Ridge[];
}

export interface PhoenixDragSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  rotation: number;
  spin: number;
  curve: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface DrawPhoenixSceneOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: PhoenixScene;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: PhoenixPointer | null;
  reducedMotion: boolean;
  camera?: PhoenixCamera;
  nodes?: PhoenixNode[];
  hoveredNode?: PhoenixNode | null;
  dragSparks?: PhoenixDragSpark[];
  scrollY?: number;
  modeProgress?: number; // 0.0 (full light) -> 1.0 (full dark)
  pinnedNodeIds?: string[];
}

const createRng = (seed: number): (() => number) => {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return (): number => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

const parseColor = (color: string): RGB => {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  const match = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
  );
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
};

const lerpColor = (c1: string, c2: string, t: number): string => {
  const clampedT = Math.max(0, Math.min(1, t));
  const a = parseColor(c1);
  const b = parseColor(c2);
  const r = Math.round(a.r + (b.r - a.r) * clampedT);
  const g = Math.round(a.g + (b.g - a.g) * clampedT);
  const bl = Math.round(a.b + (b.b - a.b) * clampedT);
  const alpha = (a.a ?? 1) + ((b.a ?? 1) - (a.a ?? 1)) * clampedT;
  if (alpha < 0.999) {
    return `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${bl})`;
};

export const resolvePhoenixDayPhase = (timeMs: number): PhoenixDayPhase => {
  const progress = (timeMs % PHOENIX_DAY_CYCLE_MS) / PHOENIX_DAY_CYCLE_MS;
  if (progress < 0.25) {
    return "dawn-ember";
  }
  if (progress < 0.5) {
    return "zenith-blaze";
  }
  if (progress < 0.75) {
    return "dusk-cinder";
  }
  return "hearth-rebirth";
};

export const createPhoenixPalette = (
  isDarkMode: boolean,
  phase: PhoenixDayPhase,
  atmosphere: PhoenixAtmosphere,
  modeProgress?: number,
  timeMs: number = 0,
): PhoenixPalette => {
  const darkTarget = isDarkMode ? 1.0 : 0.0;
  const darkT = modeProgress !== undefined ? modeProgress : darkTarget;

  // Continuous sinusoidal diurnal wave (0 to 1) for seamless atmospheric cycling
  const cycleWave = (Math.sin((timeMs / PHOENIX_DAY_CYCLE_MS) * Math.PI * 2) + 1) / 2;

  const lightPalette: PhoenixPalette = {
    skyTop: "#fef3c7",
    skyMid: "#fed7aa",
    skyBottom: "#fdba74",
    ridgeFar: "#7c2d12",
    ridgeMid: "#9a3412",
    ridgeNear: "#c2410c",
    magmaGlow:
      atmosphere === "radiant"
        ? "rgba(249, 115, 22, 0.32)"
        : "rgba(239, 68, 68, 0.22)",
    auroraFlare: "rgba(251, 146, 60, 0.16)",
    emberCore: "#ffffff",
    emberA: "#d97706",
    emberB: "#ea580c",
    emberC: "#b91c1c",
    ashA: "rgba(120, 86, 69, 0.35)",
    ashB: "rgba(168, 110, 85, 0.25)",
    vignette: "rgba(90, 36, 12, 0.12)",
    heatShimmer: "rgba(254, 215, 170, 0.4)",
    nodeGlow: "rgba(234, 88, 12, 0.25)",
    nodeRing: "rgba(249, 115, 22, 0.45)",
    nodeText: "#1c130d",
  };

  // Smooth dark palette with cycleWave modulation
  const darkSkyTop = lerpColor("#050304", "#120606", cycleWave);
  const darkSkyMid = lerpColor("#14070a", "#220a0b", cycleWave);
  const darkSkyBottom = lerpColor("#2b0a0a", "#380f08", cycleWave);

  const darkPalette: PhoenixPalette = {
    skyTop: darkSkyTop,
    skyMid: darkSkyMid,
    skyBottom: darkSkyBottom,
    ridgeFar: "#180608",
    ridgeMid: "#250a0a",
    ridgeNear: "#340e0b",
    magmaGlow:
      atmosphere === "radiant"
        ? "rgba(251, 146, 60, 0.45)"
        : "rgba(239, 68, 68, 0.32)",
    auroraFlare: "rgba(251, 191, 36, 0.18)",
    emberCore: "#fffbeb",
    emberA: "#f59e0b",
    emberB: "#f97316",
    emberC: "#ef4444",
    ashA: "rgba(255, 255, 255, 0.45)",
    ashB: "rgba(245, 158, 11, 0.35)",
    vignette: "rgba(0, 0, 0, 0.42)",
    heatShimmer: "rgba(245, 158, 11, 0.22)",
    nodeGlow: "rgba(245, 158, 11, 0.4)",
    nodeRing: "rgba(251, 191, 36, 0.6)",
    nodeText: "#fffbeb",
  };

  if (darkT <= 0.001) return lightPalette;
  if (darkT >= 0.999) return darkPalette;

  // Fully interpolated smooth palette
  return {
    skyTop: lerpColor(lightPalette.skyTop, darkPalette.skyTop, darkT),
    skyMid: lerpColor(lightPalette.skyMid, darkPalette.skyMid, darkT),
    skyBottom: lerpColor(lightPalette.skyBottom, darkPalette.skyBottom, darkT),
    ridgeFar: lerpColor(lightPalette.ridgeFar, darkPalette.ridgeFar, darkT),
    ridgeMid: lerpColor(lightPalette.ridgeMid, darkPalette.ridgeMid, darkT),
    ridgeNear: lerpColor(lightPalette.ridgeNear, darkPalette.ridgeNear, darkT),
    magmaGlow: lerpColor(lightPalette.magmaGlow, darkPalette.magmaGlow, darkT),
    auroraFlare: lerpColor(lightPalette.auroraFlare, darkPalette.auroraFlare, darkT),
    emberCore: lerpColor(lightPalette.emberCore, darkPalette.emberCore, darkT),
    emberA: lerpColor(lightPalette.emberA, darkPalette.emberA, darkT),
    emberB: lerpColor(lightPalette.emberB, darkPalette.emberB, darkT),
    emberC: lerpColor(lightPalette.emberC, darkPalette.emberC, darkT),
    ashA: lerpColor(lightPalette.ashA, darkPalette.ashA, darkT),
    ashB: lerpColor(lightPalette.ashB, darkPalette.ashB, darkT),
    vignette: lerpColor(lightPalette.vignette, darkPalette.vignette, darkT),
    heatShimmer: lerpColor(lightPalette.heatShimmer, darkPalette.heatShimmer, darkT),
    nodeGlow: lerpColor(lightPalette.nodeGlow, darkPalette.nodeGlow, darkT),
    nodeRing: lerpColor(lightPalette.nodeRing, darkPalette.nodeRing, darkT),
    nodeText: lerpColor(lightPalette.nodeText, darkPalette.nodeText, darkT),
  };
};

export const createPhoenixScene = (
  seed: number,
  qualityTier: EnvironmentQualityTier,
): PhoenixScene => {
  const rng = createRng(seed);
  const limits = PHOENIX_SCENE_LIMITS[qualityTier];
  const atmosphere: PhoenixAtmosphere = rng() > 0.4 ? "radiant" : "smoldering";

  const feathers: PhoenixFeather[] = Array.from(
    { length: Math.round(limits.embers * 0.75) },
    () => ({
      x: rng(),
      y: rng(),
      length: 16 + rng() * 26,
      width: 5 + rng() * 9,
      speed: 0.014 + rng() * 0.032, // Reduced speed for majestic floating
      drift: (rng() - 0.5) * 0.012,
      sway: 14 + rng() * 28,
      swayFreq: 0.5 + rng() * 0.9,
      rotation: rng() * Math.PI * 2,
      spin: (rng() - 0.5) * 0.4,
      flutterSpeed: 1.2 + rng() * 2.2,
      phase: rng() * Math.PI * 2,
      curve: (rng() - 0.5) * 0.6,
      color: (["emberA", "emberB", "emberC"] as const)[Math.floor(rng() * 3)],
      alpha: 0.55 + rng() * 0.45,
    }),
  );

  const ashFlakes: Ash[] = Array.from({ length: limits.ash }, () => ({
    x: rng(),
    y: rng(),
    size: 2.0 + rng() * 3.8,
    fallSpeed: -0.005 + rng() * 0.014,
    driftSpeed: (rng() - 0.5) * 0.009,
    rotation: rng() * Math.PI * 2,
    spin: (rng() - 0.5) * 0.4,
    phase: rng() * Math.PI * 2,
    color: (["ashA", "ashB"] as const)[Math.floor(rng() * 2)],
  }));

  const ribbons: SolarRibbon[] = Array.from({ length: limits.ribbons }, () => ({
    x: 0.15 + rng() * 0.7,
    width: 60 + rng() * 120,
    height: 180 + rng() * 260,
    curvature: (rng() - 0.5) * 0.35,
    phase: rng() * Math.PI * 2,
    alpha: 0.10 + rng() * 0.14,
  }));

  return {
    seed,
    atmosphere,
    feathers,
    ashFlakes,
    ribbons,
    ridges: [
      { y: 0.62, height: 0.18, depth: 0.22, frequency: 1.2 },
      { y: 0.72, height: 0.24, depth: 0.45, frequency: 1.6 },
      { y: 0.82, height: 0.28, depth: 0.75, frequency: 2.1 },
    ],
  };
};

const drawPhoenixFeather = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  width: number,
  rotation: number,
  curve: number,
  color: string,
  coreColor: string,
  alpha: number,
): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Central glowing rachis / quill
  ctx.beginPath();
  ctx.moveTo(0, length * 0.5);
  ctx.quadraticCurveTo(curve * 10, 0, 0, -length * 0.5);
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Vane outline with soft feather taper
  const grad = ctx.createLinearGradient(-width, 0, width, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.3, color);
  grad.addColorStop(0.5, coreColor);
  grad.addColorStop(0.7, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");

  ctx.beginPath();
  ctx.moveTo(0, length * 0.5);
  ctx.bezierCurveTo(
    -width * 1.2 + curve * 5,
    length * 0.18,
    -width + curve * 3,
    -length * 0.2,
    0,
    -length * 0.5,
  );
  ctx.bezierCurveTo(
    width + curve * 3,
    -length * 0.2,
    width * 1.2 + curve * 5,
    length * 0.18,
    0,
    length * 0.5,
  );
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle barb filaments
  ctx.strokeStyle = "rgba(255, 251, 235, 0.35)";
  ctx.lineWidth = 0.5;
  const steps = 4;
  for (let i = -steps; i <= steps; i++) {
    const py = (i / (steps + 1)) * length * 0.35;
    const pw = (1 - Math.abs(i) / (steps + 2)) * width * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(-pw, py - 3);
    ctx.moveTo(0, py);
    ctx.lineTo(pw, py - 3);
    ctx.stroke();
  }

  ctx.restore();
};

const drawAsh = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.6);
  ctx.lineTo(size * 0.7, -size * 0.2);
  ctx.lineTo(size * 0.5, size * 0.8);
  ctx.lineTo(-size * 0.4, size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawSolarBeacons = (
  ctx: CanvasRenderingContext2D,
  nodes: PhoenixNode[],
  camera: PhoenixCamera,
  width: number,
  height: number,
  timeMs: number,
  palette: PhoenixPalette,
  hoveredNode: PhoenixNode | null | undefined,
  reducedMotion: boolean,
  pinnedNodeIds?: string[],
): void => {
  const seconds = timeMs / 1000;

  // 1. Constellation Filaments (Energized pulse on hearth hover)
  const nodeMap = new Map<string, PhoenixNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  nodes.forEach((node) => {
    if (!node.parentId) return;
    const parent = nodeMap.get(node.parentId);
    if (!parent) return;

    const from = worldToScreen(parent.x, parent.y, camera, width, height);
    const to = worldToScreen(node.x, node.y, camera, width, height);

    const isConnectedHovered =
      hoveredNode?.id === parent.id ||
      hoveredNode?.id === node.id ||
      (hoveredNode?.parentId && hoveredNode.parentId === parent.id);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (isConnectedHovered) {
      // Energized golden filament
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = reducedMotion ? 0 : -seconds * 22;
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = "rgba(245, 158, 11, 0.9)";
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = palette.nodeRing;
      ctx.lineWidth = 0.75;
      ctx.setLineDash([3, 8]);
      ctx.lineDashOffset = reducedMotion ? 0 : -seconds * 8;
      ctx.globalAlpha = 0.20;
    }

    ctx.stroke();
    ctx.restore();
  });

  nodes.forEach((node) => {
    const screen = worldToScreen(node.x, node.y, camera, width, height);
    const isSanctuary = node.kind === "sanctuary";
    const isHovered = hoveredNode?.id === node.id;
    const isPinned = pinnedNodeIds ? pinnedNodeIds.includes(node.id) : false;
    const pulse = reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(seconds * 2.2 + node.x * 8);

    ctx.save();

    if (isSanctuary) {
      const starRadius = (isHovered || isPinned ? 28 : 22) * pulse;
      const glowRadius = starRadius * 3.5;

      const flareGrad = ctx.createRadialGradient(
        screen.x,
        screen.y,
        starRadius * 0.2,
        screen.x,
        screen.y,
        glowRadius,
      );
      flareGrad.addColorStop(0, "#fffbeb");
      flareGrad.addColorStop(0.25, node.color);
      flareGrad.addColorStop(0.65, palette.nodeGlow);
      flareGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      const rayLen = starRadius * (isHovered || isPinned ? 3.0 : 2.2) * pulse;
      ctx.strokeStyle = "rgba(255, 251, 235, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screen.x - rayLen, screen.y);
      ctx.lineTo(screen.x + rayLen, screen.y);
      ctx.moveTo(screen.x, screen.y - rayLen);
      ctx.lineTo(screen.x, screen.y + rayLen);
      ctx.stroke();

      ctx.fillStyle = palette.emberCore;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, starRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      if (isHovered || isPinned) {
        ctx.fillStyle = "#fffbeb";
        ctx.font = "600 12px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText(node.name.toUpperCase(), screen.x, screen.y + starRadius * 1.5 + 14);
      }
    } else {
      const orbRadius = (isHovered || isPinned ? 7 : 4.5) * (reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(seconds * 3 + node.y * 6));
      const auraRadius = orbRadius * 3.2;

      const auraGrad = ctx.createRadialGradient(
        screen.x,
        screen.y,
        orbRadius * 0.3,
        screen.x,
        screen.y,
        auraRadius,
      );
      auraGrad.addColorStop(0, node.color);
      auraGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.3)");
      auraGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, auraRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isHovered || isPinned ? "#fffbeb" : node.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      if (isHovered || isPinned) {
        ctx.fillStyle = "#fef3c7";
        ctx.font = "500 11px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.name, screen.x, screen.y - orbRadius - 8);
      }
    }

    if (isPinned) {
      // Radiant Pinned Halo Ring
      const ringRadius = (isSanctuary ? 38 : 16) * pulse;
      ctx.save();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = reducedMotion ? 0 : -seconds * 14;
      ctx.shadowColor = "rgba(245, 158, 11, 0.9)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Cardinal Pin Notch Tick Marks
      ctx.strokeStyle = "#fffbeb";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      const tickLen = 4;
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y - ringRadius - tickLen);
      ctx.lineTo(screen.x, screen.y - ringRadius + 1);
      ctx.moveTo(screen.x, screen.y + ringRadius - 1);
      ctx.lineTo(screen.x, screen.y + ringRadius + tickLen);
      ctx.moveTo(screen.x - ringRadius - tickLen, screen.y);
      ctx.lineTo(screen.x - ringRadius + 1, screen.y);
      ctx.moveTo(screen.x + ringRadius - 1, screen.y);
      ctx.lineTo(screen.x + ringRadius + tickLen, screen.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  });
};

export const drawPhoenixScene = ({
  ctx,
  width,
  height,
  scene,
  timeMs,
  isDarkMode,
  qualityTier,
  pointer,
  reducedMotion,
  camera,
  nodes,
  hoveredNode,
  dragSparks,
  scrollY = 0,
  modeProgress,
  pinnedNodeIds,
}: DrawPhoenixSceneOptions): void => {
  const phase = resolvePhoenixDayPhase(timeMs);
  const palette = createPhoenixPalette(
    isDarkMode,
    phase,
    scene.atmosphere,
    modeProgress,
    timeMs,
  );
  const limits = PHOENIX_SCENE_LIMITS[qualityTier];
  const pointerX = pointer ? (pointer.x / width - 0.5) * 2 : 0;
  const pointerY = pointer ? (pointer.y / height - 0.5) * 2 : 0;
  const parallax = limits.parallax;
  const seconds = timeMs / 1000;

  const scrollProgress = Math.min(scrollY / (height * 1.5), 1.0);
  const scrollHorizonOffset = scrollProgress * height * 0.08;

  // 1. Sky Gradient Canvas Base
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, palette.skyTop);
  skyGrad.addColorStop(0.55, palette.skyMid);
  skyGrad.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Solar Auroral Ribbons
  scene.ribbons.forEach((ribbon, index) => {
    const shiftX =
      (ribbon.x * width +
        Math.sin(seconds * 0.3 + ribbon.phase) * (reducedMotion ? 0 : 35) +
        pointerX * parallax * 20 +
        width) %
      width;
    const plumeTop = height * (0.05 + index * 0.1) + scrollHorizonOffset * 0.5;
    const plumeBottom = height * (0.85 - index * 0.05);

    ctx.save();
    ctx.globalAlpha = ribbon.alpha;
    const flareGrad = ctx.createRadialGradient(
      shiftX,
      plumeBottom,
      10,
      shiftX,
      plumeTop,
      ribbon.height * 1.5,
    );
    flareGrad.addColorStop(0, palette.magmaGlow);
    flareGrad.addColorStop(0.5, palette.auroraFlare);
    flareGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.ellipse(
      shiftX,
      height * 0.5,
      ribbon.width * 1.2,
      ribbon.height * 1.4,
      ribbon.curvature,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  });

  // 3. Volcanic Caldera & Ridgelines with Parallax & Scroll-Driven Horizon Tilt
  scene.ridges.forEach((ridge, index) => {
    const shiftX = pointerX * parallax * ridge.depth * 24;
    const shiftY =
      pointerY * parallax * ridge.depth * 12 +
      scrollHorizonOffset * (1 + index * 0.4);
    ctx.fillStyle =
      index === 0
        ? palette.ridgeFar
        : index === 1
          ? palette.ridgeMid
          : palette.ridgeNear;

    ctx.beginPath();
    ctx.moveTo(-50 + shiftX, height);
    ctx.lineTo(-50 + shiftX, height * ridge.y + shiftY);

    const segments = 10 + index * 4;
    for (let i = 0; i <= segments; i += 1) {
      const px = (width + 100) * (i / segments) + shiftX - 50;
      const wave1 = Math.sin(i * ridge.frequency + index * 1.5) * 0.55;
      const wave2 = Math.cos(i * 0.7 + index) * 0.45;
      const elevation = (wave1 + wave2) * ridge.height * height * 0.4;
      ctx.lineTo(px, height * ridge.y + elevation + shiftY);
    }
    ctx.lineTo(width + 50 + shiftX, height);
    ctx.closePath();
    ctx.fill();
  });

  // 4. Horizon Magma Seam Pulse & Deepening Glow
  const magmaHeight = height * (0.18 + scrollProgress * 0.1);
  const pulse = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(seconds * 1.8);
  const magmaGrad = ctx.createLinearGradient(0, height - magmaHeight, 0, height);
  magmaGrad.addColorStop(0, "rgba(0,0,0,0)");
  magmaGrad.addColorStop(0.55, palette.magmaGlow);
  magmaGrad.addColorStop(1, palette.emberB);
  ctx.save();
  ctx.globalAlpha = (0.45 + scrollProgress * 0.25) * pulse;
  ctx.fillStyle = magmaGrad;
  ctx.fillRect(0, height - magmaHeight, width, magmaHeight);
  ctx.restore();

  // 5. Celestial Solar Beacons & Hearth Stars
  if (nodes && camera) {
    drawSolarBeacons(
      ctx,
      nodes,
      camera,
      width,
      height,
      timeMs,
      palette,
      hoveredNode,
      reducedMotion,
      pinnedNodeIds,
    );
  }

  // 6. Interactive Drag Sparks & Phoenix Plumes
  if (dragSparks && dragSparks.length > 0) {
    dragSparks.forEach((spark) => {
      const alpha = (spark.life / spark.maxLife) * 0.9;
      if (alpha <= 0) return;
      drawPhoenixFeather(
        ctx,
        spark.x,
        spark.y,
        spark.length,
        spark.width,
        spark.rotation,
        spark.curve,
        spark.color,
        "#fffbeb",
        alpha,
      );
    });
  }

  // 7. Ash Flakes Simulation
  scene.ashFlakes.forEach((ash) => {
    const travel = reducedMotion
      ? ash.y
      : (ash.y + seconds * ash.fallSpeed + 2.0) % 1.1;
    const posX =
      (ash.x * width +
        Math.sin(seconds * 0.5 + ash.phase) * (reducedMotion ? 0 : 20) +
        pointerX * parallax * 15 +
        seconds * ash.driftSpeed * width +
        width) %
      width;
    const posY = travel * height;
    const rot = ash.rotation + (reducedMotion ? 0 : seconds * ash.spin);
    drawAsh(ctx, posX, posY, ash.size, rot, palette[ash.color]);
  });

  // 8. Rising Phoenix Plumes & Molten Feathers
  scene.feathers.forEach((feather) => {
    const travel = reducedMotion
      ? feather.y
      : (feather.y - seconds * feather.speed + 1000.0) % 1.15;
    const rawY = travel * height - feather.length;

    let swayOffset =
      Math.sin(seconds * feather.swayFreq + feather.phase) *
      (reducedMotion ? 0 : feather.sway);
    let extraSpeedY = 0;

    if (pointer && !reducedMotion) {
      const dx = pointer.x - (feather.x * width + swayOffset);
      const dy = pointer.y - rawY;
      const dist = Math.hypot(dx, dy);
      if (dist < 200 && dist > 1) {
        const force = (1 - dist / 200) * 30;
        swayOffset -= (dx / dist) * force;
        extraSpeedY = -(dy / dist) * force * 0.35;
      }
    }

    const posX =
      (feather.x * width + swayOffset + pointerX * parallax * 12 + width) % width;
    const posY = rawY + extraSpeedY;

    const dynamicRotation = reducedMotion
      ? feather.rotation
      : feather.rotation +
        Math.sin(seconds * feather.flutterSpeed + feather.phase) * 0.25 +
        seconds * feather.spin;

    drawPhoenixFeather(
      ctx,
      posX,
      posY,
      feather.length,
      feather.width,
      dynamicRotation,
      feather.curve,
      palette[feather.color],
      palette.emberCore,
      feather.alpha,
    );
  });

  // 9. Bottom Magma Seam Vignette (Seamless top, subtle bottom atmospheric depth)
  ctx.fillStyle = palette.vignette;
  ctx.fillRect(0, height * 0.88, width, height * 0.12);
};
