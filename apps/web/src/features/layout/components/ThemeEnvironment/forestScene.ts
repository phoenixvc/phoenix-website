import type { EnvironmentQualityTier } from "./types";
import {
  type ForestCamera,
  type ForestNode,
  worldToScreen,
} from "./forestWorld";

export const FOREST_FRAME_BUDGET_MS = {
  low: 0,
  medium: 6,
  high: 8,
} as const;

export const FOREST_SCENE_LIMITS = {
  low: { leaves: 24, insects: 2, shafts: 3, pixels: 90, parallax: 0.15 },
  medium: { leaves: 52, insects: 10, shafts: 4, pixels: 240, parallax: 0.4 },
  high: { leaves: 84, insects: 16, shafts: 5, pixels: 420, parallax: 0.75 },
} as const;

export const FOREST_DAY_CYCLE_MS = 60_000;
export const FOREST_DEFAULT_SEED = 20260809;

export type ForestWeather = "calm" | "mist";
export type ForestDayPhase = "dawn" | "day" | "dusk" | "night";

export interface ForestPointer {
  x: number;
  y: number;
}

export interface ForestPalette {
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillMid: string;
  canopy: string;
  canopyHighlight: string;
  trunk: string;
  leafA: string;
  leafB: string;
  leafC: string;
  shaft: string;
  mist: string;
  insect: string;
  vignette: string;
  firefly: string;
  pollen: string;
}

interface Leaf {
  x: number;
  y: number;
  size: number;
  rotation: number;
  spin: number;
  fall: number;
  sway: number;
  phase: number;
  color: keyof Pick<ForestPalette, "leafA" | "leafB" | "leafC">;
}

interface Insect {
  kind: "fly" | "crawl";
  x: number;
  y: number;
  speed: number;
  phase: number;
  scale: number;
}

interface Shaft {
  x: number;
  width: number;
  angle: number;
  alpha: number;
}

interface PixelMote {
  kind: "firefly" | "pollen" | "spore" | "seed";
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
}

export interface ForestScene {
  seed: number;
  weather: ForestWeather;
  leaves: Leaf[];
  insects: Insect[];
  shafts: Shaft[];
  pixels: PixelMote[];
  hills: Array<{ y: number; height: number; depth: number }>;
}

export interface DrawForestSceneOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: ForestScene;
  nodes: ForestNode[];
  camera: ForestCamera;
  focusedId?: string | null;
  hoveredId?: string | null;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: ForestPointer | null;
  reducedMotion: boolean;
}

const createRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return (): number => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Stable per-node seed so each tree's canopy variation is deterministic
// across frames (same node id -> same cluster layout every draw) without
// storing extra state on ForestNode or precomputing a lookup table.
const hashForestNodeSeed = (id: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const resolveForestDayPhase = (timeMs: number): ForestDayPhase => {
  const cycle =
    ((timeMs % FOREST_DAY_CYCLE_MS) + FOREST_DAY_CYCLE_MS) %
    FOREST_DAY_CYCLE_MS;
  const unit = cycle / FOREST_DAY_CYCLE_MS;
  if (unit < 0.18) return "dawn";
  if (unit < 0.55) return "day";
  if (unit < 0.72) return "dusk";
  return "night";
};

export const createForestPalette = (
  isDarkMode: boolean,
  phase: ForestDayPhase,
  weather: ForestWeather,
): ForestPalette => {
  if (!isDarkMode) {
    return {
      skyTop: phase === "dawn" ? "#d7e4d4" : "#e7efe4",
      skyBottom: phase === "dusk" ? "#d6c9a4" : "#c5d6be",
      hillFar: "#8aa57b",
      hillMid: "#5f7d52",
      canopy: "#2f5a38",
      canopyHighlight: "#4c7a4a",
      trunk: "#5b4634",
      leafA: "#3f7a3c",
      leafB: "#7a5a2c",
      leafC: "#c08a28",
      shaft: "rgba(232, 197, 71, 0.16)",
      mist:
        weather === "mist"
          ? "rgba(232, 240, 228, 0.28)"
          : "rgba(232, 240, 228, 0.08)",
      insect: "#2a2418",
      vignette: "rgba(26, 46, 32, 0.18)",
      firefly: "#d4a017",
      pollen: "rgba(212, 160, 23, 0.45)",
    };
  }

  const night = phase === "night";
  return {
    skyTop: night ? "#07110d" : phase === "dusk" ? "#1a2214" : "#0c1a13",
    skyBottom: night ? "#0b1912" : phase === "dawn" ? "#24331c" : "#163022",
    hillFar: "#163224",
    hillMid: "#1c3d28",
    canopy: "#0f2418",
    canopyHighlight: "#245536",
    trunk: "#3a2a1d",
    leafA: "#3f8f5a",
    leafB: "#8b6b4a",
    leafC: "#d4a017",
    shaft: night ? "rgba(184, 214, 176, 0.06)" : "rgba(232, 197, 71, 0.14)",
    mist:
      weather === "mist" ? "rgba(12, 28, 20, 0.28)" : "rgba(12, 28, 20, 0.08)",
    insect: "#d7c39a",
    vignette: "rgba(4, 10, 7, 0.42)",
    firefly: "#e8c547",
    pollen: "rgba(232, 240, 228, 0.35)",
  };
};

export const createForestScene = (
  seed: number,
  qualityTier: EnvironmentQualityTier,
): ForestScene => {
  const rng = createRng(seed);
  const limits = FOREST_SCENE_LIMITS[qualityTier];
  const weather: ForestWeather = rng() > 0.62 ? "mist" : "calm";

  const leaves: Leaf[] = Array.from({ length: limits.leaves }, () => ({
    x: rng(),
    y: rng(),
    size: 5 + rng() * 11,
    rotation: rng() * Math.PI * 2,
    spin: (rng() - 0.5) * 0.9,
    fall: 0.012 + rng() * 0.03,
    sway: 8 + rng() * 18,
    phase: rng() * Math.PI * 2,
    color: (["leafA", "leafB", "leafC"] as const)[Math.floor(rng() * 3)],
  }));

  const insects: Insect[] = Array.from({ length: limits.insects }, () => ({
    kind: rng() > 0.45 ? "fly" : "crawl",
    x: rng(),
    y: rng() > 0.55 ? 0.12 + rng() * 0.3 : 0.78 + rng() * 0.18,
    speed: 0.008 + rng() * 0.02,
    phase: rng() * Math.PI * 2,
    scale: 0.7 + rng() * 0.6,
  }));

  const shafts: Shaft[] = Array.from({ length: limits.shafts }, () => ({
    x: 0.18 + rng() * 0.64,
    width: 28 + rng() * 54,
    angle: -0.28 + rng() * 0.18,
    alpha: 0.08 + rng() * 0.1,
  }));

  const pixels: PixelMote[] = Array.from({ length: limits.pixels }, () => {
    const roll = rng();
    const kind: PixelMote["kind"] =
      roll > 0.72
        ? "firefly"
        : roll > 0.42
          ? "pollen"
          : roll > 0.18
            ? "spore"
            : "seed";
    return {
      kind,
      x: rng(),
      y: rng(),
      size:
        kind === "spore"
          ? 2.4 + rng() * 3.2
          : kind === "seed"
            ? 1.6 + rng() * 1.4
            : kind === "firefly"
              ? 1.3 + rng() * 1.8
              : 0.7 + rng() * 0.9,
      phase: rng() * Math.PI * 2,
      speed: 0.003 + rng() * (kind === "spore" ? 0.006 : 0.016),
    };
  });

  return {
    seed,
    weather,
    leaves,
    insects,
    shafts,
    pixels,
    hills: [
      { y: 0.58, height: 0.22, depth: 0.18 },
      { y: 0.66, height: 0.28, depth: 0.38 },
      { y: 0.74, height: 0.32, depth: 0.62 },
    ],
  };
};

const drawLeaf = (
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
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.7, -size * 0.15, 0, size);
  ctx.quadraticCurveTo(-size * 0.7, -size * 0.15, 0, -size);
  ctx.fill();
  ctx.restore();
};

const drawInsect = (
  ctx: CanvasRenderingContext2D,
  insect: Insect,
  x: number,
  y: number,
  color: string,
): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.2 * insect.scale, 1.1 * insect.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  if (insect.kind === "fly") {
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(
      -2.4 * insect.scale,
      -1.4 * insect.scale,
      2.4 * insect.scale,
      1.1 * insect.scale,
      -0.4,
      0,
      Math.PI * 2,
    );
    ctx.ellipse(
      2.4 * insect.scale,
      -1.4 * insect.scale,
      2.4 * insect.scale,
      1.1 * insect.scale,
      0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
};

const drawTree = (
  ctx: CanvasRenderingContext2D,
  node: ForestNode,
  x: number,
  y: number,
  radius: number,
  palette: ForestPalette,
  focused: boolean,
  hovered: boolean,
  zoom: number,
  seconds: number,
  reducedMotion: boolean,
): void => {
  const scale = hovered ? 1.14 : 1;
  const sway = reducedMotion ? 0 : Math.sin(seconds * 1.1 + x * 0.01) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(4, 10, 7, 0.28)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    radius * 0.88,
    radius * 0.58,
    radius * 0.14,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = focused || hovered ? palette.leafC : palette.trunk;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.1, radius * 0.86);
  ctx.lineTo(-radius * 0.045, -radius * 0.02);
  ctx.lineTo(radius * 0.045, -radius * 0.02);
  ctx.lineTo(radius * 0.13, radius * 0.86);
  ctx.closePath();
  ctx.fill();

  if (zoom > 1.8) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = Math.max(1, radius * 0.03);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.01, radius * 0.12);
    ctx.quadraticCurveTo(radius * 0.02, radius * 0.4, 0, radius * 0.72);
    ctx.stroke();
  }

  const canopyRng = createRng(hashForestNodeSeed(node.id));
  const baseColor =
    node.kind === "grove" ? node.color : palette.canopyHighlight;
  const baseAlpha = node.kind === "grove" ? 0.5 : 0.92;
  // Jitter the silhouette itself (not just the texture on top of it) so
  // trees sharing the same node.radius don't all read as one stamp.
  const silhouetteRotation = (canopyRng() - 0.5) * 0.16;
  const silhouetteRx = radius * (0.88 + canopyRng() * 0.16);
  const silhouetteRy = radius * (0.64 + canopyRng() * 0.14);

  if (hovered || focused) {
    ctx.shadowColor = palette.firefly;
    ctx.shadowBlur = radius * 0.9;
  }
  ctx.globalAlpha = baseAlpha;
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(
    0,
    -radius * 0.22,
    silhouetteRx,
    silhouetteRy,
    silhouetteRotation,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  // Per-tree cluster texture: a deterministic-but-varied handful of soft
  // radial-gradient blobs (3-5, jittered position/size/color) instead of
  // the same two hard-edged side-lobes plus one full-size gold cap that
  // every tree in the grove previously shared.
  const clusterCount = 3 + Math.floor(canopyRng() * 3);
  for (let i = 0; i < clusterCount; i += 1) {
    const angle = (i / clusterCount) * Math.PI * 2 + (canopyRng() - 0.5) * 0.7;
    const distance = radius * (0.12 + canopyRng() * 0.3);
    const cx = Math.cos(angle) * distance;
    const cy = -radius * 0.22 + Math.sin(angle) * distance * 0.72;
    const size = radius * (0.32 + canopyRng() * 0.26);
    const roll = canopyRng();
    const clusterColor: keyof Pick<
      ForestPalette,
      "leafA" | "leafB" | "leafC"
    > = roll < 0.55 ? "leafA" : roll < 0.85 ? "leafB" : "leafC";
    // Gold (leafC) now reads as an occasional light-catching accent
    // rather than a same-size, same-position ellipse on every tree.
    const isAccent = clusterColor === "leafC";
    const gradient = ctx.createRadialGradient(
      cx - size * 0.3,
      cy - size * 0.35,
      size * 0.05,
      cx,
      cy,
      size,
    );
    gradient.addColorStop(0, palette[clusterColor]);
    gradient.addColorStop(1, `${palette[clusterColor]}00`);
    ctx.globalAlpha = isAccent ? 0.4 : 0.62;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size, size * 0.78, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hovered || focused || zoom > 2) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f4f7f0";
    ctx.font = `${Math.max(11, Math.round(radius * 0.26))}px "Bitter", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.initials || node.name.slice(0, 2), 0, -radius * 0.2);
  }

  if (hovered) {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = palette.firefly;
    ctx.lineWidth = Math.max(1.5, radius * 0.06);
    ctx.beginPath();
    ctx.ellipse(
      0,
      -radius * 0.18,
      radius * 1.12,
      radius * 0.88,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.restore();
};

export const drawForestScene = ({
  ctx,
  width,
  height,
  scene,
  nodes,
  camera,
  focusedId,
  hoveredId,
  timeMs,
  isDarkMode,
  qualityTier,
  pointer,
  reducedMotion,
}: DrawForestSceneOptions): void => {
  const phase = resolveForestDayPhase(timeMs);
  const palette = createForestPalette(isDarkMode, phase, scene.weather);
  const limits = FOREST_SCENE_LIMITS[qualityTier];
  const pointerX = pointer ? (pointer.x / width - 0.5) * 2 : 0;
  const pointerY = pointer ? (pointer.y / height - 0.5) * 2 : 0;
  const parallax = reducedMotion ? 0 : limits.parallax;
  const seconds = timeMs / 1000;
  const minSize = Math.min(width, height);

  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  scene.hills.forEach((hill, index) => {
    const shiftX = pointerX * parallax * hill.depth * 18;
    const shiftY = pointerY * parallax * hill.depth * 8;
    const color =
      index === 0
        ? palette.hillFar
        : index === 1
          ? palette.hillMid
          : palette.canopy;
    const ridgeY = height * hill.y + shiftY;
    const amplitude = hill.height * height * 0.28;
    ctx.beginPath();
    ctx.moveTo(-120 + shiftX, height + 80);
    ctx.lineTo(-120 + shiftX, ridgeY);
    const peaks = 5 + index;
    for (let i = 0; i <= peaks; i += 1) {
      const startX = ((width + 240) * i) / peaks - 120 + shiftX;
      const endX = ((width + 240) * (i + 1)) / peaks - 120 + shiftX;
      const midX = (startX + endX) / 2;
      const peak = ridgeY + Math.sin(i * 1.15 + index * 1.7) * amplitude;
      const next =
        ridgeY + Math.sin((i + 1) * 1.15 + index * 1.7) * amplitude * 0.65;
      ctx.quadraticCurveTo(midX, peak, endX, next);
    }
    ctx.lineTo(width + 120 + shiftX, height + 80);
    ctx.closePath();
    const wash = ctx.createLinearGradient(0, ridgeY - amplitude, 0, height);
    wash.addColorStop(0, `${color}00`);
    wash.addColorStop(0.22, color);
    wash.addColorStop(1, color);
    ctx.fillStyle = wash;
    ctx.fill();
  });

  const mist = ctx.createLinearGradient(0, height * 0.48, 0, height);
  mist.addColorStop(0, "rgba(0,0,0,0)");
  mist.addColorStop(1, palette.mist);
  ctx.fillStyle = mist;
  ctx.fillRect(0, height * 0.48, width, height * 0.52);

  scene.shafts.forEach((shaft) => {
    const originX =
      shaft.x * width +
      pointerX * parallax * 36 +
      (reducedMotion ? 0 : Math.sin(seconds * 0.15 + shaft.x) * 10);
    ctx.save();
    ctx.translate(originX, 0);
    ctx.rotate(shaft.angle + pointerX * parallax * 0.08);
    const shaftGradient = ctx.createLinearGradient(0, 0, 0, height * 0.86);
    shaftGradient.addColorStop(0, palette.shaft);
    shaftGradient.addColorStop(1, "rgba(232, 197, 71, 0)");
    ctx.fillStyle = shaftGradient;
    ctx.globalAlpha = shaft.alpha;
    ctx.beginPath();
    ctx.moveTo(-shaft.width * 0.15, 0);
    ctx.lineTo(shaft.width * 0.15, 0);
    ctx.lineTo(shaft.width, height * 0.86);
    ctx.lineTo(-shaft.width, height * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  nodes.forEach((node) => {
    const screen = worldToScreen(node.x, node.y, camera, width, height);
    if (
      screen.x < -120 ||
      screen.y < -120 ||
      screen.x > width + 120 ||
      screen.y > height + 120
    ) {
      return;
    }
    const radius = node.radius * camera.zoom * minSize;
    drawTree(
      ctx,
      node,
      screen.x,
      screen.y,
      radius,
      palette,
      focusedId === node.id,
      hoveredId === node.id,
      camera.zoom,
      seconds,
      reducedMotion,
    );
  });

  scene.leaves.forEach((leaf) => {
    const travel = reducedMotion
      ? leaf.y
      : (leaf.y + seconds * leaf.fall) % 1.15;
    const x =
      leaf.x * width +
      Math.sin(seconds * 0.7 + leaf.phase) * (reducedMotion ? 0 : leaf.sway) +
      pointerX * parallax * 10;
    const y = travel * height - leaf.size;
    const rotation = leaf.rotation + (reducedMotion ? 0 : seconds * leaf.spin);
    drawLeaf(ctx, x, y, leaf.size, rotation, palette[leaf.color]);
  });

  scene.insects.forEach((insect) => {
    const path = reducedMotion
      ? insect.x
      : (insect.x + seconds * insect.speed) % 1.1;
    const bob = reducedMotion
      ? 0
      : Math.sin(seconds * (insect.kind === "fly" ? 2.4 : 1.1) + insect.phase) *
        (insect.kind === "fly" ? 10 : 3);
    drawInsect(
      ctx,
      insect,
      path * width,
      insect.y * height + bob,
      palette.insect,
    );
  });

  scene.pixels.forEach((pixel) => {
    const drift = reducedMotion ? 0 : Math.sin(seconds * 0.8 + pixel.phase) * 8;
    const twinkle = reducedMotion
      ? 0.45
      : 0.25 +
        Math.abs(
          Math.sin(
            seconds * (pixel.kind === "firefly" ? 3 : 1.2) + pixel.phase,
          ),
        ) *
          0.75;
    const x =
      ((pixel.x + (reducedMotion ? 0 : seconds * pixel.speed * 0.15)) % 1) *
        width +
      drift;
    const y = pixel.y * height;
    ctx.globalAlpha = twinkle;
    if (pixel.kind === "seed") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(seconds * 2.4 + pixel.phase);
      ctx.fillStyle = palette.leafC;
      ctx.beginPath();
      ctx.moveTo(0, -pixel.size);
      ctx.lineTo(pixel.size * 0.7, 0);
      ctx.lineTo(0, pixel.size);
      ctx.lineTo(-pixel.size * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle =
        pixel.kind === "firefly"
          ? palette.firefly
          : pixel.kind === "spore"
            ? palette.mist
            : palette.pollen;
      ctx.beginPath();
      ctx.arc(x, y, pixel.size, 0, Math.PI * 2);
      ctx.fill();
      if (pixel.kind === "firefly") {
        ctx.globalAlpha = twinkle * 0.22;
        ctx.beginPath();
        ctx.arc(x, y, pixel.size * 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  ctx.globalAlpha = 1;

  if (pointer) {
    const glow = ctx.createRadialGradient(
      pointer.x,
      pointer.y,
      8,
      pointer.x,
      pointer.y,
      140,
    );
    glow.addColorStop(0, "rgba(232, 197, 71, 0.18)");
    glow.addColorStop(0.45, "rgba(63, 143, 90, 0.1)");
    glow.addColorStop(1, "rgba(63, 143, 90, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 140, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = palette.vignette;
  ctx.fillRect(0, 0, width, height * 0.16);
  ctx.fillRect(0, height * 0.84, width, height * 0.16);
};
