import type { EnvironmentQualityTier } from "./types";
import {
  type LavenderCamera,
  type LavenderNode,
  worldToScreen,
} from "./lavenderWorld";

export const LAVENDER_FRAME_BUDGET_MS = {
  low: 0,
  medium: 6,
  high: 8,
} as const;

export const LAVENDER_SCENE_LIMITS = {
  low: { petals: 25, spores: 30, rays: 3 },
  medium: { petals: 60, spores: 75, rays: 5 },
  high: { petals: 110, spores: 140, rays: 7 },
} as const;

export const LAVENDER_DEFAULT_SEED = 20260817;

export interface LavenderPointer {
  x: number;
  y: number;
}

export interface LavenderPetal {
  x: number;
  y: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  length: number;
  width: number;
  wobblePhase: number;
  wobbleSpeed: number;
  color: string;
  alpha: number;
}

export interface LavenderSpore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  pulsePhase: number;
}

export interface LavenderRay {
  x: number;
  angle: number;
  width: number;
  alpha: number;
  freq: number;
}

export interface LavenderScene {
  seed: number;
  petals: LavenderPetal[];
  spores: LavenderSpore[];
  rays: LavenderRay[];
}

export interface DrawLavenderSceneOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: LavenderScene;
  nodes: LavenderNode[];
  camera: LavenderCamera;
  focusedNode?: LavenderNode | null;
  hoveredNode?: LavenderNode | null;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: LavenderPointer | null;
  reducedMotion: boolean;
  pinnedNodes?: LavenderNode[];
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

export const createLavenderScene = (
  seed: number,
  qualityTier: EnvironmentQualityTier,
): LavenderScene => {
  const rng = createRng(seed);
  const limits = LAVENDER_SCENE_LIMITS[qualityTier];

  const petalColors = [
    "#C084FC", // Purple 400
    "#A855F7", // Purple 500
    "#E879F9", // Fuchsia 400
    "#D8B4FE", // Lavender 300
    "#DDD6FE", // Violet 200
  ];

  const petals: LavenderPetal[] = Array.from(
    { length: limits.petals },
    () => ({
      x: rng(),
      y: rng(),
      speedY: 0.0003 + rng() * 0.0007,
      speedX: 0.00015 + rng() * 0.0004,
      rotation: rng() * Math.PI * 2,
      rotationSpeed: (rng() - 0.5) * 2.5,
      length: 6 + rng() * 9,
      width: 3.5 + rng() * 4.5,
      wobblePhase: rng() * Math.PI * 2,
      wobbleSpeed: 1.5 + rng() * 3.0,
      color: petalColors[Math.floor(rng() * petalColors.length)],
      alpha: 0.35 + rng() * 0.55,
    }),
  );

  const spores: LavenderSpore[] = Array.from(
    { length: limits.spores },
    () => ({
      x: rng(),
      y: rng(),
      vx: (rng() - 0.5) * 0.0001,
      vy: -0.0002 - rng() * 0.0004,
      radius: 1.2 + rng() * 2.8,
      alpha: 0.25 + rng() * 0.6,
      pulsePhase: rng() * Math.PI * 2,
    }),
  );

  const rays: LavenderRay[] = Array.from({ length: limits.rays }, () => ({
    x: rng(),
    angle: -0.2 + rng() * 0.4,
    width: 0.12 + rng() * 0.22,
    alpha: 0.07 + rng() * 0.12,
    freq: 1.1 + rng() * 1.8,
  }));

  return {
    seed,
    petals,
    spores,
    rays,
  };
};

export const drawLavenderScene = ({
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
}: DrawLavenderSceneOptions): void => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const t = timeMs * 0.001;
  const parallaxX = pointer && !reducedMotion ? (pointer.x - width * 0.5) * 0.04 : 0;
  const parallaxY = pointer && !reducedMotion ? (pointer.y - height * 0.5) * 0.04 : 0;

  // 1. Twilight Meadow Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (modeProgress > 0.5) {
    // Dark Amethyst Twilight
    grad.addColorStop(0, "#0D0814");
    grad.addColorStop(0.35, "#180F26");
    grad.addColorStop(0.7, "#221535");
    grad.addColorStop(1, "#120B1C");
  } else {
    // Light Lilac Morning Meadow
    grad.addColorStop(0, "#F5EDFC");
    grad.addColorStop(0.4, "#EBDCF7");
    grad.addColorStop(0.75, "#DFCBF2");
    grad.addColorStop(1, "#FAF5FF");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Dusk Crepuscular Rays
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = modeProgress > 0.5 ? "screen" : "overlay";
    scene.rays.forEach((ray, i) => {
      const rayAlpha = ray.alpha * (0.8 + 0.2 * Math.sin(t * ray.freq + i));
      const rayGrad = ctx.createLinearGradient(0, 0, 0, height * 0.85);
      rayGrad.addColorStop(
        0,
        modeProgress > 0.5
          ? `rgba(216, 180, 254, ${rayAlpha * 1.5})`
          : `rgba(255, 255, 255, ${rayAlpha * 2.2})`,
      );
      rayGrad.addColorStop(1, "rgba(216, 180, 254, 0)");

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      const rx = ray.x * width + Math.sin(t * 0.35 + i) * 35 + parallaxX * 0.2;
      const topWidth = ray.width * width * 0.45;
      const bottomWidth = ray.width * width * 1.45;

      ctx.moveTo(rx - topWidth, 0);
      ctx.lineTo(rx + topWidth, 0);
      ctx.lineTo(rx + bottomWidth + ray.angle * height, height * 0.85);
      ctx.lineTo(rx - bottomWidth + ray.angle * height, height * 0.85);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  // 3. Rolling Lavender Hills / Mist Silhouette
  ctx.save();
  const hillAlpha = modeProgress > 0.5 ? "rgba(18, 11, 28, 0.65)" : "rgba(223, 203, 242, 0.6)";
  ctx.fillStyle = hillAlpha;
  ctx.beginPath();
  const hillY = (0.78 - scrollY * 0.0001) * height + parallaxY * 0.2;
  ctx.moveTo(0, height);
  ctx.lineTo(0, hillY);
  for (let s = 0; s <= 20; s++) {
    const hx = (s / 20) * width;
    const wave = Math.sin(s * 0.5 + 1.2) * (height * 0.06);
    ctx.lineTo(hx, hillY + wave);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Bioluminescent Pollen Spores
  ctx.save();
  scene.spores.forEach((spore) => {
    let sx = spore.x * width + parallaxX * 0.4;
    let sy = spore.y * height + parallaxY * 0.4;

    if (!reducedMotion) {
      sy = (((spore.y + t * spore.vy * 40) % 1.1 + 1.1) % 1.1) * height;
      sx = (((spore.x + Math.sin(t + spore.pulsePhase) * 0.02) % 1.1 + 1.1) % 1.1) * width;
    }

    const sRadius = spore.radius;
    const sporeGrad = ctx.createRadialGradient(
      sx,
      sy,
      0,
      sx,
      sy,
      sRadius * 1.5,
    );
    sporeGrad.addColorStop(
      0,
      modeProgress > 0.5
        ? `rgba(232, 121, 249, ${spore.alpha})`
        : `rgba(168, 85, 247, ${spore.alpha * 0.9})`,
    );
    sporeGrad.addColorStop(1, "rgba(232, 121, 249, 0)");

    ctx.fillStyle = sporeGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 5. Constellation / Botanical Filament Vines
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
        const lineAlpha = (1 - dist / (width * 0.38)) * 0.26;
        ctx.strokeStyle =
          modeProgress > 0.5
            ? `rgba(192, 132, 252, ${lineAlpha})`
            : `rgba(147, 51, 234, ${lineAlpha * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.lineTo(posB.x, posB.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // 6. Interactive Botanical World Nodes
  nodes.forEach((node) => {
    ctx.save();
    const pos = worldToScreen(node.x, node.y, width, height, camera);
    const isHovered = hoveredNode?.id === node.id;
    const isFocused = focusedNode?.id === node.id;
    const isPinned = pinnedNodes.some((p) => p.id === node.id);

    const baseRadius = node.radius * pos.scale;
    const radius = isHovered || isFocused ? baseRadius * 1.25 : baseRadius;

    // Outer Flora Halo
    const pulse = Math.sin(t * 3.0 + node.x * 12) * 0.15;
    const ringRadius = radius * (1.38 + pulse + (isPinned ? 0.3 : 0));

    const glowGrad = ctx.createRadialGradient(
      pos.x,
      pos.y,
      radius * 0.2,
      pos.x,
      pos.y,
      ringRadius * 1.8,
    );
    glowGrad.addColorStop(0, node.glow);
    glowGrad.addColorStop(1, "rgba(192, 132, 252, 0)");

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ringRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Orbital Flora Ring
    ctx.strokeStyle = isPinned ? "#FFFFFF" : node.accent;
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
    coreGrad.addColorStop(1, modeProgress > 0.5 ? "#120D1C" : "#9333EA");

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Node label
    ctx.fillStyle = modeProgress > 0.5 ? "#FFFFFF" : "#1E1B4B";
    ctx.font = `600 ${Math.max(11, Math.floor(13 * pos.scale))}px "Plus Jakarta Sans", "Outfit", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.name, pos.x, pos.y + radius + 14 * pos.scale);

    ctx.restore();
  });

  // 7. Drifting Sinusoidal Lavender Petals
  scene.petals.forEach((petal) => {
    ctx.save();
    let px = petal.x * width + parallaxX * 0.6;
    let py = petal.y * height + parallaxY * 0.6;

    if (!reducedMotion) {
      py = (((petal.y + t * petal.speedY * 55) % 1.2 + 1.2) % 1.2 - 0.1) * height;
      const wobble = Math.sin(t * petal.wobbleSpeed + petal.wobblePhase) * (width * 0.02);
      px = (((petal.x + t * petal.speedX * 35) % 1.2 + 1.2) % 1.2 - 0.1) * width + wobble;
    }

    ctx.translate(px, py);
    const rot = reducedMotion ? petal.rotation : petal.rotation + t * petal.rotationSpeed;
    ctx.rotate(rot);

    // Draw single stylized petal oval
    ctx.fillStyle = petal.color;
    ctx.globalAlpha = petal.alpha;
    ctx.beginPath();
    ctx.ellipse(0, 0, petal.width, petal.length, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  ctx.restore();
};
