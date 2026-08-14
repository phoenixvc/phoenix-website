// components/Layout/Starfield/blackHoles.ts

import { BlackHole, BlackHoleParticle } from "./types";
import { randomColor } from "./utils";
import { getFrameTime } from "./frameCache";
import { BLACK_HOLE_RENDERING_CONFIG as BH } from "./renderingConfig";
import { TWO_PI, fastSin, fastCos } from "./math";

// Helper to parse RGB values from rgba string (called once per particle, not per frame)
function parseRgbFromRgba(rgbaString: string): {
  r: number;
  g: number;
  b: number;
} {
  const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  return { r: 200, g: 100, b: 200 }; // Fallback purple
}

// Initialize black holes based on configuration
export const initBlackHoles = (
  width: number,
  height: number,
  enableBlackHole: boolean,
  defaultBlackHoles: Array<{
    x: number;
    y: number;
    radius: number;
    color: string;
  }>,
  sidebarWidth: number,
  centerOffsetX: number,
  centerOffsetY: number,
  blackHoleSize: number,
  _particleSpeed: number,
  _colorScheme: string,
  _starSize: number,
  random: () => number = Math.random,
): BlackHole[] => {
  if (!enableBlackHole) return [];

  return defaultBlackHoles.map((hole, index) => {
    // Position black hole relative to canvas size
    const x = hole.x * width + centerOffsetX;
    const y = hole.y * height + centerOffsetY;

    // Reduce the radius significantly to make black holes less massive
    const radius = hole.radius * blackHoleSize * BH.radiusMultiplier;

    // Create a unique id for each black hole
    const id = `blackhole-${index}`;

    // Calculate mass based on radius
    const mass = radius * BH.massCoefficient;

    // Random rotation speed within configured range
    const rotationSpeed =
      BH.rotation.baseSpeed *
      (random() * (BH.rotation.randomMax - BH.rotation.randomMin) +
        BH.rotation.randomMin);

    return {
      id,
      x,
      y,
      radius,
      mass,
      color: hole.color,
      particles: [],
      active: true,
      rotation: 0,
      rotationSpeed,
      lastParticleTime: 0,
    };
  });
};

// Draw a black hole with its accretion disk
export const drawBlackHole = (
  ctx: CanvasRenderingContext2D,
  blackHole: BlackHole,
  deltaTime: number,
  particleSpeed: number,
): void => {
  const { x, y, radius, color: _color, particles } = blackHole;

  // Update rotation
  blackHole.rotation += blackHole.rotationSpeed * deltaTime;

  // Draw outer gravitational distortion glow (pulsing effect)
  const pulseTime = getFrameTime() * BH.pulse.timeMultiplier;
  const pulseFactor =
    1 + fastSin(pulseTime * BH.pulse.frequency) * BH.pulse.amplitude;

  // Outer gravitational glow - very subtle
  ctx.save();
  const outerGlowInner = radius * BH.outerGlow.innerRadiusMultiplier;
  const outerGlowOuter =
    radius * BH.outerGlow.outerRadiusMultiplier * pulseFactor;
  const outerGlow = ctx.createRadialGradient(
    x,
    y,
    outerGlowInner,
    x,
    y,
    outerGlowOuter,
  );
  for (const stop of BH.outerGlow.colorStops) {
    outerGlow.addColorStop(stop.offset, stop.color);
  }
  ctx.beginPath();
  ctx.arc(x, y, outerGlowOuter, 0, TWO_PI);
  ctx.fillStyle = outerGlow;
  ctx.fill();
  ctx.restore();

  // Create particles for accretion disk
  const currentTime = getFrameTime();
  if (currentTime - blackHole.lastParticleTime > BH.particles.spawnIntervalMs) {
    blackHole.lastParticleTime = currentTime;

    // Add particles within configured range
    const particleRange = BH.particles.countMax - BH.particles.countMin;
    const particlesToAdd =
      Math.floor(Math.random() * (particleRange + 1)) + BH.particles.countMin;

    for (let i = 0; i < particlesToAdd; i++) {
      const angle = Math.random() * TWO_PI;
      const distanceRange = BH.particles.distanceMax - BH.particles.distanceMin;
      const distance =
        radius * (BH.particles.distanceMin + Math.random() * distanceRange);
      const speedRange =
        BH.particles.speedRandomMax - BH.particles.speedRandomMin;
      const speed =
        BH.particles.speedBase *
        particleSpeed *
        (Math.random() * speedRange + BH.particles.speedRandomMin);
      const particleColor = randomColor("purple", BH.particles.alphaBase);
      const sizeRange = BH.particles.sizeMax - BH.particles.sizeMin;
      const particleSize = Math.random() * sizeRange + BH.particles.sizeMin;

      // Pre-parse RGB values for fast color manipulation in render loop
      const rgb = parseRgbFromRgba(particleColor);

      const newParticle: BlackHoleParticle = {
        x: x + fastCos(angle) * distance,
        y: y + fastSin(angle) * distance,
        size: particleSize,
        angle,
        distance,
        speed,
        color: particleColor,
        alpha:
          BH.particles.alphaBase + Math.random() * BH.particles.alphaRandom,
        rgb,
      };

      particles.push(newParticle);
    }
  }

  // Limit the maximum number of particles
  // Use length assignment instead of splice for better performance
  if (particles.length > BH.particles.maxCount) {
    particles.length = BH.particles.maxCount;
  }

  // Update and draw particles using forward iteration with swap-and-pop
  // This is O(n) instead of O(n²) because we avoid array shifting
  let i = 0;
  while (i < particles.length) {
    const particle = particles[i];

    // Update angle for orbital motion
    particle.angle += particle.speed * deltaTime;

    // Spiral inward by decreasing distance
    particle.distance -= BH.particles.spiralSpeed * particleSpeed * deltaTime;

    // Update position based on angle and distance
    particle.x = x + fastCos(particle.angle) * particle.distance;
    particle.y = y + fastSin(particle.angle) * particle.distance;

    // Decrease alpha over time
    if (particle.alpha) {
      particle.alpha -= BH.particles.alphaDecay * deltaTime;
    }

    // Remove particles that are too close to center or have faded out
    // Use swap-and-pop: O(1) removal instead of splice's O(n) shifting
    if (
      (particle.alpha && particle.alpha <= 0) ||
      particle.distance < radius * BH.particles.removalThreshold
    ) {
      // Swap with last element and pop (O(1) removal)
      const lastIndex = particles.length - 1;
      if (i !== lastIndex) {
        particles[i] = particles[lastIndex];
      }
      particles.pop();
      // Don't increment i - we need to process the swapped element
      continue;
    }

    // Draw particle
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, TWO_PI);

    // Use alpha if available, otherwise default to 0.6
    const alpha = particle.alpha !== undefined ? particle.alpha : 0.6;

    // Use pre-parsed RGB values for fast color construction (avoids regex per frame)
    if (particle.rgb) {
      ctx.fillStyle = `rgba(${particle.rgb.r}, ${particle.rgb.g}, ${particle.rgb.b}, ${alpha})`;
    } else {
      // Fallback for particles without pre-parsed RGB
      ctx.fillStyle = `rgba(200, 100, 200, ${alpha})`;
    }
    ctx.fill();

    // Increment index to process next particle
    i++;
  }

  // Draw rotating accretion disk rings
  ctx.save();
  const diskRadius = radius * BH.disk.radiusMultiplier;
  const rotationAngle = blackHole.rotation;

  // Draw multiple rotating rings for depth effect
  for (let ring = 0; ring < BH.disk.ringCount; ring++) {
    const ringRadius =
      diskRadius * (BH.disk.ringBaseSize + ring * BH.disk.ringSizeStep);
    const ringOpacity =
      BH.disk.ringBaseOpacity - ring * BH.disk.ringOpacityStep;
    const ringRotation =
      rotationAngle * (1 + ring * BH.disk.ringRotationFactor);

    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      ringRadius,
      ringRadius * BH.disk.ellipseRatio,
      ringRotation,
      0,
      TWO_PI,
    );
    ctx.strokeStyle = `rgba(${BH.disk.color}, ${ringOpacity})`;
    ctx.lineWidth = BH.disk.baseLineWidth - ring * BH.disk.lineWidthStep;
    ctx.stroke();
  }
  ctx.restore();

  // Draw black hole with a more subtle gradient
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const stop of BH.core.colorStops) {
    gradient.addColorStop(stop.offset, stop.color);
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw pulsing event horizon (inner ring)
  const eventHorizonPulse =
    1 -
    BH.eventHorizon.pulseAmplitude +
    fastSin(pulseTime * 2) * BH.eventHorizon.pulseAmplitude;
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    radius * BH.eventHorizon.radiusMultiplier * eventHorizonPulse,
    0,
    TWO_PI,
  );
  const ehOpacity =
    BH.eventHorizon.baseOpacity +
    fastSin(pulseTime * 2.5) * BH.eventHorizon.opacityAmplitude;
  ctx.strokeStyle = `rgba(${BH.disk.color}, ${ehOpacity})`;
  ctx.lineWidth =
    BH.eventHorizon.baseLineWidth +
    fastSin(pulseTime * 3) * BH.eventHorizon.lineWidthAmplitude;
  ctx.stroke();

  // Draw inner core highlight
  ctx.beginPath();
  ctx.arc(x, y, radius * BH.innerCore.radiusMultiplier, 0, TWO_PI);
  ctx.strokeStyle = BH.innerCore.color;
  ctx.lineWidth = BH.innerCore.lineWidth;
  ctx.stroke();
};
