// src/theme/types/core/variables.ts

import { ThemeName, ThemeMode } from "./base";
import { ThemeColors } from "./colors";

/**
 * Core CSS Variable Types
 * @description Basic types for CSS variable definition and mapping
 */
export interface CSSVariableMappings {
  [key: string]: string;
}

export interface CSSVariableOptions {
  prefix: string;
  scope: string;
  format: "rgb" | "hsl" | "hex";
  important?: boolean;
}

/**
 * CSS Variable Configuration
 */
export interface CssVariableConfig {
  prefix: string;
  suffix?: string;
  scheme: ThemeName;
  scope?: string;
  mode?: ThemeMode;
}

export interface CssVariableFormatOptions {
  format?: "kebab" | "camel";
  separator?: string;
  fallback?: string;
}

/**
 * CSS Variable Structure
 */
export interface CssVariable {
  name: string;
  value: string;
  scope?: string;
  scheme?: ThemeName;
  mode?: ThemeMode;
}

export interface CssVariableSet {
  [key: string]: string | CssVariableSet;
}

/**
 * CSS Variable Utilities
 */
export interface CssVariableUtils {
  create: (
    name: string,
    value: string,
    config?: CssVariableConfig,
  ) => CssVariable;
  format: (variable: CssVariable, options?: CssVariableFormatOptions) => string;
  parse: (cssVariable: string) => Partial<CssVariable>;
}

/**
 * Theme variables
 * @description Complete set of theme variables including computed values
 */
export interface ThemeVariables {
  /** A namespace or prefix for all theme variables */
  prefix: string;
  /** The raw color mappings used to derive computed values */
  mappings: ThemeColors;
  /** Dynamically computed tokens based on the mappings */
  computed: {
    /** Computed colors (in HSL format) for the theme */
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      textSecondary: string;
      muted: string;
      border: string;
      surface: string;
      overlay: string;
      hover: string;
      active: string;
      focus: string;
      disabled: string;
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    /** Spacing tokens */
    spacing: Record<string, string>;
    /** Typography tokens grouped by usage */
    typography: {
      body: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        letterSpacing?: string;
      };
      heading: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        letterSpacing?: string;
      };
    };
    /** Breakpoint values for responsive design */
    breakpoints: Record<string, string>;
    /** Shadow definitions */
    shadows: Record<string, string>;
    /** Animation settings (each is an object with duration and easing) */
    animation: Record<string, { duration: string; easing: string }>;
    /** zIndex values for stacking contexts */
    zIndex: Record<string, number>;
  };
}
