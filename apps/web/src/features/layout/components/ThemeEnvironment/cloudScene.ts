import type { EnvironmentQualityTier } from "./types";
import {
  type CloudCamera,
  type CloudNode,
  worldToScreen,
} from "./cloudWorld";

export const CLOUD_FRAME_BUDGET_MS = {
  low: 0,
  medium: 6,
  high: 8,
} as const;

export const CLOUD_SCENE_LIMITS = {
  low: { clouds: 4, particles: 25, rays: 3 },
  medium: { clouds: 8, particles: 60, rays: 5 },
  high: { clouds: 14, particles: 110, rays: 7 },
} as const;

export const CLOUD_DEFAULT_SEED = 20260816;

export interface CloudPointer {
  x: number;
  y: number;
}

export interface CloudPuff {
  offsetX: number;
  offsetY: number;
  radius: number;
}

export interface CloudCluster {
  x: number;
  y: number;
  speedX: number;
  puffs: CloudPuff[];
  baseRadius: number;
  alpha: number;
  layer: number;
}

export interface CloudVapourParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  pulsePhase: number;
}

export interface CloudRay {
  x: number;
  angle: number;
  width: number;
  alpha: number;
  freq: number;
}

export interface CloudScene {
  seed: number;
  clusters: CloudCluster[];
  particles: CloudVapourParticle[];
  rays: CloudRay[];
}

export interface DrawCloudSceneOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: CloudScene;
  nodes: CloudNode[];
  camera: CloudCamera;
  focusedNode?: CloudNode | null;
  hoveredNode?: CloudNode | null;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: CloudPointer | null;
  reducedMotion: boolean;
  pinnedNodes?: CloudNode[];
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

export const createCloudScene = (
  seed: number,
  qualityTier: EnvironmentQualityTier,
): CloudScene => {
  const rng = createRng(seed);
  const limits = CLOUD_SCENE_LIMITS[qualityTier];

  const clusters: CloudCluster[] = Array.from(
    { length: limits.clouds },
    (_, idx) => {
      const puffCount = 5 + Math.floor(rng() * 4);
      const baseRadius = 40 + rng() * 65;
      const puffs: CloudPuff[] = Array.from({ length: puffCount }, () => ({
        offsetX: (rng() - 0.5) * baseRadius * 1.5,
        offsetY: (rng() - 0.5) * baseRadius * 0.7,
        radius: baseRadius * (0.5 + rng() * 0.65),
      }));

      return {
        x: (idx / Math.max(1, limits.clouds)) + (rng() - 0.5) * 0.15,
        y: 0.15 + rng() * 0.7,
        speedX: 0.00015 + rng() * 0.00035,
        puffs,
        baseRadius,
        alpha: 0.18 + rng() * 0.35,
        layer: rng() > 0.5 ? 2 : 1,
      };
    },
  );

  const particles: CloudVapourParticle[] = Array.from(
    { length: limits.particles },
    () => ({
      x: rng(),
      y: rng(),
      vx: 0.0001 + rng() * 0.0002,
      vy: (rng() - 0.5) * 0.00008,
      radius: 1.5 + rng() * 3.5,
      alpha: 0.2 + rng() * 0.5,
      pulsePhase: rng() * Math.PI * 2,
    }),
  );

  const rays: CloudRay[] = Array.from({ length: limits.rays }, () => ({
    x: rng(),
    angle: -0.25 + rng() * 0.5,
    width: 0.1 + rng() * 0.2,
    alpha: 0.08 + rng() * 0.14,
    freq: 1.0 + rng() * 2.0,
  }));

  return {
    seed,
    clusters,
    particles,
    rays,
  };
};

export const drawCloudScene = ({
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
}: DrawCloudSceneOptions): void => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const t = timeMs * 0.001;
  const parallaxX = pointer && !reducedMotion ? (pointer.x - width * 0.5) * 0.04 : 0;
  const parallaxY = pointer && !reducedMotion ? (pointer.y - height * 0.5) * 0.04 : 0;

  // 1. Stratosphere Sky Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (modeProgress > 0.5) {
    // Midnight Stratosphere
    grad.addColorStop(0, "#060A17");
    grad.addColorStop(0.35, "#0B132B");
    grad.addColorStop(0.7, "#1C2541");
    grad.addColorStop(1, "#0D1B2A");
  } else {
    // Daylight Stratosphere (Sky Blue -> Soft Azure -> Whispering White)
    grad.addColorStop(0, "#7DD3FC");
    grad.addColorStop(0.4, "#BAE6FD");
    grad.addColorStop(0.75, "#E0F2FE");
    grad.addColorStop(1, "#F8FAFC");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Solar/Lunar Crepuscular Rays
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = modeProgress > 0.5 ? "screen" : "overlay";
    scene.rays.forEach((ray, i) => {
      const rayAlpha = ray.alpha * (0.8 + 0.2 * Math.sin(t * ray.freq + i));
      const rayGrad = ctx.createLinearGradient(0, 0, 0, height * 0.85);
      rayGrad.addColorStop(
        0,
        modeProgress > 0.5
          ? `rgba(147, 197, 253, ${rayAlpha * 1.6})`
          : `rgba(255, 255, 255, ${rayAlpha * 2.4})`,
      );
      rayGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      const rx = ray.x * width + Math.sin(t * 0.3 + i) * 35 + parallaxX * 0.2;
      const topWidth = ray.width * width * 0.4;
      const bottomWidth = ray.width * width * 1.5;

      ctx.moveTo(rx - topWidth, 0);
      ctx.lineTo(rx + topWidth, 0);
      ctx.lineTo(rx + bottomWidth + ray.angle * height, height * 0.85);
      ctx.lineTo(rx - bottomWidth + ray.angle * height, height * 0.85);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  // 3. Volumetric Drifting Clouds (Layer 1 - Distant)
  scene.clusters
    .filter((c) => c.layer === 1)
    .forEach((cluster) => {
      ctx.save();
      let cx = cluster.x * width + parallaxX * 0.3;
      const cy = (cluster.y - scrollY * 0.0001) * height + parallaxY * 0.3;

      if (!reducedMotion) {
        cx = (((cluster.x + t * cluster.speedX * 30) % 1.3 + 1.3) % 1.3 - 0.15) * width;
      }

      cluster.puffs.forEach((puff) => {
        const px = cx + puff.offsetX;
        const py = cy + puff.offsetY;
        const pRadius = puff.radius * Math.min(width, height) * 0.0018;

        const puffGrad = ctx.createRadialGradient(
          px,
          py - pRadius * 0.2,
          pRadius * 0.1,
          px,
          py,
          pRadius,
        );
        puffGrad.addColorStop(
          0,
          modeProgress > 0.5
            ? `rgba(224, 231, 255, ${cluster.alpha * 0.7})`
            : `rgba(255, 255, 255, ${cluster.alpha * 0.95})`,
        );
        puffGrad.addColorStop(
          0.7,
          modeProgress > 0.5
            ? `rgba(96, 165, 250, ${cluster.alpha * 0.3})`
            : `rgba(224, 242, 254, ${cluster.alpha * 0.6})`,
        );
        puffGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = puffGrad;
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    });

  // 4. Drifting Atmospheric Vapour Particles
  ctx.save();
  scene.particles.forEach((p) => {
    let px = p.x * width + parallaxX * 0.5;
    let py = p.y * height + parallaxY * 0.5;

    if (!reducedMotion) {
      px = (((p.x + t * p.vx * 50) % 1.1 + 1.1) % 1.1) * width;
      py = (((p.y + Math.sin(t + p.pulsePhase) * 0.02) % 1.1 + 1.1) % 1.1) * height;
    }

    const pRadius = p.radius;
    const vGrad = ctx.createRadialGradient(
      px,
      py,
      0,
      px,
      py,
      pRadius * 1.5,
    );
    vGrad.addColorStop(
      0,
      modeProgress > 0.5
        ? `rgba(147, 197, 253, ${p.alpha})`
        : `rgba(255, 255, 255, ${p.alpha * 1.2})`,
    );
    vGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.arc(px, py, pRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 5. Constellation / Filament High-Altitude Airway Links
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
        const lineAlpha = (1 - dist / (width * 0.38)) * 0.25;
        ctx.strokeStyle =
          modeProgress > 0.5
            ? `rgba(96, 165, 250, ${lineAlpha})`
            : `rgba(2, 132, 199, ${lineAlpha * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.lineTo(posB.x, posB.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // 6. Interactive Atmospheric World Nodes
  nodes.forEach((node) => {
    ctx.save();
    const pos = worldToScreen(node.x, node.y, width, height, camera);
    const isHovered = hoveredNode?.id === node.id;
    const isFocused = focusedNode?.id === node.id;
    const isPinned = pinnedNodes.some((p) => p.id === node.id);

    const baseRadius = node.radius * pos.scale;
    const radius = isHovered || isFocused ? baseRadius * 1.25 : baseRadius;

    // Outer Shimmering Vapor Ring
    const pulse = Math.sin(t * 3.2 + node.x * 12) * 0.15;
    const ringRadius = radius * (1.4 + pulse + (isPinned ? 0.3 : 0));

    const glowGrad = ctx.createRadialGradient(
      pos.x,
      pos.y,
      radius * 0.2,
      pos.x,
      pos.y,
      ringRadius * 1.8,
    );
    glowGrad.addColorStop(0, node.glow);
    glowGrad.addColorStop(1, "rgba(96, 165, 250, 0)");

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ringRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Orbital Ring
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
    coreGrad.addColorStop(1, modeProgress > 0.5 ? "#0B132B" : "#0284C7");

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Node label
    ctx.fillStyle = modeProgress > 0.5 ? "#FFFFFF" : "#0F172A";
    ctx.font = `600 ${Math.max(11, Math.floor(13 * pos.scale))}px "Plus Jakarta Sans", "Outfit", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.name, pos.x, pos.y + radius + 14 * pos.scale);

    ctx.restore();
  });

  // 7. Volumetric Drifting Clouds (Layer 2 - Foreground)
  scene.clusters
    .filter((c) => c.layer === 2)
    .forEach((cluster) => {
      ctx.save();
      let cx = cluster.x * width + parallaxX * 0.6;
      const cy = (cluster.y - scrollY * 0.0002) * height + parallaxY * 0.6;

      if (!reducedMotion) {
        cx = (((cluster.x + t * cluster.speedX * 45) % 1.4 + 1.4) % 1.4 - 0.2) * width;
      }

      cluster.puffs.forEach((puff) => {
        const px = cx + puff.offsetX;
        const py = cy + puff.offsetY;
        const pRadius = puff.radius * Math.min(width, height) * 0.0022;

        const puffGrad = ctx.createRadialGradient(
          px,
          py - pRadius * 0.25,
          pRadius * 0.1,
          px,
          py,
          pRadius,
        );
        puffGrad.addColorStop(
          0,
          modeProgress > 0.5
            ? `rgba(240, 249, 255, ${cluster.alpha * 0.8})`
            : `rgba(255, 255, 255, ${cluster.alpha * 0.98})`,
        );
        puffGrad.addColorStop(
          0.7,
          modeProgress > 0.5
            ? `rgba(147, 197, 253, ${cluster.alpha * 0.4})`
            : `rgba(224, 242, 254, ${cluster.alpha * 0.7})`,
        );
        puffGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = puffGrad;
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    });

  ctx.restore();
};
