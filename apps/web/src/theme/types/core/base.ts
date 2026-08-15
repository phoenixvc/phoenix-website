// src/theme/types/core/base.ts

import { ThemeConfig } from "./config";
import { SemanticColors, ThemeColors, ThemeSchemeInitial } from "./colors";
import { ThemeVariables } from "./variables";
import { ComponentVariants } from "../mappings/component-variants";

/**
 * Core Theme Identity
 */
export type ThemeName =
  | "classic"
  | "forest"
  | "ocean"
  | "phoenix"
  | "lavender"
  | "cloud"
  | "cosmic-frontier"
  | "highveld";
export type ThemeMode = "light" | "dark";

/**
 * Theme Scale System
 */
export namespace ThemeScale {
  export type Spacing = "spacing";
  export type FontSize = "fontSize";
  export type LineHeight = "lineHeight";
  export type BorderRadius = "borderRadius";
  export type BorderWidth = "borderWidth";
  export type Opacity = "opacity";
  export type ZIndex = "zIndex";

  export type All =
    | Spacing
    | FontSize
    | LineHeight
    | BorderRadius
    | BorderWidth
    | Opacity
    | ZIndex;
}

/**
 * Layout System
 */
export namespace Layout {
  export type CSSUnit = "px" | "rem" | "em" | "vh" | "vw" | "%";
  export type Direction = "ltr" | "rtl";
}

/**
 * Theme Constants Type
 * Defines the structure for the theme constants.
 */
export interface ThemeConstantsType {
  PREFIX: string;
  DEFAULTS: {
    COLOR_SCHEME: ThemeName;
    MODE: ThemeMode;
    TRANSITION: {
      DURATION: number;
      TIMING: string;
      PROPERTIES: string[];
    };
  };
  COLOR_SCHEMES: readonly ThemeName[];
  COLORS: {
    schemes: Partial<Record<ThemeName, ThemeSchemeInitial>>;
    semantic: SemanticColors;
  };
  MODES: readonly ThemeMode[];
  EVENTS: {
    CHANGE: string;
    INIT: string;
    MODE_CHANGE: string;
    SCHEME_CHANGE: string;
    SYSTEM_CHANGE: string;
  };
  STORAGE: {
    PREFIX: string;
    KEYS: {
      COLOR_SCHEME: string;
      MODE: string;
      USE_SYSTEM: string;
    };
  };
  CLASSES: {
    ROOT: string;
    TRANSITION: string;
    COLOR_SCHEME_PREFIX: string;
    MODE_PREFIX: string;
  };
  MEDIA_QUERIES: {
    DARK_MODE: string;
    LIGHT_MODE: string;
    REDUCED_MOTION: string;
  };
}

// Define ThemeCore interface to avoid the undefined error
interface _ThemeCore {
  getTheme: (themeName: ThemeName) => ThemeColors | undefined;
}

/**
 * Configuration options for theme acquisition
 */
export interface ThemeAcquisitionConfig {
  /** Base URL for remote theme acquisition */
  baseUrl?: string;

  /** Default timeout for remote requests in milliseconds */
  timeout?: number;

  /** Default theme mode to use when transforming themes */
  defaultMode?: ThemeMode;

  /** Whether to validate themes after acquisition */
  validateThemes?: boolean;

  /** Whether to transform themes after acquisition */
  transformThemes?: boolean;

  /** Whether to use local storage for persisting themes */
  useLocalStorage?: boolean;

  /** Whether to log operations */
  enableLogging?: boolean;

  /** Whether to allow external theme loading */
  allowExternalLoading?: boolean;

  /** Theme registry to use for theme acquisition */
  themeRegistry?: IThemeRegistry;
}

/**
 * Status of a theme acquisition operation
 */
export type AcquisitionStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "cached";

/**
 * Result of a theme acquisition operation
 */
export interface AcquisitionResult {
  /** Status of the acquisition operation */
  status: AcquisitionStatus;

  /** The acquired theme data, if successful */
  data?: ThemeColors;

  /** Error message, if acquisition failed */
  error?: string;

  /** Source of the theme (local, remote, cache) */
  source?: "local" | "remote" | "cache" | "default" | "registered" | "registry";

  /** Timestamp of when the theme was acquired */
  timestamp: number;
}

export interface ThemeCacheConfig {
  /** Duration in milliseconds for how long a theme should be cached */
  cacheDuration: number;
  /** Default theme mode to use when transforming themes */
  defaultMode: ThemeMode;
  /** Maximum number of themes to keep in cache */
  maxCacheSize?: number;
  /** Whether to log cache operations */
  enableLogging?: boolean;
}

export interface ThemeCacheEntry {
  /** The fully transformed theme data */
  theme: ThemeColors;
  /** Timestamp when the theme was cached */
  timestamp: number;
  /** Source of the theme */
  source: ThemeCacheSource;
}

export interface ThemeMetadata {
  displayName: string;
  description?: string;
  author?: string;
  version?: string;
  tags?: string[];
  preview?: string; // URL or base64 image
  compatibleModes?: ThemeMode[];
  created?: number;
  modified?: number;
}

/**
 * Interface for Theme Registry functionality
 */
export interface IThemeRegistry {
  // Core themes collection
  themes: Record<ThemeName, ThemeColors>;

  // Theme metadata for UI display
  metadata: Record<ThemeName, ThemeMetadata>;

  // Default settings
  defaults: {
    themeName: ThemeName;
    mode: ThemeMode;
  };

  // Theme versioning
  versions: Record<ThemeName, string[]>;

  // Theme source schemes (for regeneration)
  sourceSchemes: Record<ThemeName, ThemeSchemeInitial>;

  /**
   * Register a theme with the registry
   */
  registerTheme(
    name: ThemeName,
    theme: ThemeColors,
    metadata?: Partial<ThemeMetadata>,
    sourceScheme?: ThemeSchemeInitial,
  ): void;

  /**
   * Set the default theme
   */
  setDefaultTheme(themeName: ThemeName, mode?: ThemeMode): void;

  /**
   * Get a theme by name
   */
  getTheme(themeName: ThemeName): ThemeColors | null;

  /**
   * Get theme metadata
   */
  getThemeMetadata(themeName: ThemeName): ThemeMetadata | null;

  /**
   * Get source scheme for a theme
   */
  getSourceScheme(themeName: ThemeName): ThemeSchemeInitial | null;

  /**
   * Get all theme names
   */
  getAllThemeNames(): ThemeName[];

  /**
   * Search themes by tags
   */
  findThemesByTags(tags: string[]): ThemeName[];

  /**
   * Export registry data for persistence
   */
  exportData(): {
    themes: Record<ThemeName, ThemeColors>;
    metadata: Record<ThemeName, ThemeMetadata>;
    defaults: {
      themeName: ThemeName;
      mode: ThemeMode;
    };
    versions: Record<ThemeName, string[]>;
    sourceSchemes: Record<ThemeName, ThemeSchemeInitial>;
  };

  /**
   * Import registry data
   */
  importData(data: {
    themes?: Record<ThemeName, ThemeColors>;
    metadata?: Record<ThemeName, ThemeMetadata>;
    defaults?: {
      themeName: ThemeName;
      mode: ThemeMode;
    };
    versions?: Record<ThemeName, string[]>;
    sourceSchemes?: Record<ThemeName, ThemeSchemeInitial>;
  }): void;
}

// Direct design token interfaces
export interface ThemeSpacing {
  unit?: string; // Optional, could be used for a base unit
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  // Add other spacing values as needed
}

export interface ThemeTypography {
  fontFamily: {
    base: string;
    heading: string;
    monospace: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    light: number;
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
  };
}

export type ThemeCacheSource =
  | "local"
  | "remote"
  | "default"
  | "registered"
  | "registry";

export interface ThemeBorders {
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  width: {
    none: string;
    thin: string;
    normal: string;
    thick: string;
  };
  style: {
    solid: string;
    dashed: string;
    dotted: string;
  };
}

export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeBreakpoints {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeTransitions {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface ThemeZIndex {
  dropdown: number;
  modal: number;
  overlay: number;
  popover: number;
  tooltip: number;
}

// The hybrid Theme interface
export interface Theme {
  // Core configuration
  config: ThemeConfig;

  // Direct design tokens
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  breakpoints: ThemeBreakpoints;
  transitions: ThemeTransitions;
  zIndex: ThemeZIndex;

  // Computed variables
  variables: ThemeVariables;

  // Component-specific styling
  components: ComponentVariants;

  // Extension point
  [key: string]: unknown;
}

/**
 * Interface for ThemeCacheService
 */
export interface IThemeCacheService {
  /**
   * Update the cache configuration
   */
  updateConfig(config: Partial<ThemeCacheConfig>): void;

  /**
   * Get a theme from the cache if it exists and is not expired
   */
  get(name: ThemeName): ThemeColors | null;

  /**
   * Set a theme in the cache, ensuring it is fully transformed first
   */
  set(
    name: ThemeName,
    themeData: ThemeColors | ThemeSchemeInitial,
    semantic?: SemanticColors,
    source?: ThemeCacheSource,
  ): ThemeColors;

  /**
   * Check if a theme exists in the cache and is not expired
   */
  has(name: ThemeName): boolean;

  /**
   * Clear the entire theme cache or a specific theme
   */
  clear(name?: ThemeName): void;

  /**
   * Get information about the current cache state
   */
  getCacheStatus(): {
    size: number;
    themes: ThemeName[];
    expirations: Record<string, number>;
    sources: Record<string, string>;
  };
}
