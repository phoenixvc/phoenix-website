// constants/tokens/theme-constants.ts

import { ThemeName, ThemeMode } from "@/theme/types";

// Theme constants
export const THEME_STORAGE_KEY = "app-theme-preferences";
export const DEFAULT_THEME: ThemeName = "classic";
export const DEFAULT_MODE: ThemeMode = "light";

// Z-index values
export const zIndices = {
  hide: -1,
  auto: "auto",
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Border radius values
export const radii = {
  none: "0",
  sm: "0.125rem",
  md: "0.25rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
} as const;

// Opacity values
export const opacities = {
  0: "0",
  5: "0.05",
  10: "0.1",
  20: "0.2",
  25: "0.25",
  30: "0.3",
  40: "0.4",
  50: "0.5",
  60: "0.6",
  70: "0.7",
  75: "0.75",
  80: "0.8",
  90: "0.9",
  95: "0.95",
  100: "1",
} as const;

// Blur values
export const blurs = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "16px",
  xl: "24px",
  "2xl": "40px",
  "3xl": "64px",
} as const;

// Theme class generation
export const getThemeClass = (theme: ThemeName, mode: ThemeMode): string => {
  return `theme-${theme}-${mode}`;
};

export const COLOR_SCHEME_CLASSES: Record<
  ThemeName,
  Record<ThemeMode, string[]>
> = {
  classic: {
    light: [getThemeClass("classic", "light")],
    dark: [getThemeClass("classic", "dark")],
  },
  ocean: {
    light: [getThemeClass("ocean", "light")],
    dark: [getThemeClass("ocean", "dark")],
  },
  lavender: {
    light: [getThemeClass("lavender", "light")],
    dark: [getThemeClass("lavender", "dark")],
  },
  phoenix: {
    light: [getThemeClass("phoenix", "light")],
    dark: [getThemeClass("phoenix", "dark")],
  },
  forest: {
    light: [getThemeClass("forest", "light")],
    dark: [getThemeClass("forest", "dark")],
  },
  cloud: {
    light: [getThemeClass("cloud", "light")],
    dark: [getThemeClass("cloud", "dark")],
  },
  "cosmic-frontier": {
    light: [getThemeClass("cosmic-frontier", "light")],
    dark: [getThemeClass("cosmic-frontier", "dark")],
  },
} as const;

export const THEME_CONSTANTS = {
  STORAGE: {
    KEYS: {
      THEME_NAME: "theme_name",
      THEME_MODE: "theme_mode",
      CUSTOM_THEMES: "custom_themes",
    },
  },
  COLOR_SCHEMES: [
    "classic",
    "forest",
    "ocean",
    "phoenix",
    "lavender",
    "cloud",
  ] as ThemeName[],
  MODES: ["light", "dark"] as ThemeMode[],
};
