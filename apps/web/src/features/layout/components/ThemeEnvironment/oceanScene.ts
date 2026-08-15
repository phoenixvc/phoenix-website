import type { EnvironmentQualityTier } from "./types";
import {
  type OceanCamera,
  type OceanNode,
  worldToScreen,
} from "./oceanWorld";

export const OCEAN_FRAME_BUDGET_MS = {
  low: 0,
  medium: 6,
  high: 8,
} as const;

export const OCEAN_SCENE_LIMITS = {
  low: { bubbles: 20, jellyfish: 2, vents: 1, rays: 3, parallax: 0 },
  medium: { bubbles: 50, jellyfish: 4, vents: 2, rays: 5, parallax: 0.35 },
  high: { bubbles: 95, jellyfish: 7, vents: 3, rays: 7, parallax: 0.7 },
} as const;

export const OCEAN_DAY_CYCLE_MS = 60_000;
export const OCEAN_DEFAULT_SEED = 20260815;

export type OceanDepthPhase =
  | "sunlit-shallows"
  | "twilight-mesopelagic"
  | "midnight-bathypelagic"
  | "abyssal-hadopelagic";

export interface OceanPointer {
  x: number;
  y: number;
}

export interface OceanBubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  phase: number;
  alpha: number;
}

export interface OceanJellyfish {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  pulsePhase: number;
  tentacleCount: number;
  tentacleLength: number;
  color: string;
}

export interface OceanVentSmoke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxLife: number;
  life: number;
  alpha: number;
}

export interface OceanCausticRay {
  x: number;
  width: number;
  angle: number;
  alpha: number;
  freq: number;
}

export interface OceanRidge {
  y: number;
  height: number;
  depth: number;
  frequency: number;
}

export interface OceanScene {
  seed: number;
  bubbles: OceanBubble[];
  jellyfish: OceanJellyfish[];
  rays: OceanCausticRay[];
  ridges: OceanRidge[];
  ventPositions: Array<{ x: number; y: number }>;
}

export interface DrawOceanSceneOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: OceanScene;
  nodes: OceanNode[];
  camera: OceanCamera;
  focusedNode?: OceanNode | null;
  hoveredNode?: OceanNode | null;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: OceanPointer | null;
  reducedMotion: boolean;
  pinnedNodes?: OceanNode[];
  scrollY?: number;
  modeProgress?: number;
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

export const createOceanScene = (
  seed: number,
  qualityTier: EnvironmentQualityTier,
): OceanScene => {
  const rng = createRng(seed);
  const limits = OCEAN_SCENE_LIMITS[qualityTier];

  const bubbles: OceanBubble[] = Array.from({ length: limits.bubbles }, () => ({
    x: rng(),
    y: rng(),
    radius: 1.5 + rng() * 4.5,
    speed: 0.0004 + rng() * 0.0009,
    wobbleSpeed: 2 + rng() * 4,
    wobbleAmp: 0.008 + rng() * 0.015,
    phase: rng() * Math.PI * 2,
    alpha: 0.25 + rng() * 0.55,
  }));

  const jellyColors = [
    "#00F0FF", // Electric Cyan
    "#38BDF8", // Sky Aqua
    "#14B8A6", // Seafoam
    "#A78BFA", // Bioluminescent Purple
    "#67E8F9", // Bright Ice
  ];

  const jellyfish: OceanJellyfish[] = Array.from(
    { length: limits.jellyfish },
    (_, idx) => ({
      x: 0.15 + (idx / Math.max(1, limits.jellyfish)) * 0.7 + (rng() - 0.5) * 0.1,
      y: 0.2 + rng() * 0.6,
      radius: 14 + rng() * 16,
      speedY: 0.00015 + rng() * 0.0003,
      speedX: (rng() - 0.5) * 0.0001,
      pulsePhase: rng() * Math.PI * 2,
      tentacleCount: 4 + Math.floor(rng() * 4),
      tentacleLength: 30 + rng() * 45,
      color: jellyColors[idx % jellyColors.length],
    }),
  );

  const rays: OceanCausticRay[] = Array.from({ length: limits.rays }, () => ({
    x: rng(),
    width: 0.12 + rng() * 0.24,
    angle: -0.15 + rng() * 0.3,
    alpha: 0.06 + rng() * 0.12,
    freq: 1.2 + rng() * 2.0,
  }));

  const ridges: OceanRidge[] = [
    { y: 0.72, height: 0.16, depth: 0.25, frequency: 2.8 },
    { y: 0.82, height: 0.22, depth: 0.55, frequency: 4.2 },
    { y: 0.90, height: 0.26, depth: 0.85, frequency: 6.0 },
  ];

  const ventPositions = Array.from({ length: limits.vents }, () => ({
    x: 0.2 + rng() * 0.6,
    y: 0.88 + rng() * 0.06,
  }));

  return {
    seed,
    bubbles,
    jellyfish,
    rays,
    ridges,
    ventPositions,
  };
};

export const drawOceanScene = ({
  ctx,
  width,
  height,
  scene,
  nodes,
  camera,
  focusedNode,
  hoveredNode,
  timeMs,
  isDarkMode,
  qualityTier: _qualityTier,
  pointer,
  reducedMotion,
  pinnedNodes = [],
  scrollY = 0,
  modeProgress = isDarkMode ? 1.0 : 0.0,
}: DrawOceanSceneOptions): void => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const t = timeMs * 0.001;
  const parallaxX = pointer && !reducedMotion ? (pointer.x - width * 0.5) * 0.04 : 0;
  const parallaxY = pointer && !reducedMotion ? (pointer.y - height * 0.5) * 0.04 : 0;

  // 1. Deep Ocean Sky/Water Gradient
  // Interpolate between dark mode (deep abyss #030b14) and light mode (sunlit reef #e0f2fe)
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (modeProgress > 0.5) {
    // Dark Abyss
    grad.addColorStop(0, "#030B17"); // Surface twilight
    grad.addColorStop(0.4, "#051329"); // Mesopelagic
    grad.addColorStop(0.75, "#040D1B"); // Bathypelagic
    grad.addColorStop(1, "#02060D"); // Hadal Abyss
  } else {
    // Light Tropical Reef
    grad.addColorStop(0, "#E0F2FE");
    grad.addColorStop(0.4, "#BAE6FD");
    grad.addColorStop(0.75, "#7DD3FC");
    grad.addColorStop(1, "#38BDF8");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Light Caustics from above
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = modeProgress > 0.5 ? "screen" : "overlay";
    scene.rays.forEach((ray, i) => {
      const rayAlpha = ray.alpha * (0.8 + 0.2 * Math.sin(t * ray.freq + i));
      const rayGrad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
      rayGrad.addColorStop(
        0,
        modeProgress > 0.5
          ? `rgba(0, 240, 255, ${rayAlpha * 1.5})`
          : `rgba(255, 255, 255, ${rayAlpha * 2.2})`,
      );
      rayGrad.addColorStop(1, "rgba(0, 240, 255, 0)");

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      const rx = ray.x * width + Math.sin(t * 0.4 + i) * 30 + parallaxX * 0.2;
      const topWidth = ray.width * width * 0.5;
      const bottomWidth = ray.width * width * 1.4;

      ctx.moveTo(rx - topWidth, 0);
      ctx.lineTo(rx + topWidth, 0);
      ctx.lineTo(rx + bottomWidth + ray.angle * height, height * 0.7);
      ctx.lineTo(rx - bottomWidth + ray.angle * height, height * 0.7);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  // 3. Abyssal Ridge Silhouettes
  scene.ridges.forEach((ridge, rIdx) => {
    ctx.save();
    const ridgeAlpha = 0.4 + rIdx * 0.25;
    ctx.fillStyle =
      modeProgress > 0.5
        ? `rgba(3, 11, 23, ${ridgeAlpha})`
        : `rgba(2, 132, 199, ${ridgeAlpha * 0.6})`;

    ctx.beginPath();
    const startY = (ridge.y - scrollY * 0.00015 * ridge.depth) * height + parallaxY * (0.1 + rIdx * 0.1);
    ctx.moveTo(0, height);
    ctx.lineTo(0, startY);

    const steps = 30;
    for (let s = 0; s <= steps; s++) {
      const sx = (s / steps) * width;
      const wave =
        Math.sin(s * 0.4 * ridge.frequency + rIdx * 2.1) * (ridge.height * height * 0.3) +
        Math.cos(s * 0.7 * ridge.frequency + scene.seed) * (ridge.height * height * 0.15);
      ctx.lineTo(sx, startY + wave);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 4. Drifting Jellyfish
  scene.jellyfish.forEach((jelly, jIdx) => {
    ctx.save();
    const cycle = reducedMotion ? 0 : t * 1.5 + jelly.pulsePhase;
    const contraction = Math.sin(cycle);
    const scaleY = 1.0 - contraction * 0.2;
    const scaleX = 1.0 + contraction * 0.15;

    let jx = jelly.x * width + parallaxX * 0.4;
    let jy = jelly.y * height + parallaxY * 0.4;

    if (!reducedMotion) {
      jy = ((jelly.y - t * jelly.speedY) % 1.2 + 1.2) % 1.2 * height;
      jx += Math.sin(t * 0.5 + jIdx) * 20;
    }

    ctx.translate(jx, jy);

    // Jellyfish Bell (Umbrella)
    const bellRadius = jelly.radius * Math.min(width, height) * 0.0018;
    const bellGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bellRadius);
    bellGrad.addColorStop(0, `${jelly.color}66`);
    bellGrad.addColorStop(0.7, `${jelly.color}33`);
    bellGrad.addColorStop(1, `${jelly.color}00`);

    ctx.fillStyle = bellGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bellRadius * scaleX, bellRadius * scaleY * 0.8, 0, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Bell rim stroke
    ctx.strokeStyle = `${jelly.color}aa`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tentacles
    ctx.strokeStyle = `${jelly.color}55`;
    ctx.lineWidth = 1;
    for (let tent = 0; tent < jelly.tentacleCount; tent++) {
      const offsetX = ((tent - (jelly.tentacleCount - 1) / 2) / jelly.tentacleCount) * bellRadius * 1.4;
      ctx.beginPath();
      ctx.moveTo(offsetX, 0);
      const tentLength = jelly.tentacleLength;
      const waveOffset = Math.sin(cycle + tent * 0.5) * 6;
      ctx.bezierCurveTo(
        offsetX + waveOffset,
        tentLength * 0.35,
        offsetX - waveOffset,
        tentLength * 0.7,
        offsetX + waveOffset * 0.5,
        tentLength,
      );
      ctx.stroke();
    }

    ctx.restore();
  });

  // 5. Ascending Bubbles
  ctx.save();
  scene.bubbles.forEach((bubble) => {
    let bx = bubble.x * width + parallaxX * 0.5;
    let by = bubble.y * height + parallaxY * 0.5;

    if (!reducedMotion) {
      by = ((bubble.y - t * bubble.speed * 60) % 1.1 + 1.1) % 1.1 * height;
      bx += Math.sin(t * bubble.wobbleSpeed + bubble.phase) * (bubble.wobbleAmp * width);
    }

    const bRadius = bubble.radius;
    const bubbleGrad = ctx.createRadialGradient(
      bx - bRadius * 0.3,
      by - bRadius * 0.3,
      bRadius * 0.1,
      bx,
      by,
      bRadius,
    );
    bubbleGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    bubbleGrad.addColorStop(0.5, "rgba(0, 240, 255, 0.3)");
    bubbleGrad.addColorStop(1, "rgba(20, 184, 166, 0.1)");

    ctx.fillStyle = bubbleGrad;
    ctx.beginPath();
    ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 0.75;
    ctx.stroke();
  });
  ctx.restore();

  // 6. Constellation / Bioluminescent Filament Connections
  ctx.save();
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const posA = worldToScreen(nodeA.x, nodeA.y, width, height, camera);
      const posB = worldToScreen(nodeB.x, nodeB.y, width, height, camera);
      const dx = posA.x - posB.x;
      const dy = posA.y - posB.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < width * 0.38) {
        const lineAlpha = (1 - dist / (width * 0.38)) * 0.22;
        ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.lineTo(posB.x, posB.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // 7. Interactive Pelagic World Nodes (Spires, Vents, Reefs)
  nodes.forEach((node) => {
    ctx.save();
    const pos = worldToScreen(node.x, node.y, width, height, camera);
    const isHovered = hoveredNode?.id === node.id;
    const isFocused = focusedNode?.id === node.id;
    const isPinned = pinnedNodes.some((p) => p.id === node.id);

    const baseRadius = node.radius * pos.scale;
    const radius = isHovered || isFocused ? baseRadius * 1.25 : baseRadius;

    // Pulsing outer bioluminescent ring
    const pulse = Math.sin(t * 3 + node.x * 10) * 0.15;
    const ringRadius = radius * (1.35 + pulse + (isPinned ? 0.3 : 0));

    const glowGrad = ctx.createRadialGradient(
      pos.x,
      pos.y,
      radius * 0.3,
      pos.x,
      pos.y,
      ringRadius * 1.8,
    );
    glowGrad.addColorStop(0, node.glow);
    glowGrad.addColorStop(1, "rgba(0, 240, 255, 0)");

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ringRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Outer Bioluminescent Orbit Ring
    ctx.strokeStyle = isPinned ? "#00F0FF" : node.accent;
    ctx.lineWidth = isPinned ? 2.5 : 1.5;
    ctx.setLineDash(isPinned ? [4, 4] : []);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Core Orb
    const coreGrad = ctx.createRadialGradient(
      pos.x - radius * 0.3,
      pos.y - radius * 0.3,
      radius * 0.1,
      pos.x,
      pos.y,
      radius,
    );
    coreGrad.addColorStop(0, "#FFFFFF");
    coreGrad.addColorStop(0.4, node.accent);
    coreGrad.addColorStop(1, "#030B17");

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Node label
    ctx.fillStyle = modeProgress > 0.5 ? "#FFFFFF" : "#030B17";
    ctx.font = `600 ${Math.max(11, Math.floor(13 * pos.scale))}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.name, pos.x, pos.y + radius + 14 * pos.scale);

    ctx.restore();
  });

  ctx.restore();
};
