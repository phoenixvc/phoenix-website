import type { EnvironmentQualityTier } from "./types";
import {
  HIGHVELD_HORIZON_Y,
  depthScaleFor,
  worldToScreen,
  type HighveldCamera,
  type HighveldNode,
} from "./highveldWorld";

export const HIGHVELD_DEFAULT_SEED = 20260814;

/**
 * Budget after the first paint. `low` renders one representative frame and
 * then stops, matching the Cosmic and Forest contracts.
 */
export const HIGHVELD_FRAME_BUDGET_MS: Record<EnvironmentQualityTier, number> = {
  low: 0,
  medium: 6,
  high: 8,
};

/** One full dawn -> day -> dusk -> night rotation. */
export const HIGHVELD_DAY_CYCLE_MS = 60_000;

/** How long a single bolt stays on screen. */
export const HIGHVELD_STRIKE_DURATION_MS = 240;

export type HighveldWeather = "stormfront" | "clear" | "berg";
export type HighveldPhase = "night" | "dawn" | "day" | "dusk";

export interface HighveldPointer {
  x: number;
  y: number;
}

export interface HighveldStrike {
  atMs: number;
  /** Horizontal position in [0,1] screen space, under the storm cell. */
  x: number;
  branchSeed: number;
}

interface GrassBlade {
  x: number;
  depth: number;
  height: number;
  lean: number;
  phase: number;
  tone: number;
}

interface Tussock {
  x: number;
  depth: number;
  radius: number;
  tone: number;
}

interface DustMote {
  x: number;
  depth: number;
  radius: number;
  drift: number;
  phase: number;
}

interface SkyStar {
  x: number;
  y: number;
  radius: number;
  twinkle: number;
}

interface Bird {
  x: number;
  y: number;
  speed: number;
  scale: number;
  phase: number;
}

interface StormPuff {
  x: number;
  y: number;
  radius: number;
}

export interface HighveldScene {
  seed: number;
  qualityTier: EnvironmentQualityTier;
  weather: HighveldWeather;
  /** Storm cell centre in [0,1] screen space. */
  stormX: number;
  stormPuffs: StormPuff[];
  strikes: HighveldStrike[];
  grass: GrassBlade[];
  tussocks: Tussock[];
  motes: DustMote[];
  stars: SkyStar[];
  birds: Bird[];
  ridge: number[];
  windpompX: number;
}

// Grass is the ground texture, not an accent — too few blades and the veld
// reads as flat paint. These are plain quadratic strokes and stay cheap, and
// `low` only ever paints one frame, so its count costs nothing ongoing.
const GRASS_CAPS: Record<EnvironmentQualityTier, number> = {
  low: 700,
  medium: 1100,
  high: 1900,
};

/** Soft ground blotches that break up the plain. Also one-off on `low`. */
const TUSSOCK_CAPS: Record<EnvironmentQualityTier, number> = {
  low: 70,
  medium: 110,
  high: 170,
};

const MOTE_CAPS: Record<EnvironmentQualityTier, number> = {
  low: 14,
  medium: 40,
  high: 80,
};

const BIRD_CAPS: Record<EnvironmentQualityTier, number> = {
  low: 0,
  medium: 5,
  high: 9,
};

const STAR_CAPS: Record<EnvironmentQualityTier, number> = {
  low: 60,
  medium: 150,
  high: 260,
};

const RAIN_CAPS: Record<EnvironmentQualityTier, number> = {
  low: 0,
  medium: 60,
  high: 120,
};

/** Deterministic PRNG so a seed always paints the same veld. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface SkyAnchor {
  top: string;
  mid: string;
  horizon: string;
  grass: string;
  shadow: string;
  phase: HighveldPhase;
}

/**
 * Four anchors interpolated circularly. Dusk carries the deep crimson the
 * Highveld is known for; day is washed out the way high-altitude light is.
 */
const SKY_ANCHORS: SkyAnchor[] = [
  {
    phase: "night",
    top: "#05070E",
    mid: "#0B1220",
    horizon: "#18283C",
    grass: "#151A1E",
    shadow: "#080B0E",
  },
  {
    phase: "dawn",
    top: "#1B2A4A",
    mid: "#6E5580",
    horizon: "#E8956B",
    grass: "#8A7448",
    shadow: "#4A3D26",
  },
  {
    phase: "day",
    top: "#2E6FB7",
    mid: "#79A9DA",
    horizon: "#D3E2EE",
    grass: "#C9A24B",
    shadow: "#8A6E2E",
  },
  {
    phase: "dusk",
    top: "#20244E",
    mid: "#8E3F5E",
    horizon: "#E2542B",
    grass: "#8A5A2A",
    shadow: "#4B3018",
  },
];

/**
 * Node colours come from portfolio data, so a hand-edited value must not be
 * able to reach the canvas as NaN — `addColorStop` throws on that and takes
 * the whole environment down through the error boundary.
 */
const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace("#", "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)
    ? [128, 128, 128]
    : [r, g, b];
};

const channelToHex = (value: number): string =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");

/**
 * Returns hex rather than `rgb()` so results compose: every sky colour is fed
 * back through mixHex/lift/rgbaFromHex as the day cycle and lightning stack up.
 */
const mixHex = (from: string, to: string, amount: number): string => {
  const t = Math.max(0, Math.min(1, amount));
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return `#${channelToHex(r1 + (r2 - r1) * t)}${channelToHex(
    g1 + (g2 - g1) * t,
  )}${channelToHex(b1 + (b2 - b1) * t)}`;
};

const rgbaFromHex = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Lift a colour toward white; used for the lightning wash. */
const lift = (hex: string, amount: number): string =>
  mixHex(hex, "#FFFFFF", amount);

/**
 * Dark mode opens at dusk, light mode at midday. The cycle still turns, so a
 * long visit walks the whole day either way.
 */
const cycleOffsetFor = (isDarkMode: boolean): number =>
  isDarkMode ? 0.72 : 0.46;

export const highveldCycleT = (timeMs: number, isDarkMode: boolean): number => {
  const raw = timeMs / HIGHVELD_DAY_CYCLE_MS + cycleOffsetFor(isDarkMode);
  return ((raw % 1) + 1) % 1;
};

interface ResolvedSky {
  top: string;
  mid: string;
  horizon: string;
  grass: string;
  shadow: string;
  phase: HighveldPhase;
  /** 0 at full day, 1 at deep night. Drives stars and window glow. */
  darkness: number;
}

const resolveSky = (t: number): ResolvedSky => {
  const scaled = t * SKY_ANCHORS.length;
  const index = Math.floor(scaled) % SKY_ANCHORS.length;
  const next = (index + 1) % SKY_ANCHORS.length;
  const amount = scaled - Math.floor(scaled);
  const from = SKY_ANCHORS[index];
  const to = SKY_ANCHORS[next];

  // Darkness peaks at the night anchor (t === 0) and bottoms out at day.
  const darkness = (Math.cos(t * Math.PI * 2) + 1) / 2;

  return {
    top: mixHex(from.top, to.top, amount),
    mid: mixHex(from.mid, to.mid, amount),
    horizon: mixHex(from.horizon, to.horizon, amount),
    grass: mixHex(from.grass, to.grass, amount),
    shadow: mixHex(from.shadow, to.shadow, amount),
    phase: amount < 0.5 ? from.phase : to.phase,
    darkness,
  };
};

export const highveldPhaseAt = (
  timeMs: number,
  isDarkMode: boolean,
): HighveldPhase => resolveSky(highveldCycleT(timeMs, isDarkMode)).phase;

export const createHighveldScene = (
  seed: number,
  qualityTier: EnvironmentQualityTier,
): HighveldScene => {
  const random = mulberry32(seed);

  const weatherRoll = random();
  const weather: HighveldWeather =
    weatherRoll < 0.62 ? "stormfront" : weatherRoll < 0.82 ? "berg" : "clear";

  const stormX = 0.18 + random() * 0.34;

  const stormPuffs: StormPuff[] = Array.from({ length: 14 }, (_, index) => {
    const spread = (index / 13 - 0.5) * 0.34;
    return {
      x: stormX + spread + (random() - 0.5) * 0.05,
      y: 0.1 + Math.abs(spread) * 0.55 + random() * 0.12,
      radius: 0.05 + random() * 0.07,
    };
  });

  // Bolts land on a fixed cadence with seeded jitter, so any (seed, time)
  // pair is reproducible in a test or a screenshot.
  const strikes: HighveldStrike[] = [];
  for (let index = 0; index * 4200 < HIGHVELD_DAY_CYCLE_MS; index += 1) {
    strikes.push({
      atMs: index * 4200 + 1200 + (random() - 0.5) * 1400,
      x: stormX + (random() - 0.5) * 0.26,
      branchSeed: Math.floor(random() * 100000),
    });
  }

  // Landmarks draw from their own stream so the storm, ridgeline, and windpomp
  // are identical on every quality tier — only particle counts vary.
  const landmarkRandom = mulberry32(seed ^ 0x9e3779b9);

  const ridge = Array.from({ length: 48 }, (_, index) => {
    const x = index / 47;
    return (
      Math.sin(x * 5.2 + seed * 0.0001) * 0.4 +
      Math.sin(x * 11.7 + 1.3) * 0.22 +
      landmarkRandom() * 0.18
    );
  });
  const windpompX = 0.82 + landmarkRandom() * 0.1;

  const grass: GrassBlade[] = Array.from(
    { length: GRASS_CAPS[qualityTier] },
    () => ({
      x: -0.15 + random() * 1.3,
      // Bias toward the near field so the foreground is dense and the far
      // plain stays a haze, the way distance actually looks.
      depth: random() ** 0.55,
      height: 0.02 + random() * 0.06,
      lean: (random() - 0.5) * 0.5,
      phase: random() * Math.PI * 2,
      tone: random(),
    }),
  );

  const tussocks: Tussock[] = Array.from(
    { length: TUSSOCK_CAPS[qualityTier] },
    () => ({
      x: random(),
      depth: random() ** 0.8,
      radius: 0.02 + random() * 0.07,
      tone: random(),
    }),
  );

  const motes: DustMote[] = Array.from(
    { length: MOTE_CAPS[qualityTier] },
    () => ({
      x: random(),
      depth: random(),
      radius: 0.6 + random() * 1.6,
      drift: 0.2 + random() * 0.8,
      phase: random() * Math.PI * 2,
    }),
  );

  const stars: SkyStar[] = Array.from(
    { length: STAR_CAPS[qualityTier] },
    () => ({
      x: random(),
      // Weighted toward the upper sky, but the Highveld shows stars low too.
      y: random() ** 1.4,
      radius: 0.3 + random() * 1.1,
      twinkle: random() * Math.PI * 2,
    }),
  );

  const birds: Bird[] = Array.from({ length: BIRD_CAPS[qualityTier] }, () => ({
    x: random(),
    y: 0.16 + random() * 0.3,
    speed: 0.012 + random() * 0.02,
    scale: 0.6 + random() * 0.8,
    phase: random() * Math.PI * 2,
  }));

  return {
    seed,
    qualityTier,
    weather,
    stormX,
    stormPuffs,
    strikes,
    grass,
    tussocks,
    motes,
    stars,
    birds,
    ridge,
    windpompX,
  };
};

export interface ActiveStrike {
  strike: HighveldStrike;
  /** 0..1 flash envelope, flickering across the strike lifetime. */
  intensity: number;
}

export const activeStrikeAt = (
  scene: HighveldScene,
  timeMs: number,
): ActiveStrike | null => {
  if (scene.weather !== "stormfront") {
    return null;
  }
  const cycleMs = ((timeMs % HIGHVELD_DAY_CYCLE_MS) + HIGHVELD_DAY_CYCLE_MS) %
    HIGHVELD_DAY_CYCLE_MS;

  for (const strike of scene.strikes) {
    const dt = cycleMs - strike.atMs;
    if (dt < 0 || dt >= HIGHVELD_STRIKE_DURATION_MS) {
      continue;
    }
    const progress = dt / HIGHVELD_STRIKE_DURATION_MS;
    // Three quick flickers under a decaying envelope.
    const flicker = Math.abs(Math.sin(progress * Math.PI * 3));
    const decay = 1 - progress;
    return { strike, intensity: Math.max(0, flicker * decay) };
  }
  return null;
};

interface DrawOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: HighveldScene;
  nodes: HighveldNode[];
  camera: HighveldCamera;
  focusedId: string | null;
  timeMs: number;
  isDarkMode: boolean;
  qualityTier: EnvironmentQualityTier;
  pointer: HighveldPointer | null;
  reducedMotion: boolean;
}

const drawBolt = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endY: number,
  seed: number,
  intensity: number,
  width: number,
): void => {
  const segments = 18;

  // Geometry is generated once and stroked three times (halo, glow, core) so
  // the passes line up exactly instead of drawing three different bolts.
  const buildPath = (): { main: number[][]; forks: number[][][] } => {
    const random = mulberry32(seed);
    const main: number[][] = [[startX, startY]];
    const forks: number[][][] = [];
    let x = startX;
    let y = startY;
    const step = (endY - startY) / segments;
    // Drift downhill rather than jittering symmetrically: a real bolt leans.
    const lean = (random() - 0.5) * width * 0.06;
    for (let index = 0; index < segments; index += 1) {
      const progress = (index + 1) / segments;
      x += (random() - 0.5) * width * 0.022 + (lean / segments) * 1.6;
      y += step;
      main.push([x, y]);
      if (random() < 0.16 && progress > 0.25 && progress < 0.85) {
        const fork: number[][] = [[x, y]];
        let fx = x;
        let fy = y;
        const forkSteps = 4;
        const direction = random() < 0.5 ? -1 : 1;
        for (let f = 0; f < forkSteps; f += 1) {
          fx += direction * random() * width * 0.02;
          fy += step * 0.7;
          fork.push([fx, fy]);
        }
        forks.push(fork);
      }
    }
    return { main, forks };
  };

  const { main, forks } = buildPath();

  const strokePath = (points: number[][]): void => {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index][0], points[index][1]);
    }
    ctx.stroke();
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Wide soft halo.
  ctx.strokeStyle = `rgba(150, 170, 240, ${0.3 * intensity})`;
  ctx.lineWidth = Math.max(6, width * 0.007);
  strokePath(main);
  forks.forEach(strokePath);

  // Mid glow.
  ctx.strokeStyle = `rgba(198, 214, 255, ${0.7 * intensity})`;
  ctx.lineWidth = Math.max(2.5, width * 0.0026);
  strokePath(main);
  forks.forEach(strokePath);

  // Hot core.
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * intensity})`;
  ctx.lineWidth = Math.max(1, width * 0.0011);
  strokePath(main);
  forks.forEach(strokePath);

  ctx.restore();
};

export const drawHighveldScene = ({
  ctx,
  width,
  height,
  scene,
  nodes,
  camera,
  focusedId,
  timeMs,
  isDarkMode,
  qualityTier,
  pointer,
  reducedMotion,
}: DrawOptions): void => {
  const sky = resolveSky(highveldCycleT(timeMs, isDarkMode));
  const active = activeStrikeAt(scene, timeMs);
  const flash = active ? active.intensity : 0;

  const projectedHorizon = worldToScreen(
    0.5,
    HIGHVELD_HORIZON_Y,
    camera,
    width,
    height,
  ).y;
  const horizon = Math.max(height * 0.12, Math.min(height * 0.92, projectedHorizon));

  // Sky drifts less than the land, which reads as distance.
  const skyShift = (0.5 - camera.cx) * width * 0.25;
  const pointerShift =
    pointer && !reducedMotion ? (pointer.x / width - 0.5) * width * 0.012 : 0;
  const parallax = skyShift + pointerShift;

  ctx.clearRect(0, 0, width, height);

  // ---- Sky ----
  // The flash lifts the sky only slightly. An earlier version washed the whole
  // gradient toward white and turned a crimson dusk into grey mauve; the drama
  // has to come from a localised glow at the bolt, not a full-frame wash.
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
  skyGradient.addColorStop(0, lift(sky.top, flash * 0.16));
  skyGradient.addColorStop(0.55, lift(sky.mid, flash * 0.14));
  skyGradient.addColorStop(1, lift(sky.horizon, flash * 0.1));
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, Math.max(0, horizon));

  // Bright band hugging the horizon. This is what makes a sunset read as a
  // sunset rather than as a vertical ramp.
  {
    const bandHeight = horizon * 0.22;
    const band = ctx.createLinearGradient(0, horizon - bandHeight, 0, horizon);
    band.addColorStop(0, rgbaFromHex(sky.horizon, 0));
    band.addColorStop(0.65, rgbaFromHex(sky.horizon, 0.55));
    band.addColorStop(1, rgbaFromHex(lift(sky.horizon, 0.18), 0.9));
    ctx.fillStyle = band;
    ctx.fillRect(0, horizon - bandHeight, width, bandHeight);
  }

  // ---- Stars ----
  if (sky.darkness > 0.15) {
    const starAlpha = (sky.darkness - 0.15) / 0.85;
    ctx.save();
    scene.stars.forEach((star) => {
      const x = (star.x * width + parallax * 0.4 + width) % width;
      const y = star.y * horizon;
      const twinkle = reducedMotion
        ? 1
        : 0.6 + 0.4 * Math.sin(timeMs * 0.002 + star.twinkle);
      ctx.fillStyle = `rgba(226, 233, 255, ${starAlpha * twinkle * 0.9})`;
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ---- Sun / moon low on the horizon ----
  {
    const bodyX = width * 0.24 + parallax * 0.5;
    const bodyY = horizon - height * (0.06 + sky.darkness * 0.14);
    const isMoon = sky.darkness > 0.6;
    const radius = width * (isMoon ? 0.018 : 0.028);
    const glow = ctx.createRadialGradient(
      bodyX,
      bodyY,
      0,
      bodyX,
      bodyY,
      radius * 6,
    );
    glow.addColorStop(0, isMoon ? "rgba(226,232,255,0.5)" : "rgba(255,214,150,0.55)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, radius * 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isMoon ? "rgba(232,238,255,0.92)" : "rgba(255,232,186,0.95)";
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Storm cell ----
  if (scene.weather === "stormfront") {
    const drift = reducedMotion ? 0 : Math.sin(timeMs * 0.00004) * width * 0.03;
    const cloudDark = mixHex("#2A2E3C", sky.mid, 0.35);
    const cloudLit = lift(mixHex("#6E7488", sky.horizon, 0.4), flash * 0.7);

    ctx.save();
    scene.stormPuffs.forEach((puff, index) => {
      const x = puff.x * width + parallax * 0.7 + drift;
      const y = puff.y * horizon;
      const radius = puff.radius * width;
      const gradient = ctx.createRadialGradient(
        x,
        y - radius * 0.4,
        radius * 0.1,
        x,
        y,
        radius,
      );
      gradient.addColorStop(0, index % 3 === 0 ? cloudLit : cloudDark);
      gradient.addColorStop(1, rgbaFromHex("#1B1E29", 0.0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Anvil: the flat spreading top that gives a Highveld storm its shape.
    const anvilY = horizon * 0.1;
    const anvilGradient = ctx.createLinearGradient(0, anvilY - height * 0.05, 0, anvilY + height * 0.06);
    anvilGradient.addColorStop(0, rgbaFromHex("#8D93A6", 0.0));
    anvilGradient.addColorStop(0.5, rgbaFromHex("#7B8194", 0.34));
    anvilGradient.addColorStop(1, rgbaFromHex("#3A3F52", 0.0));
    ctx.fillStyle = anvilGradient;
    ctx.fillRect(
      scene.stormX * width - width * 0.34 + parallax * 0.7 + drift,
      anvilY - height * 0.05,
      width * 0.68,
      height * 0.11,
    );
    ctx.restore();

    // ---- Virga: rain that fades before it reaches the veld ----
    const rainCount = RAIN_CAPS[qualityTier];
    if (rainCount > 0) {
      ctx.save();
      ctx.strokeStyle = rgbaFromHex(sky.horizon, 0.16);
      ctx.lineWidth = 1;
      const baseY = horizon * 0.34;
      for (let index = 0; index < rainCount; index += 1) {
        const spread = (index / rainCount - 0.5) * 0.42;
        const x = (scene.stormX + spread) * width + parallax * 0.7 + drift;
        const travel = reducedMotion
          ? 0
          : ((timeMs * 0.12 + index * 37) % (horizon * 0.4));
        const y0 = baseY + travel;
        const length = horizon * 0.12;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x - length * 0.18, y0 + length);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (active) {
      const boltX = active.strike.x * width + parallax * 0.7 + drift;

      // Localised glow: the storm lights itself from within, which reads far
      // better than lifting the whole frame toward white.
      const glowRadius = width * 0.34;
      const glow = ctx.createRadialGradient(
        boltX,
        horizon * 0.6,
        0,
        boltX,
        horizon * 0.6,
        glowRadius,
      );
      glow.addColorStop(0, `rgba(226, 232, 255, ${active.intensity * 0.4})`);
      glow.addColorStop(0.4, `rgba(186, 196, 240, ${active.intensity * 0.14})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(boltX - glowRadius, 0, glowRadius * 2, horizon);

      drawBolt(
        ctx,
        boltX,
        horizon * 0.26,
        horizon * 0.97,
        active.strike.branchSeed,
        active.intensity,
        width,
      );
    }
  }

  // ---- Berg-wind dust haze ----
  if (scene.weather === "berg") {
    const haze = ctx.createLinearGradient(0, horizon - height * 0.18, 0, horizon);
    haze.addColorStop(0, rgbaFromHex("#C9A24B", 0));
    haze.addColorStop(1, rgbaFromHex("#C9A24B", 0.22));
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - height * 0.18, width, height * 0.18);
  }

  // ---- Distant escarpment ----
  {
    ctx.save();
    ctx.fillStyle = mixHex(sky.horizon, sky.shadow, 0.62);
    ctx.beginPath();
    ctx.moveTo(0, horizon + 1);
    scene.ridge.forEach((value, index) => {
      const x = (index / (scene.ridge.length - 1)) * width;
      ctx.lineTo(x, horizon - value * height * 0.035);
    });
    ctx.lineTo(width, horizon + 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---- Ground ----
  const groundGradient = ctx.createLinearGradient(0, horizon, 0, height);
  groundGradient.addColorStop(0, lift(mixHex(sky.grass, sky.horizon, 0.35), flash * 0.3));
  groundGradient.addColorStop(0.35, lift(sky.grass, flash * 0.22));
  groundGradient.addColorStop(1, lift(sky.shadow, flash * 0.12));
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, Math.max(0, horizon), width, Math.max(0, height - horizon));

  // ---- Ground texture ----
  // Soft blotches of burnt and sunlit veld. Without these the plain is a flat
  // vertical gradient and the grass strokes read as sticks on paint.
  {
    ctx.save();
    scene.tussocks.forEach((tussock) => {
      const y = horizon + (height - horizon) * tussock.depth ** 1.35;
      const nearness = tussock.depth ** 1.35;
      const radius = tussock.radius * width * (0.25 + nearness * 1.1);
      const patch =
        tussock.tone > 0.62
          ? lift(sky.grass, 0.14)
          : mixHex(sky.grass, sky.shadow, 0.55);
      // Barely-there tonal variation. Anything stronger and these read as
      // more discs competing with the pans.
      ctx.fillStyle = rgbaFromHex(patch, 0.04 + nearness * 0.07);
      ctx.beginPath();
      ctx.ellipse(
        tussock.x * width,
        y,
        radius * 1.6,
        radius * 0.12,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    ctx.restore();
  }

  // ---- World nodes: koppies break the horizon, thorns and pans sit on the plain ----
  const minSize = Math.min(width, height);
  const sorted = [...nodes].sort((a, b) => a.y - b.y);

  sorted.forEach((node) => {
    const screen = worldToScreen(node.x, node.y, camera, width, height);
    const scale = depthScaleFor(node.y) * camera.zoom;
    const radius = node.radius * scale * minSize;
    if (
      screen.x < -radius * 3 ||
      screen.x > width + radius * 3 ||
      screen.y < -radius * 3 ||
      screen.y > height + radius * 3
    ) {
      return;
    }
    const isFocused = focusedId === node.id;
    const litAmount = flash * 0.45;

    if (node.kind === "koppie") {
      // A koppie is a rocky outcrop, not a hill: broad flattish crown, broken
      // profile, boulders on the skyline, and a hard lit western edge.
      const random = mulberry32(
        node.id.length * 7919 + Math.round(node.x * 1000),
      );
      const baseY = screen.y + radius * 0.35;
      const crown: [number, number][] = [];
      const steps = 22;
      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        const x = screen.x - radius * 1.6 + t * radius * 3.2;
        // Flatter than a sine dome, with a stepped, broken silhouette.
        const profile = Math.sin(t * Math.PI) ** 0.45;
        const jag =
          (random() - 0.5) * radius * 0.3 +
          Math.sin(t * 17 + node.x * 40) * radius * 0.07;
        crown.push([x, baseY - profile * radius * 1.05 + jag]);
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(screen.x - radius * 1.6, baseY);
      crown.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(screen.x + radius * 1.6, baseY);
      ctx.closePath();

      const rock = ctx.createLinearGradient(
        screen.x - radius,
        baseY - radius,
        screen.x + radius,
        baseY,
      );
      rock.addColorStop(0, lift(mixHex(node.color, sky.horizon, 0.4), litAmount));
      rock.addColorStop(0.5, lift(mixHex(node.color, sky.shadow, 0.4), litAmount));
      rock.addColorStop(1, lift(mixHex(node.color, sky.shadow, 0.7), litAmount));
      ctx.fillStyle = rock;
      ctx.fill();

      // Lit skyline edge picks up whatever colour the horizon currently is.
      ctx.strokeStyle = lift(
        mixHex(node.color, sky.horizon, isFocused ? 0.8 : 0.6),
        litAmount,
      );
      ctx.lineWidth = isFocused ? 2.4 : 1.2;
      ctx.stroke();

      // Boulders breaking the crown.
      if (radius > 12) {
        ctx.fillStyle = lift(mixHex(node.color, sky.shadow, 0.62), litAmount);
        for (let index = 0; index < 5; index += 1) {
          const pick = crown[2 + Math.floor(random() * (crown.length - 4))];
          const size = radius * (0.07 + random() * 0.09);
          ctx.beginPath();
          ctx.ellipse(
            pick[0],
            pick[1] + size * 0.4,
            size,
            size * 0.75,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (node.kind === "thorn") {
      // Flat-topped acacia silhouette.
      const trunk = radius * 1.5;
      ctx.save();
      ctx.strokeStyle = lift(mixHex("#2A2118", sky.shadow, 0.35), litAmount);
      ctx.lineWidth = Math.max(1, radius * 0.16);
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(screen.x, screen.y - trunk);
      ctx.stroke();

      ctx.fillStyle = lift(mixHex(node.color, sky.shadow, 0.35), litAmount);
      ctx.beginPath();
      ctx.ellipse(
        screen.x,
        screen.y - trunk,
        radius * 1.25,
        radius * 0.42,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (isFocused) {
        ctx.strokeStyle = "rgba(255, 236, 190, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Seasonal pan: a shallow reflective ellipse holding the sky colour.
      ctx.save();
      // A pan is standing water: mostly reflected sky, with only a hint of the
      // project's colour. Mixing in more turned the mid-ground into a field of
      // coloured lozenges.
      const panGradient = ctx.createLinearGradient(
        screen.x,
        screen.y - radius * 0.5,
        screen.x,
        screen.y + radius * 0.5,
      );
      panGradient.addColorStop(
        0,
        lift(mixHex(sky.horizon, node.color, 0.18), litAmount),
      );
      panGradient.addColorStop(
        1,
        lift(mixHex(sky.mid, node.color, 0.26), litAmount),
      );
      // Thin and specular. A pan catching the sky is a bright sliver, not a
      // fat disc — the thinness is what separates it from ground texture.
      ctx.globalAlpha = isFocused ? 1 : 0.7;
      ctx.fillStyle = panGradient;
      ctx.beginPath();
      ctx.ellipse(
        screen.x,
        screen.y,
        radius * 1.7,
        radius * 0.26,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Specular streak along the upper edge: the actual reflection.
      ctx.strokeStyle = isFocused
        ? "rgba(255, 240, 205, 0.95)"
        : rgbaFromHex(lift(sky.horizon, 0.35), 0.75);
      ctx.lineWidth = isFocused ? 2 : 1.1;
      ctx.beginPath();
      ctx.ellipse(
        screen.x,
        screen.y,
        radius * 1.7,
        radius * 0.26,
        0,
        Math.PI * 1.08,
        Math.PI * 1.92,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Labels only once zoomed in. At overview scale every pan carrying its
      // initials turned the middle of the frame into a field of pills.
      if (node.initials && radius > 26) {
        ctx.fillStyle = "rgba(18, 14, 9, 0.8)";
        ctx.font = `600 ${Math.round(radius * 0.6)}px 'Outfit', system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.initials, screen.x, screen.y);
      }
      ctx.restore();
    }
  });

  // ---- Windpomp: the Highveld's one vertical line ----
  {
    const x = scene.windpompX * width + (0.5 - camera.cx) * width * camera.zoom * 0.4;
    const baseY = horizon + (height - horizon) * 0.34;
    const mastHeight = height * 0.11 * camera.zoom;
    const wheelRadius = mastHeight * 0.24;
    const wheelY = baseY - mastHeight;
    const spin = reducedMotion ? 0 : timeMs * 0.0011;

    ctx.save();
    ctx.strokeStyle = lift(mixHex("#1C1712", sky.shadow, 0.3), flash * 0.5);
    ctx.lineWidth = Math.max(1, mastHeight * 0.035);

    // Lattice mast.
    ctx.beginPath();
    ctx.moveTo(x - mastHeight * 0.09, baseY);
    ctx.lineTo(x, wheelY);
    ctx.moveTo(x + mastHeight * 0.09, baseY);
    ctx.lineTo(x, wheelY);
    for (let index = 1; index < 4; index += 1) {
      const t = index / 4;
      const y = baseY + (wheelY - baseY) * t;
      const halfWidth = mastHeight * 0.09 * (1 - t);
      ctx.moveTo(x - halfWidth, y);
      ctx.lineTo(x + halfWidth, y);
    }
    ctx.stroke();

    // Fan blades.
    ctx.beginPath();
    for (let index = 0; index < 14; index += 1) {
      const angle = spin + (index / 14) * Math.PI * 2;
      ctx.moveTo(x, wheelY);
      ctx.lineTo(
        x + Math.cos(angle) * wheelRadius,
        wheelY + Math.sin(angle) * wheelRadius,
      );
    }
    ctx.stroke();

    // Tail vane.
    ctx.beginPath();
    ctx.moveTo(x, wheelY);
    ctx.lineTo(x + wheelRadius * 1.9, wheelY - wheelRadius * 0.25);
    ctx.lineTo(x + wheelRadius * 1.9, wheelY + wheelRadius * 0.55);
    ctx.closePath();
    ctx.fillStyle = lift(mixHex("#1C1712", sky.shadow, 0.3), flash * 0.5);
    ctx.fill();
    ctx.restore();
  }

  // ---- Grass: a travelling wind wave the pointer can push against ----
  {
    ctx.save();
    ctx.lineCap = "round";
    const gust = reducedMotion ? 0 : Math.sin(timeMs * 0.0004) * 0.3 + 0.7;
    scene.grass.forEach((blade) => {
      const y = horizon + (height - horizon) * blade.depth ** 1.6;
      if (y < horizon) {
        return;
      }
      const nearness = blade.depth ** 1.6;
      // Wrap in positive space first: a negative JS modulo would push blades
      // off the left edge instead of round to the right.
      const span = width * 1.3;
      const raw = blade.x * width + parallax * 1.6 + width * 0.15;
      const x = (((raw % span) + span) % span) - width * 0.15;
      // Short and dense. Taller blades read as scattered sticks rather than a
      // grass field.
      const bladeHeight = blade.height * height * (0.14 + nearness * 0.55);

      let bend = blade.lean;
      if (!reducedMotion) {
        bend +=
          Math.sin(timeMs * 0.0016 + blade.phase + blade.x * 6) * 0.42 * gust;
      }
      if (pointer && !reducedMotion) {
        const distance = (x - pointer.x) / (width * 0.16);
        if (Math.abs(distance) < 1) {
          // Blades lay over away from the cursor, like a hand through grass.
          bend += Math.sign(distance) * (1 - Math.abs(distance)) * 1.5;
        }
      }

      const tipX = x + bend * bladeHeight * 0.55;
      const tipY = y - bladeHeight;
      // Three tones: sunlit seedheads, mid grass, and shadowed tussock. The
      // mix is what stops the field reading as one flat colour.
      const bladeColour =
        blade.tone > 0.78
          ? lift(sky.grass, 0.3 + flash * 0.25)
          : blade.tone > 0.4
            ? mixHex(sky.grass, sky.horizon, 0.18)
            : mixHex(sky.grass, sky.shadow, 0.55);
      ctx.strokeStyle = rgbaFromHex(bladeColour, 0.3 + nearness * 0.6);
      ctx.lineWidth = Math.max(0.7, nearness * 2.6);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + bend * bladeHeight * 0.2, y - bladeHeight * 0.6, tipX, tipY);
      ctx.stroke();
    });
    ctx.restore();
  }

  // ---- Atmospheric falloff ----
  // Haze pooling just below the horizon is what separates "far plain" from
  // "flat brown paint". Drawn over the grass so distant blades sink into it.
  {
    const hazeDepth = (height - horizon) * 0.42;
    const haze = ctx.createLinearGradient(0, horizon, 0, horizon + hazeDepth);
    haze.addColorStop(0, rgbaFromHex(sky.horizon, 0.5));
    haze.addColorStop(0.45, rgbaFromHex(sky.horizon, 0.16));
    haze.addColorStop(1, rgbaFromHex(sky.horizon, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon, width, hazeDepth);
  }

  // ---- Dust and pollen in the low sun ----
  {
    ctx.save();
    scene.motes.forEach((mote) => {
      const travel = reducedMotion ? 0 : timeMs * 0.00004 * mote.drift;
      const x = ((mote.x + travel) % 1) * width;
      const y = horizon - mote.depth * horizon * 0.45;
      const bob = reducedMotion
        ? 0
        : Math.sin(timeMs * 0.0009 + mote.phase) * height * 0.006;
      ctx.fillStyle = `rgba(255, 233, 190, ${0.1 + (1 - sky.darkness) * 0.28})`;
      ctx.beginPath();
      ctx.arc(x, y + bob, mote.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ---- Birds ----
  if (scene.birds.length > 0) {
    ctx.save();
    ctx.strokeStyle = rgbaFromHex(sky.shadow, 0.55);
    ctx.lineWidth = 1.4;
    scene.birds.forEach((bird) => {
      // ~40-60s to cross, which reads as distant birds rather than insects.
      const travel = reducedMotion ? 0 : (timeMs * bird.speed * 0.002) % 1.2;
      const x = (((bird.x + travel) % 1.2) - 0.1) * width;
      const y = bird.y * horizon;
      const flap = reducedMotion
        ? 0.4
        : 0.25 + Math.abs(Math.sin(timeMs * 0.006 + bird.phase)) * 0.5;
      const span = 7 * bird.scale;
      ctx.beginPath();
      ctx.moveTo(x - span, y);
      ctx.quadraticCurveTo(x - span * 0.5, y - span * flap, x, y);
      ctx.quadraticCurveTo(x + span * 0.5, y - span * flap, x + span, y);
      ctx.stroke();
    });
    ctx.restore();
  }

  // ---- Lightning wash over the whole frame ----
  if (flash > 0.02) {
    ctx.save();
    ctx.fillStyle = `rgba(214, 226, 255, ${flash * 0.07})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // ---- Vignette keeps page content readable ----
  {
    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.45,
      Math.min(width, height) * 0.25,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.78,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(6, 8, 12, ${isDarkMode ? 0.55 : 0.28})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
};
