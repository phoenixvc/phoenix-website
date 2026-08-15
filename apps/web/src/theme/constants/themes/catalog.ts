import type { ThemeName } from "@/theme/types";

export type ThemeAvailability = "available" | "coming-soon";

export interface ThemeCatalogEntry {
  id: ThemeName;
  displayName: string;
  availability: ThemeAvailability;
  description: string;
}

/**
 * Canonical product catalogue. ThemeName describes every reserved identity;
 * availability describes what the runtime may currently select and persist.
 */
export const THEME_CATALOG = {
  "cosmic-frontier": {
    id: "cosmic-frontier",
    displayName: "Cosmic Frontier",
    availability: "available",
    description: "Interactive deep-space environment and portfolio map.",
  },
  forest: {
    id: "forest",
    displayName: "Forest",
    availability: "available",
    description: "Immersive canopy environment with leaves, fireflies, and groves.",
  },
  highveld: {
    id: "highveld",
    displayName: "Highveld",
    availability: "available",
    description: "Panoramic horizon plateau with dynamic seeded lightning and wind-swept veld.",
  },
  phoenix: {
    id: "phoenix",
    displayName: "Phoenix",
    availability: "available",
    description: "Incandescent volcanic rebirth environment with molten embers and solar beacons.",
  },
  ocean: {
    id: "ocean",
    displayName: "Ocean",
    availability: "available",
    description: "Abyssal pelagic trench environment with bioluminescent jellyfish, caustics, and hydrothermal vents.",
  },
  classic: {
    id: "classic",
    displayName: "Classic",
    availability: "coming-soon",
    description: "Reserved supporting palette.",
  },
  lavender: {
    id: "lavender",
    displayName: "Lavender",
    availability: "coming-soon",
    description: "Reserved supporting palette.",
  },
  cloud: {
    id: "cloud",
    displayName: "Cloud",
    availability: "coming-soon",
    description: "Reserved supporting palette.",
  },
} as const satisfies Record<ThemeName, ThemeCatalogEntry>;

export const THEME_CATALOG_ORDER = [
  "cosmic-frontier",
  "forest",
  "highveld",
  "phoenix",
  "ocean",
  "classic",
  "lavender",
  "cloud",
] as const satisfies readonly ThemeName[];

export const AVAILABLE_THEME_NAMES = [
  "cosmic-frontier",
  "forest",
  "highveld",
  "phoenix",
  "ocean",
] as const satisfies readonly ThemeName[];

export const DEFAULT_THEME_NAME: ThemeName = "cosmic-frontier";

export const THEME_CATALOG_ENTRIES = THEME_CATALOG_ORDER.map(
  (themeName) => THEME_CATALOG[themeName],
);

export const AVAILABLE_THEME_ENTRIES = AVAILABLE_THEME_NAMES.map(
  (themeName) => THEME_CATALOG[themeName],
);

export function isAvailableThemeName(value: unknown): value is ThemeName {
  return (
    typeof value === "string" &&
    (AVAILABLE_THEME_NAMES as readonly string[]).includes(value)
  );
}
