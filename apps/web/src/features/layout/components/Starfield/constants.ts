// components/Layout/Starfield/constants.ts
// Re-exports from centralized portfolioData.ts for backward compatibility
import { BlackHoleData } from "./types";
import {
  PORTFOLIO_PROJECTS,
  type PortfolioProject,
} from "@/constants/portfolioData";
import { getDailySeededRandom } from "./utils";
import { BLACK_HOLE_PHYSICS } from "./physicsConfig";
import { preloadProjectImages } from "./starRendering";
import { distance as calcDistance } from "./math";

// Preload project images early for smooth rendering
preloadProjectImages(PORTFOLIO_PROJECTS);

/**
 * Generate randomized black hole positions with proper spacing.
 * Uses seeded random for consistent daily layouts - all users on the same day
 * see the same positions, but positions change daily.
 */
function generateRandomBlackHolePositions(): Array<{
  x: number;
  y: number;
  radius: number;
  color: string;
}> {
  const positions: Array<{
    x: number;
    y: number;
    radius: number;
    color: string;
  }> = [];
  const maxAttempts = BLACK_HOLE_PHYSICS.maxPositionAttempts;
  const edgePadding = BLACK_HOLE_PHYSICS.edgePadding;
  const minDistance = BLACK_HOLE_PHYSICS.minDistance;

  // Use seeded random for consistent daily layouts (offset 1000 for black holes)
  const random = getDailySeededRandom(1000);

  for (let i = 0; i < 2; i++) {
    let attempts = 0;
    let validPosition = false;
    let x = 0,
      y = 0;

    while (!validPosition && attempts < maxAttempts) {
      // Generate random position within bounds using seeded random
      x = edgePadding + random() * (1 - 2 * edgePadding);
      y = edgePadding + random() * (1 - 2 * edgePadding);

      // Check distance from existing black holes
      validPosition = true;
      for (const pos of positions) {
        if (calcDistance(x, y, pos.x, pos.y) < minDistance) {
          validPosition = false;
          break;
        }
      }
      attempts++;
    }

    // Fallback if no valid position found
    if (!validPosition) {
      x = i === 0 ? 0.25 : 0.75;
      y = i === 0 ? 0.35 : 0.65;
    }

    // Random radius variation (25-35) using seeded random
    const radius = 25 + random() * 10;

    positions.push({ x, y, radius, color: "#8A2BE2" });
  }

  return positions;
}

// Generate positions once when module loads (consistent within same day)
export const DEFAULT_BLACK_HOLES = generateRandomBlackHolePositions();

// Re-export portfolio projects from centralized source
// This maintains backward compatibility with existing imports
export const DEFAULT_PORTFOLIO_PROJECTS: PortfolioProject[] =
  PORTFOLIO_PROJECTS;

// Alternative black hole configurations for multiple black holes
export const MULTIPLE_BLACK_HOLES: BlackHoleData[] = [
  {
    id: "main",
    x: 0,
    y: 0,
    mass: 100,
    particles: 30,
  },
  {
    id: "secondary",
    x: 200,
    y: -150,
    mass: 50,
    particles: 15,
  },
];

// CSS module styles (to be imported from a separate file)
export const STYLES = {
  starfieldCanvas: "absolute top-0 left-0 w-full h-full z-0",
};

export const getColorPalette = (
  colorScheme: string = "purple",
  isDarkMode: boolean = true,
  accentColor?: string,
): string[] => {
  // If custom accent color is provided, create a palette based on it
  if (accentColor) {
    return [
      accentColor,
      `${accentColor}99`, // 60% opacity
      `${accentColor}66`, // 40% opacity
      isDarkMode ? "#ffffff" : "#000000",
    ];
  }

  // Default color palettes
  switch (colorScheme.toLowerCase()) {
    case "blue":
      return isDarkMode
        ? ["#3b82f6", "#60a5fa", "#93c5fd", "#ffffff"] // Dark mode blue
        : ["#1d4ed8", "#3b82f6", "#60a5fa", "#000000"]; // Light mode blue
    case "green":
      return isDarkMode
        ? ["#10b981", "#34d399", "#6ee7b7", "#ffffff"] // Dark mode green
        : ["#059669", "#10b981", "#34d399", "#000000"]; // Light mode green
    case "amber":
      return isDarkMode
        ? ["#f59e0b", "#fbbf24", "#fcd34d", "#ffffff"] // Dark mode amber
        : ["#d97706", "#f59e0b", "#fbbf24", "#000000"]; // Light mode amber
    case "red":
      return isDarkMode
        ? ["#ef4444", "#f87171", "#fca5a5", "#ffffff"] // Dark mode red
        : ["#dc2626", "#ef4444", "#f87171", "#000000"]; // Light mode red
    case "purple":
    default:
      return isDarkMode
        ? ["#9333ea", "#a855f7", "#c084fc", "#ffffff"] // Dark mode purple
        : ["#7e22ce", "#9333ea", "#a855f7", "#000000"]; // Light mode purple
  }
};
