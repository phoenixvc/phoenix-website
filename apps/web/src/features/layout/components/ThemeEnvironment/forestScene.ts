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
  pineDark: string;
  pineMid: string;
  pineLight: string;
  birchTrunk: string;
  birchMark: string;
  birchLeaf: string;
}

export type ForestTreeSpecies = "oak" | "pine" | "willow" | "birch";

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
      pineDark: "#274a30",
      pineMid: "#3c6b46",
      pineLight: "#588860",
      birchTrunk: "#e2ddc9",
      birchMark: "#3a2f22",
      birchLeaf: "#8fd19e",
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
    pineDark: "#0c2116",
    pineMid: "#173d26",
    pineLight: "#2c5c3a",
    birchTrunk: "#b9b29c",
    birchMark: "#241d15",
    // Darkened from the light-mode #8fd19e, same treatment as pineLight/
    // canopyHighlight above, so birch canopies don't stay lit against an
    // otherwise-darkened night palette.
    birchLeaf: "#3f7a50",
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

// Deterministic species assignment, decoupled from the shape-jitter RNG
// stream (separate hash suffix) so picking a species doesn't consume a
// draw from the sequence the shape itself relies on.
const pickForestSpecies = (id: string): ForestTreeSpecies => {
  const roll = createRng(hashForestNodeSeed(`${id}-species`))();
  if (roll < 0.45) return "oak";
  if (roll < 0.72) return "pine";
  if (roll < 0.88) return "birch";
  return "willow";
};

// Filled + lightly-stroked circle. Drawing several of these back-to-front
// (each painting over the previous one's fill AND stroke where they
// overlap) leaves only the un-covered edges outlined, which is what
// produces a scalloped, leafy-looking silhouette instead of one smoothed
// blob — the overlap does the shaping work, not the stroke itself.
const fillForestClump = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  light: string,
  mid: string,
  dark: string,
): void => {
  const gradient = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.4,
    r * 0.05,
    cx,
    cy,
    r * 1.05,
  );
  gradient.addColorStop(0, light);
  gradient.addColorStop(0.6, mid);
  gradient.addColorStop(1, dark);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(4, 10, 7, 0.18)";
  ctx.lineWidth = Math.max(1, r * 0.012);
  ctx.stroke();
};

const drawForestClumpAccents = (
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  radius: number,
  palette: ForestPalette,
  centerY: number,
): void => {
  const accentCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < accentCount; i += 1) {
    const angle = rng() * Math.PI * 2;
    const dist = radius * rng() * 0.4;
    const cx = Math.cos(angle) * dist;
    const cy = centerY + Math.sin(angle) * dist * 0.7;
    const size = radius * (0.13 + rng() * 0.13);
    const color = rng() < 0.7 ? palette.leafB : palette.leafC;
    // Dappled light: a soft radial fade to transparent, not a flat dot,
    // so it reads as a highlight rather than a pasted-on sticker.
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    ctx.globalAlpha = color === palette.leafC ? 0.5 : 0.4;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

// Oak: the default broadleaf silhouette. A handful of tightly-overlapping
// clumps (not the same 7 loosely-spaced ones from the first pass — fewer,
// bigger, more overlap reads as one rounded mass rather than bubble wrap)
// plus dappled-light accents. `groveColor`, when set, tints the clumps
// with the grove marker's own signature color instead of the species'
// natural tones, so grove markers keep their distinct color-coded
// identity while still getting the improved shape.
const drawForestOak = (
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  radius: number,
  palette: ForestPalette,
  trunkColor: string,
  groveColor?: string,
): void => {
  ctx.fillStyle = trunkColor;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.1, radius * 0.86);
  ctx.lineTo(-radius * 0.045, -radius * 0.02);
  ctx.lineTo(radius * 0.045, -radius * 0.02);
  ctx.lineTo(radius * 0.13, radius * 0.86);
  ctx.closePath();
  ctx.fill();

  ctx.translate(0, -radius * 0.3);
  const light = groveColor ?? palette.leafA;
  const mid = groveColor ?? palette.canopyHighlight;
  const clumpCount = 4 + Math.floor(rng() * 2);
  const clumps: Array<{ x: number; y: number; r: number; depth: number }> =
    [];
  for (let i = 0; i < clumpCount; i += 1) {
    const angle = (i / clumpCount) * Math.PI * 2 + (rng() - 0.5) * 0.6;
    const dist = radius * (0.12 + rng() * 0.22);
    clumps.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.7 - radius * 0.08,
      r: radius * (0.5 + rng() * 0.22),
      depth: rng(),
    });
  }
  clumps.push({ x: 0, y: -radius * 0.12, r: radius * 0.68, depth: 0.5 });
  clumps.sort((a, b) => a.depth - b.depth);
  clumps.forEach((clump) =>
    fillForestClump(ctx, clump.x, clump.y, clump.r, light, mid, "#12291b"),
  );
  drawForestClumpAccents(ctx, rng, radius, palette, -radius * 0.12);
};

// Pine: tiered tapering triangles with a serrated (in/out jittered) edge
// instead of a smooth curve, plus a short trunk stub peeking below the
// lowest tier — the tiers cover most of it, matching how a real conifer's
// trunk is mostly hidden by its own branches.
const drawForestPine = (
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  radius: number,
  palette: ForestPalette,
  trunkColor: string,
): void => {
  ctx.fillStyle = trunkColor;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.07, radius * 0.86);
  ctx.lineTo(-radius * 0.05, radius * 0.38);
  ctx.lineTo(radius * 0.05, radius * 0.38);
  ctx.lineTo(radius * 0.07, radius * 0.86);
  ctx.closePath();
  ctx.fill();

  const tiers = 3;
  const notchScale = radius * 0.07;
  const serratedSide = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    outward: number,
  ): void => {
    const notches = 4;
    for (let n = 1; n <= notches; n += 1) {
      const t = n / notches;
      const px = fromX + (toX - fromX) * t;
      const py = fromY + (toY - fromY) * t;
      const jitter = (0.5 + rng() * 0.5) * notchScale;
      const notchOut = n % 2 === 1;
      const offset = (notchOut ? 1 : -0.35) * jitter * outward;
      ctx.lineTo(px + offset, py);
    }
  };

  for (let t = 0; t < tiers; t += 1) {
    const tierY = -radius * 0.15 - t * radius * 0.42;
    const tierW = radius * (1.05 - t * 0.22) * (0.9 + rng() * 0.12);
    const tierH = radius * 0.58;
    const apexX = 0;
    const apexY = tierY - tierH * 0.65;
    const rightX = tierW;
    const rightY = tierY + tierH;
    const leftX = -tierW;
    const light = t === tiers - 1 ? palette.pineLight : palette.pineMid;
    const gradient = ctx.createLinearGradient(
      -tierW,
      tierY,
      tierW,
      tierY + tierH,
    );
    gradient.addColorStop(0, light);
    gradient.addColorStop(0.55, palette.pineMid);
    gradient.addColorStop(1, palette.pineDark);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    serratedSide(apexX, apexY, rightX, rightY, 1);
    ctx.lineTo(leftX, rightY);
    serratedSide(leftX, rightY, apexX, apexY, -1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(4, 10, 7, 0.22)";
    ctx.lineWidth = Math.max(1, radius * 0.012);
    ctx.stroke();
  }
};

// Willow: a small rounded crown plus long drooping curved strands, each
// carrying a couple of small leaf dots so it reads as trailing foliage
// rather than bare wire.
const drawForestWillow = (
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  radius: number,
  palette: ForestPalette,
  trunkColor: string,
): void => {
  ctx.fillStyle = trunkColor;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.1, radius * 0.86);
  ctx.lineTo(-radius * 0.045, -radius * 0.02);
  ctx.lineTo(radius * 0.045, -radius * 0.02);
  ctx.lineTo(radius * 0.13, radius * 0.86);
  ctx.closePath();
  ctx.fill();

  ctx.translate(0, -radius * 0.05);
  const crownClumps = 3;
  for (let i = 0; i < crownClumps; i += 1) {
    const angle = (i / crownClumps) * Math.PI * 2;
    const dist = radius * 0.2;
    fillForestClump(
      ctx,
      Math.cos(angle) * dist,
      -radius * 0.5 + Math.sin(angle) * dist * 0.6,
      radius * 0.44,
      palette.leafA,
      palette.canopyHighlight,
      "#12291b",
    );
  }

  const strandCount = 8 + Math.floor(rng() * 4);
  const strandColors = [palette.leafA, palette.canopyHighlight];
  for (let i = 0; i < strandCount; i += 1) {
    const startX =
      Math.cos(Math.PI * (i / strandCount)) *
      radius *
      0.75 *
      (i % 2 === 0 ? 1 : 0.6);
    const startY = -radius * 0.55 + rng() * radius * 0.15;
    const sway = (rng() - 0.5) * radius * 0.3;
    const length = radius * (0.75 + rng() * 0.55);
    const midX = startX + sway;
    const midY = startY + length * 0.6;
    const endX = startX + sway * 0.5;
    const endY = startY + length;
    ctx.strokeStyle = strandColors[i % strandColors.length];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1, radius * 0.02);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    const dotCount = 2 + Math.floor(rng() * 2);
    ctx.fillStyle = strandColors[(i + 1) % strandColors.length];
    for (let d = 1; d <= dotCount; d += 1) {
      const t = d / (dotCount + 1);
      const dx =
        startX +
        (midX - startX) * t * 0.6 +
        (endX - midX) * Math.max(0, t - 0.6);
      const dy = startY + (endY - startY) * t;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(dx, dy, radius * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

// Birch: a slender pale trunk with randomized dark bark marks, topped
// with a small sparse canopy — deliberately the outlier silhouette among
// the four so a grove doesn't read as one species repeated.
const drawForestBirch = (
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  radius: number,
  palette: ForestPalette,
): void => {
  ctx.fillStyle = palette.birchTrunk;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.06, radius * 0.86);
  ctx.lineTo(-radius * 0.03, -radius * 0.55);
  ctx.lineTo(radius * 0.03, -radius * 0.55);
  ctx.lineTo(radius * 0.07, radius * 0.86);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.birchMark;
  let markY = radius * 0.72;
  while (markY > -radius * 0.45) {
    const width = radius * (0.06 + rng() * 0.06);
    const alignRight = rng() > 0.5;
    ctx.globalAlpha = 0.75 + rng() * 0.25;
    ctx.fillRect(
      alignRight ? radius * 0.005 : -width - radius * 0.005,
      markY,
      width,
      radius * (0.02 + rng() * 0.015),
    );
    markY -= radius * (0.22 + rng() * 0.16);
  }
  ctx.globalAlpha = 1;

  const clumpCount = 3;
  for (let i = 0; i < clumpCount; i += 1) {
    const angle = (i / clumpCount) * Math.PI * 2 + rng();
    const dist = radius * 0.14;
    fillForestClump(
      ctx,
      Math.cos(angle) * dist,
      -radius * 0.62 + Math.sin(angle) * dist * 0.6,
      radius * 0.3,
      palette.birchLeaf,
      palette.leafA,
      palette.canopyHighlight,
    );
  }
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

  // Grove markers stay a single recognizable "big glowing area marker"
  // shape (oak, tinted with the grove's own signature color) rather than
  // getting species variety, which is for the individual tree/clearing
  // nodes that actually stand in for real content.
  const species: ForestTreeSpecies =
    node.kind === "grove" ? "oak" : pickForestSpecies(node.id);
  const canopyRng = createRng(hashForestNodeSeed(node.id));
  const trunkColor = focused || hovered ? palette.leafC : palette.trunk;

  if (hovered || focused) {
    ctx.shadowColor = palette.firefly;
    ctx.shadowBlur = radius * 0.9;
  }
  ctx.save();
  if (node.kind === "grove") {
    ctx.globalAlpha = 0.6;
  }
  if (species === "pine") {
    drawForestPine(ctx, canopyRng, radius, palette, trunkColor);
  } else if (species === "willow") {
    drawForestWillow(ctx, canopyRng, radius, palette, trunkColor);
  } else if (species === "birch") {
    drawForestBirch(ctx, canopyRng, radius, palette);
  } else {
    drawForestOak(
      ctx,
      canopyRng,
      radius,
      palette,
      trunkColor,
      node.kind === "grove" ? node.color : undefined,
    );
  }
  ctx.restore();
  ctx.shadowBlur = 0;

  if (zoom > 1.8 && (species === "oak" || species === "willow")) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = Math.max(1, radius * 0.03);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.01, radius * 0.12);
    ctx.quadraticCurveTo(radius * 0.02, radius * 0.4, 0, radius * 0.72);
    ctx.stroke();
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
