// src/constants/storage/theme-storage-constants.ts

import { ThemeMode, ThemeName } from "@/theme/types";
import { AVAILABLE_THEME_NAMES, DEFAULT_THEME_NAME } from "../themes/catalog";

export const THEME_STORAGE_CONSTANTS = {
  KEYS: {
    THEME_NAME: "theme_name",
    THEME_MODE: "theme_mode",
    USE_SYSTEM: "use_system_theme",
    CUSTOM_THEMES: "custom_themes",
    THEME_DATA_PREFIX: "theme_data_",
  },
  DEFAULTS: {
    THEME_NAME: DEFAULT_THEME_NAME,
    THEME_MODE: "dark" as ThemeMode,
    USE_SYSTEM: false,
  },
  VALID_THEMES: [...AVAILABLE_THEME_NAMES] as ThemeName[],
  VALID_MODES: ["light", "dark"] as ThemeMode[],

  // Added missing constants
  EVENTS: {
    CHANGE: "theme:change",
    INIT: "theme:init",
    MODE_CHANGE: "theme:mode-change",
    SCHEME_CHANGE: "theme:scheme-change",
    SYSTEM_CHANGE: "theme:system-change",
  } as const,
  STORAGE: {
    PREFIX: "theme:",
    KEYS: {
      COLOR_SCHEME: "theme:color-scheme",
      MODE: "theme:mode",
      USE_SYSTEM: "theme:use-system-mode",
    },
  } as const,
  CLASSES: {
    ROOT: "theme-root",
    TRANSITION: "theme-transition",
    COLOR_SCHEME_PREFIX: "theme-",
    MODE_PREFIX: "theme-mode-",
  } as const,
  MEDIA_QUERIES: {
    DARK_MODE: "(prefers-color-scheme: dark)",
    LIGHT_MODE: "(prefers-color-scheme: light)",
    REDUCED_MOTION: "(prefers-reduced-motion: reduce)",
  } as const,
};
