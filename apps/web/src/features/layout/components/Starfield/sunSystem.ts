// sunSystem.ts - Dynamic sun positioning with gravitational interactions
import { SUNS } from "./cosmos/cosmicHierarchy";
import { createSeededRandom, getDailySeededRandom } from "./utils";
import { SUN_PHYSICS } from "./physicsConfig";
import { getFrameTime } from "./frameCache";
import { hexToRgbSafe, lightenRgb } from "./colorUtils";
import { TWO_PI, fastSin } from "./math";

export interface SunState {
  id: string;
  name: string;
  description?: string;
  color: string;
  // Pre-computed RGB values to avoid parsing hex every frame
  colorRgb: { r: number; g: number; b: number };
  colorRgbStr: string; // "r, g, b" format for gradient stops
  // Pre-computed secondary color RGB string for gradient stops
  secondaryRgbStr: string;
  // Pre-computed lightened color strings to avoid lightenColor() per frame
  // These are "rgb(r, g, b)" format strings used in sunLayers.ts
  lightenedColors: {
    light40: string; // lightenColor(color, 0.4) - hover ring
    light50: string; // lightenColor(color, 0.5) - inner ring, photosphere
    light60: string; // lightenColor(color, 0.6) - flares, ejected particles
    light70: string; // lightenColor(color, 0.7) - particles
    light80: string; // lightenColor(color, 0.8) - particles, photosphere
    light85: string; // lightenColor(color, 0.85) - photosphere
  };
  // Current position (0-1 normalized, will be multiplied by canvas dimensions)
  x: number;
  y: number;
  // Velocity for physics-based movement
  vx: number;
  vy: number;
  // Base position (where sun wants to return to)
  baseX: number;
  baseY: number;
  // Size multiplier
  size: number;
  // Rotation angle for when suns get close
  rotationAngle: number;
  rotationSpeed: number;
  // Is this sun in "propel" mode (avoiding collision)
  isPropelling: boolean;
  propelTimer: number;
  // Unique drift parameters for independent movement
  driftPhaseX: number;
  driftPhaseY: number;
  driftSpeedX: number;
  driftSpeedY: number;
  driftAmplitudeX: number;
  driftAmplitudeY: number;
  // Staggered movement - when this sun becomes active
  activationTime: number;
  isActive: boolean;
  // Accumulated click repulsion (stacks up to a maximum)
  clickRepulsionX: number;
  clickRepulsionY: number;
  clickRepulsionDecay: number;
}

/**
 * Generate randomized sun positions with proper spacing.
 * Uses seeded random for consistent daily layouts - all users on the same day
 * see the same positions, but positions change daily.
 *
 * @param count - Number of sun positions to generate
 * @returns Array of normalized positions (0-1)
 */
function generateRandomSunPositions(
  count: number,
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const maxAttempts = SUN_PHYSICS.maxPositionAttempts;
  const edgePadding = SUN_PHYSICS.edgePadding;
  const minDistance = SUN_PHYSICS.minDistance;
  const sidebarOffset = SUN_PHYSICS.sidebarOffset;

  // Use seeded random for consistent daily layouts (offset 2000 for suns)
  const random = getDailySeededRandom(2000);

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let validPosition = false;
    let x = 0,
      y = 0;

    while (!validPosition && attempts < maxAttempts) {
      // Generate random position within bounds (accounting for sidebar)
      x =
        edgePadding +
        sidebarOffset +
        random() * (1 - 2 * edgePadding - sidebarOffset);
      y = edgePadding + random() * (1 - 2 * edgePadding);

      // Check distance from all existing positions
      validPosition = true;
      for (const pos of positions) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
          validPosition = false;
          break;
        }
      }
      attempts++;
    }

    // If we couldn't find a valid position, use a fallback quadrant position
    if (!validPosition) {
      const quadrantX = i % 2 === 0 ? 0.25 : 0.75;
      const quadrantY = i < 2 ? 0.25 : 0.75;
      x = quadrantX + (random() - 0.5) * 0.15;
      y = quadrantY + (random() - 0.5) * 0.15;
    }

    positions.push({ x, y });
  }

  return positions;
}

// Generate positions once when module loads (consistent within same day)
export const INITIAL_SUN_POSITIONS = generateRandomSunPositions(4);

// Global sun state (mutable for animation)
let sunStates: SunState[] = [];
let systemStartTime = 0;
let deterministicSeed: number | undefined;

export function setSunSystemSeed(seed: number | undefined): void {
  deterministicSeed = seed;
}

// Initialize sun states
export function initializeSunStates(): void {
  const focusAreaSuns = SUNS.filter(
    (sun) => sun.parentId === "focus-areas-galaxy",
  );
  systemStartTime = Date.now();
  const random =
    deterministicSeed === undefined
      ? Math.random
      : createSeededRandom(deterministicSeed + 3000);

  sunStates = focusAreaSuns.map((sun, index) => {
    const pos = INITIAL_SUN_POSITIONS[index % INITIAL_SUN_POSITIONS.length];

    // Create unique drift parameters for each sun so they move independently
    const driftPhaseX = random() * TWO_PI; // Random starting phase
    const driftPhaseY = random() * TWO_PI;
    const driftSpeedX =
      SUN_PHYSICS.driftSpeedMin +
      random() * (SUN_PHYSICS.driftSpeedMax - SUN_PHYSICS.driftSpeedMin);
    const driftSpeedY =
      SUN_PHYSICS.driftSpeedMin +
      random() * (SUN_PHYSICS.driftSpeedMax - SUN_PHYSICS.driftSpeedMin);
    // Vary the speed slightly so X and Y don't sync up
    const driftAmplitudeX =
      SUN_PHYSICS.driftAmplitudeMin +
      random() *
        (SUN_PHYSICS.driftAmplitudeMax - SUN_PHYSICS.driftAmplitudeMin);
    const driftAmplitudeY =
      SUN_PHYSICS.driftAmplitudeMin +
      random() *
        (SUN_PHYSICS.driftAmplitudeMax - SUN_PHYSICS.driftAmplitudeMin);

    // Staggered activation - first sun (index 0) starts first, others wait longer with random delays
    // This provides consistent behavior while still having natural-looking staggered activation
    const isFirstSun = index === 0;
    const activationTime = isFirstSun
      ? systemStartTime + SUN_PHYSICS.activationDelayMin
      : systemStartTime +
        SUN_PHYSICS.activationDelayMin +
        random() *
          (SUN_PHYSICS.activationDelayMax - SUN_PHYSICS.activationDelayMin);

    // Pre-compute RGB values and lightened colors once at initialization
    const sunColor = sun.color || "#ffffff";
    const rgb = hexToRgbSafe(sunColor);

    // Pre-compute secondary color (warmer shift for gradient stops)
    const secondaryRgb = {
      r: Math.min(255, rgb.r + 40),
      g: Math.min(255, rgb.g + 20),
      b: rgb.b,
    };

    // Pre-compute all lightened colors to avoid lightenColor() calls per frame
    const rgbToStr = (c: { r: number; g: number; b: number }): string =>
      `rgb(${c.r}, ${c.g}, ${c.b})`;
    const light40 = lightenRgb(rgb, 0.4);
    const light50 = lightenRgb(rgb, 0.5);
    const light60 = lightenRgb(rgb, 0.6);
    const light70 = lightenRgb(rgb, 0.7);
    const light80 = lightenRgb(rgb, 0.8);
    const light85 = lightenRgb(rgb, 0.85);

    return {
      id: sun.id,
      name: sun.name,
      description: sun.description,
      color: sunColor,
      colorRgb: rgb,
      colorRgbStr: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      secondaryRgbStr: `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`,
      lightenedColors: {
        light40: rgbToStr(light40),
        light50: rgbToStr(light50),
        light60: rgbToStr(light60),
        light70: rgbToStr(light70),
        light80: rgbToStr(light80),
        light85: rgbToStr(light85),
      },
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      baseX: pos.x,
      baseY: pos.y,
      size: sun.size,
      rotationAngle: random() * TWO_PI,
      rotationSpeed: 0.00001,
      isPropelling: false,
      propelTimer: 0,
      driftPhaseX,
      driftPhaseY,
      driftSpeedX,
      driftSpeedY,
      driftAmplitudeX,
      driftAmplitudeY,
      activationTime,
      isActive: false,
      clickRepulsionX: 0,
      clickRepulsionY: 0,
      clickRepulsionDecay: SUN_PHYSICS.clickRepulsionDecay,
    };
  });
}

/**
 * Reset sun system state - call this when unmounting the starfield component
 * to prevent memory leaks and stale state on remount
 */
export function resetSunSystem(): void {
  sunStates = [];
  systemStartTime = 0;
}

// Update sun physics
export function updateSunPhysics(deltaTime: number): void {
  if (sunStates.length === 0) {
    initializeSunStates();
    return;
  }

  const dt = Math.min(deltaTime, 50); // Cap delta time to prevent physics explosions
  const currentTime = getFrameTime();

  // Update each sun
  for (let i = 0; i < sunStates.length; i++) {
    const sun = sunStates[i];

    // Check if sun should become active based on time
    if (!sun.isActive && currentTime >= sun.activationTime) {
      sun.isActive = true;
    }

    // Check if this sun should be triggered by nearby active suns
    if (!sun.isActive) {
      for (let j = 0; j < sunStates.length; j++) {
        if (i === j || !sunStates[j].isActive) continue;

        const other = sunStates[j];
        const dx = other.x - sun.x;
        const dy = other.y - sun.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If an active sun gets close enough, trigger this sun
        if (dist < SUN_PHYSICS.activationTriggerRadius) {
          sun.isActive = true;
          break;
        }
      }
    }

    // Only apply drift movement if sun is active
    if (sun.isActive) {
      // 1. Calculate smooth sinusoidal drift - unique for each sun
      // This creates a gentle, organic floating motion
      sun.driftPhaseX += sun.driftSpeedX * dt;
      sun.driftPhaseY += sun.driftSpeedY * dt;

      // Calculate target position based on base + smooth drift
      const driftX = fastSin(sun.driftPhaseX) * sun.driftAmplitudeX;
      const driftY = fastSin(sun.driftPhaseY) * sun.driftAmplitudeY;
      const targetX = sun.baseX + driftX;
      const targetY = sun.baseY + driftY;

      // 2. Smoothly interpolate current position towards target (lerp)
      // Using direct position lerp instead of velocity for smoother, non-jerky movement
      const lerpFactor = 0.003; // Reduced from 0.02 for much smoother movement

      // Direct position interpolation (smoother than velocity-based)
      sun.x += (targetX - sun.x) * lerpFactor;
      sun.y += (targetY - sun.y) * lerpFactor;
    }

    // 3. Apply accumulated click repulsion
    sun.vx += sun.clickRepulsionX;
    sun.vy += sun.clickRepulsionY;

    // Decay the click repulsion over time
    sun.clickRepulsionX *= sun.clickRepulsionDecay;
    sun.clickRepulsionY *= sun.clickRepulsionDecay;

    // Clear very small repulsion values
    if (Math.abs(sun.clickRepulsionX) < 0.0001) sun.clickRepulsionX = 0;
    if (Math.abs(sun.clickRepulsionY) < 0.0001) sun.clickRepulsionY = 0;

    // 4. Apply center repulsion to prevent clustering (directly to position for smoothness)
    const centerDx = sun.x - SUN_PHYSICS.centerX;
    const centerDy = sun.y - SUN_PHYSICS.centerY;
    const centerDist = Math.sqrt(centerDx * centerDx + centerDy * centerDy);

    if (
      centerDist < SUN_PHYSICS.centerRepulsionRadius &&
      centerDist > SUN_PHYSICS.minDistanceThreshold
    ) {
      // Push away from center with increasing force as they get closer
      const centerRepelFactor =
        (SUN_PHYSICS.centerRepulsionRadius - centerDist) /
        SUN_PHYSICS.centerRepulsionRadius;
      const centerNx = centerDx / centerDist;
      const centerNy = centerDy / centerDist;
      // Apply directly to position for smoother effect (reduced strength)
      sun.x +=
        centerNx *
        SUN_PHYSICS.centerRepulsionStrength *
        centerRepelFactor *
        0.5;
      sun.y +=
        centerNy *
        SUN_PHYSICS.centerRepulsionStrength *
        centerRepelFactor *
        0.5;
    }

    // 5. Check for proximity to other suns and apply gentle repulsion
    for (let j = 0; j < sunStates.length; j++) {
      if (i === j) continue;

      const other = sunStates[j];
      const dx = other.x - sun.x;
      const dy = other.y - sun.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If suns get too close, push them apart gently
      if (
        dist < SUN_PHYSICS.propelThreshold &&
        dist > SUN_PHYSICS.minDistanceThreshold
      ) {
        sun.isPropelling = true;
        sun.propelTimer = 60;

        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;

        // Apply very gentle repulsion directly to position (not velocity) for smoother effect
        const repelStrength =
          (SUN_PHYSICS.propelThreshold - dist) / SUN_PHYSICS.propelThreshold;
        const repelForce = repelStrength * 0.0003; // Reduced from 0.001 and applied to position
        sun.x -= nx * repelForce;
        sun.y -= ny * repelForce;

        // Increase rotation speed when close
        sun.rotationSpeed = Math.min(
          0.0003,
          sun.rotationSpeed + SUN_PHYSICS.rotationSpeedBoost * dt * 0.0001,
        );
      }
    }

    // 6. Apply stronger velocity damping for smoother movement
    sun.vx *= 0.92; // Increased damping from 0.98 for quicker settling
    sun.vy *= 0.92;

    // 7. Update position based on velocity (reduced effect)
    sun.x += sun.vx * 0.3; // Reduce velocity impact for smoother movement
    sun.y += sun.vy * 0.3;

    // 8. Update propel timer
    if (sun.propelTimer > 0) {
      sun.propelTimer -= 1;
      if (sun.propelTimer <= 0) {
        sun.isPropelling = false;
      }
    }

    // 9. Gradually reduce rotation speed when not propelling
    if (!sun.isPropelling) {
      sun.rotationSpeed = Math.max(0.00001, sun.rotationSpeed * 0.998);
    }

    // 10. Update rotation angle smoothly
    sun.rotationAngle += sun.rotationSpeed * dt;

    // 11. Keep suns within bounds (with padding)
    const padding = 0.12;
    if (sun.x < padding) {
      sun.x = padding;
      sun.vx = Math.abs(sun.vx) * 0.5; // Bounce back
    }
    if (sun.x > 1 - padding) {
      sun.x = 1 - padding;
      sun.vx = -Math.abs(sun.vx) * 0.5;
    }
    if (sun.y < padding) {
      sun.y = padding;
      sun.vy = Math.abs(sun.vy) * 0.5;
    }
    if (sun.y > 1 - padding) {
      sun.y = 1 - padding;
      sun.vy = -Math.abs(sun.vy) * 0.5;
    }
  }
}

// Get current sun states
export function getSunStates(): SunState[] {
  return sunStates;
}

// Get sun position by id
export function getSunPosition(sunId: string): { x: number; y: number } | null {
  const sun = sunStates.find((s) => s.id === sunId);
  if (sun) {
    return { x: sun.x, y: sun.y };
  }
  return null;
}

// Calculate sun sizes based on the total mass of their orbiting planets
// This makes suns with more/heavier planets appear larger
export function updateSunSizesFromPlanets(
  planets: Array<{ orbitParentId?: string; project?: { mass?: number } }>,
): void {
  if (sunStates.length === 0 || !planets || planets.length === 0) return;

  // Calculate total mass for each sun
  const sunMasses = new Map<string, number>();

  planets.forEach((planet) => {
    const sunId = planet.orbitParentId;
    if (sunId) {
      const mass = planet.project?.mass || 100; // Default mass of 100
      const currentMass = sunMasses.get(sunId) || 0;
      sunMasses.set(sunId, currentMass + mass);
    }
  });

  // Find min and max masses for normalization
  const masses = Array.from(sunMasses.values());
  if (masses.length === 0) return;

  const minMass = Math.min(...masses);
  const maxMass = Math.max(...masses);
  const massRange = maxMass - minMass || 1; // Avoid division by zero

  // Update sun sizes based on their total planet mass
  // Base size range: 0.035 (smallest) to 0.075 (largest) - slightly increased
  const MIN_SUN_SIZE = 0.035;
  const MAX_SUN_SIZE = 0.075;

  sunStates.forEach((sun) => {
    const totalMass = sunMasses.get(sun.id);
    if (totalMass !== undefined) {
      // Normalize mass to 0-1 range
      const normalizedMass = (totalMass - minMass) / massRange;
      // Scale to size range with sqrt for better visual scaling
      sun.size =
        MIN_SUN_SIZE +
        Math.sqrt(normalizedMass) * (MAX_SUN_SIZE - MIN_SUN_SIZE);
    } else {
      // Sun with no planets gets minimum size
      sun.size = MIN_SUN_SIZE;
    }
  });
}

// Get all sun positions (for orbit calculations)
export function getAllSunPositions(): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const sun of sunStates) {
    positions.set(sun.id, { x: sun.x, y: sun.y });
  }
  return positions;
}

// Map focus area to sun id
export function getFocusAreaSunId(focusArea: string): string {
  const mapping: Record<string, string> = {
    "fintech-blockchain": "fintech-blockchain-sun",
    "ai-ml": "ai-ml-sun",
    "defense-security": "defense-security-sun",
    "mobility-transportation": "mobility-transportation-sun",
  };
  return mapping[focusArea] || "fintech-blockchain-sun";
}

/**
 * Apply repulsive force to suns from a mouse click
 * The force stacks up to a maximum value to prevent suns from flying off screen
 * @param clickX - Normalized click X position (0-1)
 * @param clickY - Normalized click Y position (0-1)
 * @returns Number of suns affected
 */
export function applyClickRepulsionToSuns(
  clickX: number,
  clickY: number,
): number {
  if (sunStates.length === 0) {
    initializeSunStates();
    return 0;
  }

  let affectedCount = 0;

  for (const sun of sunStates) {
    const dx = sun.x - clickX;
    const dy = sun.y - clickY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only affect suns within the click repulsion radius
    if (
      dist < SUN_PHYSICS.clickRepulsionRadius &&
      dist > SUN_PHYSICS.minDistanceThreshold
    ) {
      // Calculate force based on distance (closer = stronger)
      const forceFactor = 1 - dist / SUN_PHYSICS.clickRepulsionRadius;
      const force = SUN_PHYSICS.clickRepulsionForce * forceFactor;

      // Normalize direction
      const nx = dx / dist;
      const ny = dy / dist;

      // Add to accumulated repulsion (stacking effect)
      sun.clickRepulsionX += nx * force;
      sun.clickRepulsionY += ny * force;

      // Clamp to maximum to prevent flying off
      const currentMagnitude = Math.sqrt(
        sun.clickRepulsionX * sun.clickRepulsionX +
          sun.clickRepulsionY * sun.clickRepulsionY,
      );

      if (currentMagnitude > SUN_PHYSICS.maxClickRepulsion) {
        const scale = SUN_PHYSICS.maxClickRepulsion / currentMagnitude;
        sun.clickRepulsionX *= scale;
        sun.clickRepulsionY *= scale;
      }

      // Also activate the sun if it was inactive (click triggers movement)
      if (!sun.isActive) {
        sun.isActive = true;
      }

      // Increase rotation speed for visual feedback
      sun.rotationSpeed = Math.min(0.0005, sun.rotationSpeed + 0.0001);
      sun.isPropelling = true;
      sun.propelTimer = 120; // Longer propel visual effect on click

      affectedCount++;
    }
  }

  return affectedCount;
}

/**
 * Apply repulsive force using canvas coordinates
 * This is a convenience wrapper for use from click handlers
 * @param canvasX - Click X position in canvas coordinates
 * @param canvasY - Click Y position in canvas coordinates
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @returns Number of suns affected
 */
export function applyClickRepulsionToSunsCanvas(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
): number {
  // Convert canvas coordinates to normalized coordinates
  const normalizedX = canvasX / canvasWidth;
  const normalizedY = canvasY / canvasHeight;
  return applyClickRepulsionToSuns(normalizedX, normalizedY);
}

// Check if mouse is hovering over a sun - returns only the CLOSEST sun
// This ensures only one sun is highlighted at a time
export function checkSunHover(
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number,
  hoverRadius: number = 40,
): { sun: SunState; distance: number } | null {
  if (sunStates.length === 0) {
    initializeSunStates();
  }

  let closestSun: SunState | null = null;
  let closestDistance = Infinity;

  for (const sun of sunStates) {
    // Convert normalized position to canvas coordinates
    const sunX = sun.x * canvasWidth;
    const sunY = sun.y * canvasHeight;

    // Calculate distance from mouse to sun center
    const dx = mouseX - sunX;
    const dy = mouseY - sunY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate effective hover radius based on sun size
    const sunRadius = Math.max(
      20,
      Math.min(canvasWidth, canvasHeight) * sun.size * 0.5,
    );
    const effectiveRadius = sunRadius + hoverRadius;

    // Check if within hover radius and closer than previous closest
    if (distance < effectiveRadius && distance < closestDistance) {
      closestSun = sun;
      closestDistance = distance;
    }
  }

  if (closestSun) {
    return { sun: closestSun, distance: closestDistance };
  }

  return null;
}
