import type { EnvironmentQualityTier } from "./types";

export const PHOENIX_FRAME_BUDGET_MS = {
  low: 0,
  medium: 6,
  high: 8,
} as const;

export const PHOENIX_SCENE_LIMITS = {
  low: { embers: 22, ash: 12, flares: 1, ribbons: 1, parallax: 0 },
  medium: { embers: 52, ash: 26, flares: 2, ribbons: 2, parallax: 0.35 },
  high: { embers: 90, ash: 45, flares: 3, ribbons: 3, parallax: 0.7 },
} as const;

export const PHOENIX_DAY_CYCLE_MS = 60_000;
export const PHOENIX_DEFAULT_SEED = 20260814;

export type PhoenixAtmosphere = "radiant" | "smoldering";
export type PhoenixDayPhase =
  | "dawn-spark"
  | "zenith-blaze"
  | "dusk-ember"
  | "hearth-rebirth";

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
}

export interface Ember {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  swayFreq: number;
  phase: number;
  luminosity: number;
  color: keyof Pick<PhoenixPalette, "emberA" | "emberB" | "emberC">;
  sparkleSpeed: number;
}

export interface Ash {
  x: number;
  y: number;
  size: number;
  fallSpeed: number;
  driftSpeed: number;
  rotation: number;
  spin: number;
  phase: number;
  color: keyof Pick<PhoenixPalette, "ashA" | "ashB">;
}

export interface SolarRibbon {
  x: number;
  width: number;
  height: number;
  curvature: number;
  phase: number;
  alpha: number;
}

export interface PhoenixScene {
  seed: number;
  atmosphere: PhoenixAtmosphere;
  embers: Ember[];
  ashFlakes: Ash[];
  ribbons: SolarRibbon[];
  ridges: Array<{
    y: number;
    height: number;
    depth: number;
    frequency: number;
  }>;
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
}

export const createRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return (): number => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const resolvePhoenixDayPhase = (timeMs: number): PhoenixDayPhase => {
  const cycle =
    ((timeMs % PHOENIX_DAY_CYCLE_MS) + PHOENIX_DAY_CYCLE_MS) %
    PHOENIX_DAY_CYCLE_MS;
  const unit = cycle / PHOENIX_DAY_CYCLE_MS;
  if (unit < 0.22) return "dawn-spark";
  if (unit < 0.56) return "zenith-blaze";
  if (unit < 0.78) return "dusk-ember";
  return "hearth-rebirth";
};

export const createPhoenixPalette = (
  isDarkMode: boolean,
  phase: PhoenixDayPhase,
  atmosphere: PhoenixAtmosphere,
): PhoenixPalette => {
  if (!isDarkMode) {
    const isZenith = phase === "zenith-blaze";
    const isDawn = phase === "dawn-spark";
    return {
      skyTop: isZenith ? "#fef3e2" : isDawn ? "#fde8d7" : "#fbf0e4",
      skyMid: isZenith ? "#fed7aa" : "#fed0aa",
      skyBottom: isZenith ? "#fdba74" : "#fca5a5",
      ridgeFar: "#e2a98f",
      ridgeMid: "#c67d58",
      ridgeNear: "#9a4c28",
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
    };
  }

  const isHearth = phase === "hearth-rebirth";
  const isZenith = phase === "zenith-blaze";
  return {
    skyTop: isHearth ? "#050304" : isZenith ? "#120606" : "#0a0405",
    skyMid: isHearth ? "#14070a" : isZenith ? "#220a0b" : "#1a0808",
    skyBottom: isHearth ? "#2b0a0a" : isZenith ? "#380f08" : "#280b06",
    ridgeFar: "#180608",
    ridgeMid: "#250a0a",
    ridgeNear: "#340e0b",
    magmaGlow:
      atmosphere === "radiant"
        ? "rgba(251, 146, 60, 0.45)"
        : "rgba(239, 68, 68, 0.32)",
    auroraFlare: "rgba(251, 191, 36, 0.18)",
    emberCore: "#fffbeb",
    emberA: "#fbbf24",
    emberB: "#f97316",
    emberC: "#ef4444",
    ashA: "rgba(92, 75, 75, 0.65)",
    ashB: "rgba(135, 110, 105, 0.45)",
    vignette: "rgba(3, 1, 2, 0.52)",
    heatShimmer: "rgba(249, 115, 22, 0.15)",
  };
};

export const createPhoenixScene = (
  seed: number,
  qualityTier: EnvironmentQualityTier,
): PhoenixScene => {
  const rng = createRng(seed);
  const limits = PHOENIX_SCENE_LIMITS[qualityTier];
  const atmosphere: PhoenixAtmosphere = rng() > 0.4 ? "radiant" : "smoldering";

  const embers: Ember[] = Array.from({ length: limits.embers }, () => ({
    x: rng(),
    y: rng(),
    size: 1.8 + rng() * 3.6,
    speed: 0.025 + rng() * 0.065,
    sway: 12 + rng() * 26,
    swayFreq: 0.8 + rng() * 1.6,
    phase: rng() * Math.PI * 2,
    luminosity: 0.6 + rng() * 0.4,
    color: (["emberA", "emberB", "emberC"] as const)[Math.floor(rng() * 3)],
    sparkleSpeed: 2.5 + rng() * 5.0,
  }));

  const ashFlakes: Ash[] = Array.from({ length: limits.ash }, () => ({
    x: rng(),
    y: rng(),
    size: 2.0 + rng() * 4.2,
    fallSpeed: -0.008 + rng() * 0.022,
    driftSpeed: (rng() - 0.5) * 0.015,
    rotation: rng() * Math.PI * 2,
    spin: (rng() - 0.5) * 0.8,
    phase: rng() * Math.PI * 2,
    color: (["ashA", "ashB"] as const)[Math.floor(rng() * 2)],
  }));

  const ribbons: SolarRibbon[] = Array.from({ length: limits.ribbons }, () => ({
    x: 0.15 + rng() * 0.7,
    width: 60 + rng() * 120,
    height: 180 + rng() * 260,
    curvature: (rng() - 0.5) * 0.4,
    phase: rng() * Math.PI * 2,
    alpha: 0.12 + rng() * 0.15,
  }));

  return {
    seed,
    atmosphere,
    embers,
    ashFlakes,
    ribbons,
    ridges: [
      { y: 0.62, height: 0.18, depth: 0.22, frequency: 1.2 },
      { y: 0.72, height: 0.24, depth: 0.45, frequency: 1.6 },
      { y: 0.82, height: 0.28, depth: 0.75, frequency: 2.1 },
    ],
  };
};

const drawEmber = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  glowColor: string,
  coreColor: string,
  intensity: number,
): void => {
  const outerRadius = Math.max(1, size * 2.8 * intensity);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
  glow.addColorStop(0, coreColor);
  glow.addColorStop(0.35, glowColor);
  glow.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  // White-hot core speck
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.6, size * 0.45 * intensity), 0, Math.PI * 2);
  ctx.fill();
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
}: DrawPhoenixSceneOptions): void => {
  const phase = resolvePhoenixDayPhase(timeMs);
  const palette = createPhoenixPalette(isDarkMode, phase, scene.atmosphere);
  const limits = PHOENIX_SCENE_LIMITS[qualityTier];
  const pointerX = pointer ? (pointer.x / width - 0.5) * 2 : 0;
  const pointerY = pointer ? (pointer.y / height - 0.5) * 2 : 0;
  const parallax = reducedMotion ? 0 : limits.parallax;
  const seconds = timeMs / 1000;

  ctx.clearRect(0, 0, width, height);

  // 1. Atmospheric Sky Gradient
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.55, palette.skyMid);
  sky.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // 2. Solar Auroral Ribbons / Thermal Plumes
  scene.ribbons.forEach((ribbon) => {
    const shiftX =
      ribbon.x * width +
      pointerX * parallax * 28 +
      (reducedMotion ? 0 : Math.sin(seconds * 0.4 + ribbon.phase) * 22);
    const plumeTop = height * 0.05;
    const plumeBottom = height * 0.85;

    ctx.save();
    ctx.globalAlpha =
      ribbon.alpha *
      (reducedMotion
        ? 0.7
        : 0.6 + 0.4 * Math.sin(seconds * 0.6 + ribbon.phase));
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

  // 3. Volcanic Caldera & Ridgelines with Parallax
  scene.ridges.forEach((ridge, index) => {
    const shiftX = pointerX * parallax * ridge.depth * 24;
    const shiftY = pointerY * parallax * ridge.depth * 12;
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

  // 4. Horizon Magma Seam Pulse
  const magmaHeight = height * 0.18;
  const pulse = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(seconds * 1.8);
  const magmaGrad = ctx.createLinearGradient(
    0,
    height - magmaHeight,
    0,
    height,
  );
  magmaGrad.addColorStop(0, "rgba(0,0,0,0)");
  magmaGrad.addColorStop(0.6, palette.magmaGlow);
  magmaGrad.addColorStop(1, palette.emberB);
  ctx.save();
  ctx.globalAlpha = 0.45 * pulse;
  ctx.fillStyle = magmaGrad;
  ctx.fillRect(0, height - magmaHeight, width, magmaHeight);
  ctx.restore();

  // 5. Ash Flakes Simulation
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

  // 6. Rising Embers & Thermal Updraft
  scene.embers.forEach((ember) => {
    // Upward buoyancy travel
    const travel = reducedMotion
      ? ember.y
      : (ember.y - seconds * ember.speed + 1000.0) % 1.15;
    const rawY = travel * height - ember.size;

    // Horizontal turbulent draft + pointer heat convection
    let swayOffset =
      Math.sin(seconds * ember.swayFreq + ember.phase) *
      (reducedMotion ? 0 : ember.sway);
    let extraSpeedY = 0;

    if (pointer && !reducedMotion) {
      const dx = pointer.x - (ember.x * width + swayOffset);
      const dy = pointer.y - rawY;
      const dist = Math.hypot(dx, dy);
      if (dist < 180 && dist > 1) {
        const force = (1 - dist / 180) * 25;
        swayOffset -= (dx / dist) * force;
        extraSpeedY = -(dy / dist) * force * 0.4;
      }
    }

    const posX =
      (ember.x * width + swayOffset + pointerX * parallax * 12 + width) % width;
    const posY = rawY + extraSpeedY;

    // Luminosity oscillation / flicker
    const flicker = reducedMotion
      ? ember.luminosity
      : ember.luminosity *
        (0.65 + 0.35 * Math.sin(seconds * ember.sparkleSpeed + ember.phase));

    drawEmber(
      ctx,
      posX,
      posY,
      ember.size,
      palette[ember.color],
      palette.emberCore,
      flicker,
    );
  });

  // 7. Vignette Framing
  ctx.fillStyle = palette.vignette;
  ctx.fillRect(0, 0, width, height * 0.14);
  ctx.fillRect(0, height * 0.86, width, height * 0.14);
};
