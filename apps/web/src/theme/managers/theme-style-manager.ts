// theme/managers/theme-style-manager.ts

import React from "react";
import { ColorMapping } from "../mappings";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";
import {
  ColorDefinition,
  ThemeName,
  ThemeMode,
  Theme,
  ThemeColors,
  ShadeMap,
  ShadeLevel,
  ModeColors,
  ThemeSpacing,
  ThemeTypography,
  ThemeBorders,
  ThemeShadows,
  ThemeBreakpoints,
  ThemeTransitions,
  ThemeZIndex,
  ThemeVariables,
  RequiredModeColorKeys,
  SemanticColors,
  REQUIRED_SEMANTIC_COLORS,
  RequiredSemanticColorKeys,
  REQUIRED_MODE_COLORS,
} from "../types";
import { ComponentManager } from "./component-manager";
import { ComponentRegistryManager } from "../registry/component-registry-manager";
import { TypographyManager } from "./typography-manager";
import { ComponentVariantType } from "../types/mappings/component-variants";
import {
  ComponentState,
  InteractiveState,
} from "../types/mappings/state-mappings";
import ColorUtils from "../utils/color-utils";
import CssVariableManager from "./css-variable-manager";
import { logger } from "../../utils/logger";

// Define interfaces for common pattern structures
interface ColorPatternValue {
  background: string;
  foreground: string;
  border: string;
  [key: string]: string;
}

interface CommonPatterns {
  [key: string]: string | ColorPatternValue;
}

// Define interface for component styles
interface ComponentStyle {
  [key: string]: string;
}

// Define a type for the base component structure
type ComponentStructure = Record<string, unknown>;

export class ThemeStyleManager {
  private componentManager: ComponentManager;
  private componentRegistry: ComponentRegistryManager;
  private colorMapping: ColorMapping;
  private typographyManager: TypographyManager;
  private themes: Map<string, Theme> = new Map();
  private debugMode = false; // Logging disabled by default - use VITE_LOG_LEVEL env var to enable

  // Common property patterns and their default values
  private commonPatterns: CommonPatterns = {
    // Simple color definitions
    text: "var(--color-neutral-700)",
    label: "var(--color-neutral-700)",
    placeholder: "var(--color-neutral-500)",
    divider: "var(--color-neutral-200)",
    border: "var(--color-neutral-300)",

    // Component states
    container: {
      background: "var(--color-neutral-100)",
      foreground: "var(--color-neutral-900)",
      border: "var(--color-neutral-300)",
    },
    header: {
      background: "var(--color-neutral-100)",
      foreground: "var(--color-neutral-900)",
      border: "var(--color-neutral-300)",
    },
    footer: {
      background: "var(--color-neutral-100)",
      foreground: "var(--color-neutral-900)",
      border: "var(--color-neutral-300)",
    },

    // Interactive states
    default: {
      background: "var(--color-neutral-100)",
      foreground: "var(--color-neutral-900)",
      border: "var(--color-neutral-300)",
    },
    hover: {
      background: "var(--color-primary-100)",
      foreground: "var(--color-primary-900)",
      border: "var(--color-primary-300)",
    },
    active: {
      background: "var(--color-primary-200)",
      foreground: "var(--color-primary-900)",
      border: "var(--color-primary-400)",
    },
    disabled: {
      background: "var(--color-neutral-300)",
      foreground: "var(--color-neutral-500)",
      border: "var(--color-neutral-400)",
    },
    focus: {
      background: "var(--color-primary-100)",
      foreground: "var(--color-primary-900)",
      border: "var(--color-primary-500)",
    },
    selected: {
      background: "var(--color-primary-100)",
      foreground: "var(--color-primary-900)",
      border: "var(--color-primary-500)",
    },

    // Semantic states
    primary: {
      background: "var(--color-primary-500)",
      foreground: "var(--color-neutral-100)",
      border: "var(--color-primary-600)",
    },
    secondary: {
      background: "var(--color-secondary-500)",
      foreground: "var(--color-neutral-100)",
      border: "var(--color-secondary-600)",
    },
    success: {
      background: "var(--color-success-500)",
      foreground: "var(--color-neutral-100)",
      border: "var(--color-success-600)",
    },
    warning: {
      background: "var(--color-warning-500)",
      foreground: "var(--color-neutral-900)",
      border: "var(--color-warning-600)",
    },
    danger: {
      background: "var(--color-danger-500)",
      foreground: "var(--color-neutral-100)",
      border: "var(--color-danger-600)",
    },
    info: {
      background: "var(--color-info-500)",
      foreground: "var(--color-neutral-100)",
      border: "var(--color-info-600)",
    },
    error: {
      background: "var(--color-neutral-100)",
      foreground: "var(--color-danger-700)",
      border: "var(--color-danger-500)",
      message: "var(--color-danger-700)",
    },
  };

  // Common styles for components
  private commonStyles: Record<string, ComponentStyle> = {
    button: {
      padding: "0.5rem 1rem",
      borderRadius: "0.25rem",
      cursor: "pointer",
      fontWeight: "500",
      transition: "all 0.2s ease-in-out",
    },
    input: {
      padding: "0.5rem",
      borderRadius: "0.25rem",
      borderWidth: "1px",
      borderStyle: "solid",
      outline: "none",
    },
    container: {
      padding: "1rem",
      borderRadius: "0.25rem",
    },
    card: {
      padding: "1rem",
      borderRadius: "0.25rem",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    badge: {
      padding: "0.25rem 0.5rem",
      borderRadius: "0.25rem",
      fontSize: "0.75rem",
      fontWeight: "500",
      display: "inline-block",
    },
    sidebar: {
      width: "240px",
      height: "100%",
      padding: "1rem",
      borderRight: "1px solid var(--color-neutral-200)",
    },
    item: {
      padding: "0.5rem 1rem",
      borderRadius: "0.25rem",
      marginBottom: "0.25rem",
    },
  };

  constructor(
    componentManager: ComponentManager,
    componentRegistry: ComponentRegistryManager,
    colorMapping: ColorMapping,
    typographyManager: TypographyManager,
    private cssVariableManager: CssVariableManager,
  ) {
    this.componentManager = componentManager;
    this.componentRegistry = componentRegistry;
    this.colorMapping = colorMapping;
    this.typographyManager = typographyManager;

    this.log("ThemeStyleManager initialized", {
      componentManager,
      componentRegistry,
      colorMapping,
      typographyManager,
      cssVariableManager,
    });
  }

  /**
   * Logging utility method - uses centralized logger
   */
  private log(message: string, data?: unknown, isError = false): void {
    if (!this.debugMode) return;

    if (isError) {
      logger.error(`ThemeStyleManager: ${message}`, data);
    } else {
      logger.debug(`ThemeStyleManager: ${message}`, data);
    }
  }

  /**
   * Recursively check for NaN values in an object
   */
  private checkForNaN(obj: unknown, path = ""): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === "number" && isNaN(obj)) {
      logger.error(`🚨 NaN detected at path: ${path}`);
      return;
    }

    if (typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.checkForNaN(item, path ? `${path}[${index}]` : `[${index}]`);
      });
      return;
    }

    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
      this.checkForNaN(value, path ? `${path}.${key}` : key);
    });
  }

  /**
   * Register a theme
   */
  registerTheme(theme: Theme): void {
    this.log("Registering theme: ${theme.config.name}", theme);

    // Store the theme
    this.themes.set(theme.config.name, theme);

    // Register component variants
    this.componentRegistry.registerTheme(theme);

    this.log("Theme registered: ${theme.config.name}");
  }

  /**
   * Register just the color portion of a theme
   * This is used when we have ThemeColors but not a full Theme object
   */
  registerThemeColors(themeName: ThemeName, themeColors: ThemeColors): void {
    this.log(`Registering theme colors for: ${themeName}`, themeColors);

    try {
      // Create a minimal theme structure with just the colors
      const minimalTheme: Theme = {
        name: themeName,
        colors: themeColors,
        config: {
          name: themeName,
          mode: "light", // Default mode
          useSystem: false, // Add the required useSystem property
        },
        components: {}, // Empty components
        // Add other required properties from the Theme interface with default values
        spacing: {} as ThemeSpacing,
        typography: {} as ThemeTypography,
        borders: {} as ThemeBorders,
        shadows: {} as ThemeShadows,
        breakpoints: {} as ThemeBreakpoints,
        transitions: {} as ThemeTransitions,
        zIndex: {} as ThemeZIndex,
        variables: {} as ThemeVariables,
      };

      // Store the theme in our local map
      this.themes.set(themeName, minimalTheme);

      // Register color schemes with the color mapping system
      if (themeColors.schemes) {
        // Process each scheme (default, dark, etc.)
        Object.entries(themeColors.schemes).forEach(([schemeName, scheme]) => {
          // Process base colors with their shade maps
          if (scheme.base) {
            Object.entries(scheme.base).forEach(([colorName, colorShades]) => {
              if (typeof colorShades === "object" && colorShades !== null) {
                // Register each shade level
                const shadeMap = colorShades as ShadeMap;
                const shadeLevels: ShadeLevel[] = [
                  50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
                ];

                shadeLevels.forEach((level) => {
                  if (level in shadeMap) {
                    const shade = shadeMap[level];
                    if (shade) {
                      // Register in our CSS variable manager
                      const cssVarName = `--color-${colorName}-${level}`;
                      this.cssVariableManager.setColorVariable(
                        cssVarName,
                        shade.hex,
                      );

                      // Also register with color mapping for component use
                      // Use the existing shade object directly if it's a complete ColorDefinition
                      if (ColorUtils.isCompleteColorDefinition(shade)) {
                        const mappingKey = `${schemeName}-${colorName}-${level}`;
                        this.colorMapping.setColor(mappingKey, shade);
                      } else {
                        // Create a complete ColorDefinition if needed
                        const colorDef =
                          ColorUtils.ensureColorDefinition(shade);
                        const mappingKey = `${schemeName}-${colorName}-${level}`;
                        this.colorMapping.setColor(mappingKey, colorDef);
                      }
                    }
                  }
                });

                // Register the base color if available
                if (
                  "base" in colorShades &&
                  typeof colorShades.base === "string"
                ) {
                  const baseHex = colorShades.base;
                  const cssVarName = `--color-${colorName}`;
                  this.cssVariableManager.setColorVariable(cssVarName, baseHex);

                  // Create a ColorDefinition for the base color
                  const colorDef = ColorUtils.createColorDefinition(baseHex);
                  const mappingKey = `${schemeName}-${colorName}`;
                  this.colorMapping.setColor(mappingKey, colorDef);
                }
              }
            });
          }

          // Process mode-specific colors (light/dark)
          if (scheme.light) {
            this.registerModeColors(scheme.light, "light", schemeName);
          }

          if (scheme.dark) {
            this.registerModeColors(scheme.dark, "dark", schemeName);
          }
        });
      }

      // Process semantic colors
      if (themeColors.semantic) {
        this.registerSemanticColors(themeColors.semantic);
      }

      this.log(`Theme colors registered for: ${themeName}`);
    } catch (error) {
      this.log(`Error registering theme colors for ${themeName}`, error, true);
    }
  }

  /**
   * Register mode-specific colors (light/dark)
   */
  private registerModeColors(
    modeColors: ModeColors,
    mode: "light" | "dark",
    schemeName: string,
  ): void {
    // Register required mode colors
    REQUIRED_MODE_COLORS.forEach((colorKey) => {
      const colorDef = modeColors[colorKey];
      if (colorDef && "hex" in colorDef) {
        // Register in CSS variable manager
        const cssVarName = `--color-${mode}-${colorKey}`;
        this.cssVariableManager.setColorVariable(cssVarName, colorDef.hex);

        // Also register with color mapping - using string type directly
        const mappingKey = `${schemeName}-${mode}-${colorKey}`;
        this.colorMapping.setColor(mappingKey, colorDef);
      }
    });

    // Register optional mode colors
    Object.entries(modeColors).forEach(([colorKey, colorDef]) => {
      // Skip required colors as we already processed them
      if (REQUIRED_MODE_COLORS.includes(colorKey as RequiredModeColorKeys)) {
        return;
      }

      if (colorDef && "hex" in colorDef) {
        // Register in CSS variable manager
        const cssVarName = `--color-${mode}-${colorKey}`;
        this.cssVariableManager.setColorVariable(cssVarName, colorDef.hex);

        // Also register with color mapping - using string type directly
        const mappingKey = `${schemeName}-${mode}-${colorKey}`;
        this.colorMapping.setColor(mappingKey, colorDef);
      }
    });
  }

  /**
   * Register semantic colors
   */
  private registerSemanticColors(semanticColors: SemanticColors): void {
    // Register required semantic colors
    REQUIRED_SEMANTIC_COLORS.forEach((colorKey) => {
      const colorDef = semanticColors[colorKey];
      if (colorDef && "hex" in colorDef) {
        // Register in CSS variable manager
        const cssVarName = `--color-${colorKey}`;
        this.cssVariableManager.setColorVariable(cssVarName, colorDef.hex);

        // Also register with color mapping - using string type directly
        this.colorMapping.setColor(colorKey, colorDef);
      }
    });

    // Register optional semantic colors
    Object.entries(semanticColors).forEach(([colorKey, colorDef]) => {
      // Skip required colors as we already processed them
      if (
        REQUIRED_SEMANTIC_COLORS.includes(colorKey as RequiredSemanticColorKeys)
      ) {
        return;
      }

      if (colorDef && "hex" in colorDef) {
        // Register in CSS variable manager
        const cssVarName = `--color-${colorKey}`;
        this.cssVariableManager.setColorVariable(cssVarName, colorDef.hex);

        // Also register with color mapping - using string type directly
        this.colorMapping.setColor(colorKey, colorDef);
      }
    });
  }

  /**
   * Get a full Theme object from ThemeColors
   * Used to reconstruct a Theme when only colors are available
   */
  getFullThemeFromColors(
    themeName: ThemeName,
    themeColors: ThemeColors,
  ): Theme | undefined {
    this.log(`Attempting to get full theme from colors for: ${themeName}`);

    try {
      // Check if we already have this theme stored
      const existingTheme = this.themes.get(themeName);
      if (existingTheme) {
        return existingTheme;
      }

      // Create a minimal theme with just the colors
      const minimalTheme: Theme = {
        name: themeName,
        colors: themeColors,
        config: {
          name: themeName,
          mode: "light", // Default mode
          useSystem: false, // Add the required useSystem property
        },
        components: {}, // Empty components
        // Add other required properties from the Theme interface with default values
        spacing: {} as ThemeSpacing,
        typography: {} as ThemeTypography,
        borders: {} as ThemeBorders,
        shadows: {} as ThemeShadows,
        breakpoints: {} as ThemeBreakpoints,
        transitions: {} as ThemeTransitions,
        zIndex: {} as ThemeZIndex,
        variables: {} as ThemeVariables,
      };

      // Store for future reference
      this.themes.set(themeName, minimalTheme);

      return minimalTheme;
    } catch (error) {
      this.log(
        `Error getting full theme from colors for ${themeName}`,
        error,
        true,
      );
      return undefined;
    }
  }

  /**
   * Get a component variant
   */
  getComponentVariant(
    component: string,
    variant: string = "default",
  ): ComponentVariantType | undefined {
    this.log(`Getting component variant: ${component}/${variant}`);

    // Try to get the variant from the registry
    const existingVariant = this.componentRegistry.getVariant(
      component,
      variant,
    );

    // If found, return it
    if (existingVariant) {
      this.log(
        `Found existing variant for ${component}/${variant}`,
        existingVariant,
      );
      return existingVariant;
    }

    this.log(
      `No existing variant found for ${component}/${variant}, generating default`,
    );

    // If not found, generate a default variant based on component type
    const defaultVariant = this.generateDefaultVariant(component);

    // If we successfully generated a default, register it for future use
    if (defaultVariant) {
      this.log(
        `Generated default variant for ${component}/${variant}`,
        defaultVariant,
      );
      this.componentRegistry.setVariant(component, variant, defaultVariant);
    } else {
      this.log(
        `Failed to generate default variant for ${component}/${variant}`,
        undefined,
        true,
      );
    }

    return defaultVariant;
  }

  /**
   * Create a color definition from a hex color or CSS variable
   */
  private createColorDefinition(color: string): ColorDefinition {
    if (!color) {
      this.log(`Invalid color provided: ${color}`, undefined, true);
      // Provide a fallback color to prevent NaN issues
      color = "#808080"; // Neutral gray as fallback
    }

    try {
      // Check if the color is a CSS variable
      if (color.startsWith("var(")) {
        this.log(`Processing CSS variable: ${color}`);

        // Extract variable name for better approximation mapping
        const varName = color.match(/var\(([^)]+)\)/)?.[1]?.trim();

        // Approximate RGB and HSL values based on semantic variable names
        let approximateHex = "#808080"; // Default medium gray

        if (varName) {
          // Map common semantic color variables to approximate values
          if (varName.includes("neutral")) {
            const level = this.extractNumericLevel(varName);
            approximateHex = this.getNeutralApproximation(level);
          } else if (varName.includes("primary")) {
            const level = this.extractNumericLevel(varName);
            approximateHex = this.getPrimaryApproximation(level);
          } else if (varName.includes("secondary")) {
            const level = this.extractNumericLevel(varName);
            approximateHex = this.getSecondaryApproximation(level);
          } else if (varName.includes("success")) {
            const level = this.extractNumericLevel(varName);
            approximateHex = this.getSuccessApproximation(level);
          } else if (varName.includes("warning")) {
            const level = this.extractNumericLevel(varName);
            approximateHex = this.getWarningApproximation(level);
          } else if (varName.includes("danger") || varName.includes("error")) {
            const level = this.extractNumericLevel(varName);
            approximateHex = this.getDangerApproximation(level);
          } else if (varName.includes("info")) {
            const level = this.extractNumericLevel(varName);
            approximateHex = this.getInfoApproximation(level);
          }
        }

        // Get approximate RGB and HSL values using ColorUtils
        const approximateColorDef = ColorUtils.ensureColorDefinition({
          hex: approximateHex,
        });

        // Return a color definition that preserves the CSS variable in hex
        // but provides approximate RGB and HSL values for calculations
        return {
          hex: color, // Keep the original CSS variable
          rgb: approximateColorDef.rgb, // Use approximate RGB
          hsl: approximateColorDef.hsl, // Use approximate HSL
        };
      }

      // For actual hex colors, use the color utility directly
      const colorDef = ColorUtils.ensureColorDefinition({
        hex: color,
      });

      this.log(`Created color definition from ${color}`, colorDef);
      return colorDef;
    } catch (error) {
      this.log(`Error creating color definition from ${color}`, error, true);
      // Return a fallback color definition to prevent crashes
      return {
        hex: "#808080",
        rgb: "rgb(128, 128, 128)",
        hsl: "hsl(0, 0%, 50%)",
      };
    }
  }

  /**
   * Extract numeric level from a CSS variable name
   * e.g. --color-primary-500 returns 500
   */
  private extractNumericLevel(varName: string): number {
    const match = varName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 500; // Default to 500 if no number found
  }

  /**
   * Get approximate hex color for neutral shades
   */
  private getNeutralApproximation(level: number): string {
    // Map level to approximate grayscale value
    const mappings: Record<number, string> = {
      50: "#fafafa",
      100: "#f5f5f5",
      200: "#e5e5e5",
      300: "#d4d4d4",
      400: "#a3a3a3",
      500: "#737373",
      600: "#525252",
      700: "#404040",
      800: "#262626",
      900: "#171717",
      950: "#0a0a0a",
    };

    return (
      mappings[level] ||
      this.getApproximationByLevel(level, "#000000", "#ffffff")
    );
  }

  /**
   * Get approximate hex color for primary shades
   */
  private getPrimaryApproximation(level: number): string {
    // Map level to approximate blue shades
    const mappings: Record<number, string> = {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    };

    return (
      mappings[level] ||
      this.getApproximationByLevel(level, "#172554", "#eff6ff")
    );
  }

  /**
   * Get approximate hex color for secondary shades
   */
  private getSecondaryApproximation(level: number): string {
    // Map level to approximate purple shades
    const mappings: Record<number, string> = {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7",
      600: "#9333ea",
      700: "#7e22ce",
      800: "#6b21a8",
      900: "#581c87",
      950: "#3b0764",
    };

    return (
      mappings[level] ||
      this.getApproximationByLevel(level, "#3b0764", "#faf5ff")
    );
  }

  /**
   * Get approximate hex color for success shades
   */
  private getSuccessApproximation(level: number): string {
    // Map level to approximate green shades
    const mappings: Record<number, string> = {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
      950: "#052e16",
    };

    return (
      mappings[level] ||
      this.getApproximationByLevel(level, "#052e16", "#f0fdf4")
    );
  }

  /**
   * Get approximate hex color for warning shades
   */
  private getWarningApproximation(level: number): string {
    // Map level to approximate yellow/amber shades
    const mappings: Record<number, string> = {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
      950: "#451a03",
    };

    return (
      mappings[level] ||
      this.getApproximationByLevel(level, "#451a03", "#fffbeb")
    );
  }

  /**
   * Get approximate hex color for danger/error shades
   */
  private getDangerApproximation(level: number): string {
    // Map level to approximate red shades
    const mappings: Record<number, string> = {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
      950: "#450a0a",
    };

    return (
      mappings[level] ||
      this.getApproximationByLevel(level, "#450a0a", "#fef2f2")
    );
  }

  /**
   * Get approximate hex color for info shades
   */
  private getInfoApproximation(level: number): string {
    // Map level to approximate cyan/sky shades
    const mappings: Record<number, string> = {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
      950: "#082f49",
    };

    return (
      mappings[level] ||
      this.getApproximationByLevel(level, "#082f49", "#f0f9ff")
    );
  }

  /**
   * Get an approximation for any level by interpolating between dark and light extremes
   */
  private getApproximationByLevel(
    level: number,
    darkest: string,
    lightest: string,
  ): string {
    // Normalize level to a 0-1 range (where 950 is 0 and 50 is 1)
    const normalizedValue = Math.max(0, Math.min(1, (950 - level) / 900));

    // Parse hex colors to RGB components
    const darkRGB = this.hexToRgbComponents(darkest);
    const lightRGB = this.hexToRgbComponents(lightest);

    // Interpolate between dark and light
    const r = Math.round(
      darkRGB.r + normalizedValue * (lightRGB.r - darkRGB.r),
    );
    const g = Math.round(
      darkRGB.g + normalizedValue * (lightRGB.g - darkRGB.g),
    );
    const b = Math.round(
      darkRGB.b + normalizedValue * (lightRGB.b - darkRGB.b),
    );

    // Convert back to hex
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  /**
   * Convert a hex color to RGB components
   */
  private hexToRgbComponents(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;

    // Parse the hex values
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);

    return { r, g, b };
  }

  /**
   * Create a component state with the given colors
   * Always includes border to satisfy the ComponentState interface
   */
  private createComponentState(
    bgColor: string,
    fgColor: string,
    borderColor: string = "transparent",
  ): ComponentState {
    this.log(
      `Creating component state with bg=${bgColor}, fg=${fgColor}, border=${borderColor}`,
    );

    try {
      const state = {
        background: this.createColorDefinition(bgColor),
        foreground: this.createColorDefinition(fgColor),
        border: this.createColorDefinition(borderColor),
      };

      this.log("Created component state", state);
      return state;
    } catch (error) {
      this.log("Error creating component state", error, true);
      // Return a fallback state to prevent crashes
      return {
        background: this.createColorDefinition("var(--color-neutral-100)"),
        foreground: this.createColorDefinition("var(--color-neutral-900)"),
        border: this.createColorDefinition("var(--color-neutral-300)"),
      };
    }
  }

  /**
   * Create an interactive state object
   */
  private createInteractiveState(
    bgColor?: string,
    fgColor?: string,
    borderColor?: string,
  ): InteractiveState {
    // Check if all parameters are undefined
    const allUndefined =
      bgColor === undefined &&
      fgColor === undefined &&
      borderColor === undefined;

    if (allUndefined) {
      this.log("All parameters undefined, using default pattern directly");
      // Use createComponentStateFromPattern to get default values
      return {
        background: this.createColorDefinition(
          this.getDefaultValue("background"),
        ),
        foreground: this.createColorDefinition(
          this.getDefaultValue("foreground"),
        ),
        border: this.createColorDefinition(this.getDefaultValue("border")),
        hover: this.createComponentStateFromPattern("hover"),
        active: this.createComponentStateFromPattern("active"),
        disabled: this.createComponentStateFromPattern("disabled"),
        focus: this.createComponentStateFromPattern("focus"),
      };
    }

    this.log(
      `Creating interactive state with bg=${bgColor}, fg=${fgColor}, border=${borderColor}`,
    );

    try {
      // Safely access default pattern
      const defaultPattern = this.commonPatterns.default;

      if (!defaultPattern || typeof defaultPattern === "string") {
        this.log("Default pattern is missing or invalid", defaultPattern, true);
        // Use fallback values
        bgColor = bgColor || "var(--color-neutral-100)";
        fgColor = fgColor || "var(--color-neutral-900)";
        borderColor = borderColor || "var(--color-neutral-300)";
      } else {
        // Use pattern values if not provided
        bgColor = bgColor || defaultPattern.background;
        fgColor = fgColor || defaultPattern.foreground;
        borderColor = borderColor || defaultPattern.border;
      }

      const state = {
        background: this.createColorDefinition(bgColor),
        foreground: this.createColorDefinition(fgColor),
        border: this.createColorDefinition(borderColor),
        hover: this.createComponentStateFromPattern("hover"),
        active: this.createComponentStateFromPattern("active"),
        disabled: this.createComponentStateFromPattern("disabled"),
        focus: this.createComponentStateFromPattern("focus"),
      };

      this.log("Created interactive state", state);
      return state;
    } catch (error) {
      this.log("Error creating interactive state", error, true);
      // Return a fallback state to prevent crashes
      return {
        background: this.createColorDefinition("var(--color-neutral-100)"),
        foreground: this.createColorDefinition("var(--color-neutral-900)"),
        border: this.createColorDefinition("var(--color-neutral-300)"),
        hover: this.createComponentStateFromPattern("hover"),
        active: this.createComponentStateFromPattern("active"),
        disabled: this.createComponentStateFromPattern("disabled"),
        focus: this.createComponentStateFromPattern("focus"),
      };
    }
  }

  // Helper method to get default values
  private getDefaultValue(
    property: "background" | "foreground" | "border",
  ): string {
    const defaultPattern = this.commonPatterns.default;

    if (!defaultPattern || typeof defaultPattern === "string") {
      // Fallback values if default pattern is invalid
      const fallbacks = {
        background: "var(--color-neutral-100)",
        foreground: "var(--color-neutral-900)",
        border: "var(--color-neutral-300)",
      };
      return fallbacks[property];
    }

    return defaultPattern[property];
  }

  /**
   * Create a component state from a pattern name
   */
  private createComponentStateFromPattern(patternName: string): ComponentState {
    this.log(`Creating component state from pattern: ${patternName}`);

    try {
      const pattern = this.commonPatterns[patternName];

      // Safely handle missing patterns
      if (!pattern) {
        this.log(`Pattern not found: ${patternName}`, undefined, true);
        return this.createFallbackComponentState();
      }

      if (typeof pattern === "string") {
        this.log(
          `Pattern is a string, not an object: ${patternName}`,
          pattern,
          true,
        );
        return this.createFallbackComponentState();
      }

      // Validate pattern has required properties
      if (!pattern.background || !pattern.foreground || !pattern.border) {
        this.log(
          `Pattern missing required properties: ${patternName}`,
          pattern,
          true,
        );
        return this.createFallbackComponentState();
      }

      const state = this.createComponentState(
        pattern.background,
        pattern.foreground,
        pattern.border,
      );

      this.log(`Created component state from pattern ${patternName}`, state);
      return state;
    } catch (error) {
      this.log(
        `Error creating component state from pattern ${patternName}`,
        error,
        true,
      );
      return this.createFallbackComponentState();
    }
  }

  /**
   * Create a fallback component state to prevent crashes
   */
  private createFallbackComponentState(): ComponentState {
    return {
      background: this.createColorDefinition("var(--color-neutral-100)"),
      foreground: this.createColorDefinition("var(--color-neutral-900)"),
      border: this.createColorDefinition("var(--color-neutral-300)"),
    };
  }

  /**
   * Get the base structure for a component type
   */
  private getBaseStructure(componentType: string): ComponentStructure {
    this.log(`Getting base structure for component: ${componentType}`);

    // Normalize component name
    const normalizedType = componentType.toLowerCase();

    let result: ComponentStructure;

    try {
      switch (normalizedType) {
        case "button":
          result = {
            ...this.createInteractiveState(),
            style: { ...this.commonStyles.button },
          };
          break;

        case "input":
        case "textarea":
          result = {
            ...this.createInteractiveState(),
            placeholder: undefined,
            label: undefined,
            error: undefined,
            success: undefined,
            style: { ...this.commonStyles.input },
          };
          break;

        case "card":
          result = {
            default: undefined,
            interactive: {
              hover: undefined,
              active: undefined,
            },
            header: undefined,
            footer: undefined,
            style: { ...this.commonStyles.card },
          };
          break;

        case "navigation":
        case "nav":
          result = {
            container: undefined,
            item: {
              default: this.createInteractiveState(),
              active: undefined,
              expanded: undefined,
              style: { ...this.commonStyles.item },
            },
            subItem: {
              container: undefined,
              item: this.createInteractiveState(),
              style: { paddingLeft: "1.5rem" },
            },
            divider: undefined,
            icon: {
              default: undefined,
              active: undefined,
              style: { marginRight: "0.5rem" },
            },
            indicator: {
              default: undefined,
              active: undefined,
              style: { marginLeft: "auto" },
            },
            style: { display: "flex", gap: "0.5rem" },
          };
          break;

        case "sidebar":
          result = {
            container: undefined,
            group: {
              container: undefined,
              title: undefined,
              style: { padding: "0.5rem", marginBottom: "0.5rem" },
            },
            item: {
              default: this.createInteractiveState(),
              active: undefined,
              style: { ...this.commonStyles.item },
            },
            divider: undefined,
            icon: {
              default: undefined,
              active: undefined,
              style: { marginRight: "0.5rem" },
            },
            style: { ...this.commonStyles.sidebar },
          };
          break;

        case "badge":
        case "tag":
          result = {
            default: undefined,
            primary: undefined,
            secondary: undefined,
            success: undefined,
            warning: undefined,
            danger: undefined,
            info: undefined,
            style: { ...this.commonStyles.badge },
          };
          break;

        default:
          // For unknown components, return a basic interactive state
          result = {
            ...this.createInteractiveState(),
            style: { ...this.commonStyles.container },
          };
          break;
      }

      this.log(`Created base structure for ${componentType}`, result);
      return result;
    } catch (error) {
      this.log(
        `Error creating base structure for ${componentType}`,
        error,
        true,
      );
      // Return a minimal fallback structure
      return {
        ...this.createInteractiveState(),
        style: {},
      };
    }
  }

  /**
   * Generate a default variant based on component type
   */
  private generateDefaultVariant(component: string): ComponentVariantType {
    this.log(`Generating default variant for component: ${component}`);

    try {
      // Get base structure for the component type
      const baseStructure = this.getBaseStructure(component);

      // Check if base structure is valid
      if (!baseStructure) {
        this.log(
          `Failed to get base structure for ${component}`,
          undefined,
          true,
        );
        throw new Error(`Failed to get base structure for ${component}`);
      }

      // Recursively populate with defaults
      const result = this.populateDefaultsRecursively(
        baseStructure,
      ) as ComponentVariantType;

      this.log(`Generated default variant for ${component}`, result);
      return result;
    } catch (error) {
      this.log(
        `Error generating default variant for ${component}`,
        error,
        true,
      );
      // Return a minimal fallback variant
      return {
        background: this.createColorDefinition("var(--color-neutral-100)"),
        foreground: this.createColorDefinition("var(--color-neutral-900)"),
        border: this.createColorDefinition("var(--color-neutral-300)"),
        style: {},
      } as unknown as ComponentVariantType;
    }
  }

  /**
   * Recursively populate an object with defaults based on property names
   */
  private populateDefaultsRecursively(obj: unknown): unknown {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    // If it"s a color definition, return as is
    if (
      obj &&
      typeof obj === "object" &&
      "hex" in obj &&
      typeof obj.hex === "string"
    ) {
      return obj;
    }

    try {
      // Clone to avoid modifying the original
      const result = Array.isArray(obj)
        ? [...(obj as unknown[])]
        : { ...(obj as Record<string, unknown>) };

      // Process each property
      if (Array.isArray(result)) {
        // Handle array case
        for (let i = 0; i < result.length; i++) {
          if (result[i] === undefined) {
            // Apply default based on index (less common)
            result[i] = this.getDefaultForPropertyName(i.toString());
          } else if (typeof result[i] === "object" && result[i] !== null) {
            // Recursively process nested objects
            result[i] = this.populateDefaultsRecursively(result[i]);
          }
        }
      } else {
        // Handle object case
        for (const key in result) {
          const value = result[key];

          if (value === undefined) {
            // Apply default based on property name
            result[key] = this.getDefaultForPropertyName(key);
            this.log(
              `Applied default for undefined property: ${key}`,
              result[key],
            );
          } else if (typeof value === "object" && value !== null) {
            // Recursively process nested objects
            result[key] = this.populateDefaultsRecursively(value);
          }
        }
      }

      return result;
    } catch (error) {
      this.log("Error in populateDefaultsRecursively", { error, obj }, true);
      // Return the original object to prevent further errors
      return obj;
    }
  }

  /**
   * Get default value for a property based on its name
   */
  private getDefaultForPropertyName(propertyName: string): unknown {
    this.log(`Getting default value for property: ${propertyName}`);

    try {
      // Check if it"s a common pattern
      if (propertyName in this.commonPatterns) {
        const pattern = this.commonPatterns[propertyName];

        // If it"s a string, create a color definition
        if (typeof pattern === "string") {
          return this.createColorDefinition(pattern);
        }

        // If it"s an object with background/foreground, create a component state
        if (typeof pattern === "object" && "background" in pattern) {
          return this.createComponentState(
            pattern.background,
            pattern.foreground,
            pattern.border,
          );
        }

        // Otherwise, recursively populate the pattern
        return this.populateDefaultsRecursively(pattern);
      }

      // Handle special cases based on property name
      switch (propertyName) {
        case "style":
          return {};

        case "message":
          return this.createColorDefinition("var(--color-neutral-700)");

        case "icon":
          return {
            default: this.createColorDefinition("var(--color-neutral-500)"),
            active: this.createColorDefinition("var(--color-primary-500)"),
            style: { marginRight: "0.5rem" },
          };

        case "interactive":
          return {
            hover: this.createComponentStateFromPattern("hover"),
            active: this.createComponentStateFromPattern("active"),
          };

        default: {
          // Safely access default pattern - now wrapped in a block
          const defaultPattern = this.commonPatterns.default;

          if (!defaultPattern || typeof defaultPattern === "string") {
            this.log(
              `Default pattern is missing or invalid for property ${propertyName}`,
              defaultPattern,
              true,
            );
            // Use fallback values
            return this.createFallbackComponentState();
          }

          // For unknown properties, create a default component state
          return this.createComponentState(
            defaultPattern.background,
            defaultPattern.foreground,
            defaultPattern.border,
          );
        }
      }
    } catch (error) {
      this.log(
        `Error getting default for property ${propertyName}`,
        error,
        true,
      );
      return this.createFallbackComponentState();
    }
  }

  // Generate all theme variables
  generateThemeVariables(
    mode: ThemeMode = "light",
    themeName: ThemeName = DEFAULT_THEME_NAME,
  ): Record<string, string | ColorDefinition> {
    this.log(`Generating theme variables for mode=${mode}, theme=${themeName}`);

    try {
      const registry = this.componentRegistry.getRegistry();

      if (!registry) {
        this.log("Component registry is undefined", undefined, true);
        return {};
      }

      const componentVars =
        this.componentManager.generateAllVariables(registry);
      const colorVars = this.colorMapping.toCSS();
      const typographyVars =
        this.typographyManager.generateTypographyVariables(mode);

      const result = {
        // Component variables
        ...componentVars,

        // Color variables
        ...colorVars,

        // Typography variables
        ...typographyVars,
      };

      this.log(`Generated ${Object.keys(result).length} theme variables`);
      return result;
    } catch (error) {
      this.log("Error generating theme variables", error, true);
      return {};
    }
  }

  // Generate all theme classes
  generateThemeClasses(
    mode: ThemeMode = "light",
    scheme: ThemeName = DEFAULT_THEME_NAME,
  ): Record<string, string> {
    this.log(`Generating theme classes for mode=${mode}, scheme=${scheme}`);

    try {
      const registry = this.componentRegistry.getRegistry();

      if (!registry) {
        this.log("Component registry is undefined", undefined, true);
        return {};
      }

      const componentClasses = this.componentManager.generateAllClasses(
        scheme,
        registry,
      );
      const typographyClasses =
        this.typographyManager.generateTypographyClasses(mode);

      const result = {
        // Component classes
        ...componentClasses,

        // Typography classes
        ...typographyClasses,
      };

      this.log(`Generated ${Object.keys(result).length} theme variables`);
      return result;
    } catch (error) {
      this.log("Error generating theme classes", error, true);
      return {};
    }
  }

  // Get component style with typography
  getComponentStyle(
    component: string,
    variant: string = "default",
    state: string = "default",
    mode: ThemeMode = "light",
  ): React.CSSProperties {
    this.log(
      `Getting component style for ${component}/${variant}/${state} (mode=${mode})`,
    );

    try {
      // Try to get the component variant with fallback
      let componentVariant = this.componentRegistry.getVariantWithFallback(
        component,
        variant,
      );

      // If no variant found, generate a default one
      if (!componentVariant) {
        this.log(
          `No variant found for ${component}/${variant}, generating default`,
        );
        componentVariant = this.generateDefaultVariant(component);

        // Register this default variant for future use
        if (componentVariant) {
          this.componentRegistry.setVariant(
            component,
            variant,
            componentVariant,
          );
        }
      }

      if (!componentVariant) {
        this.log(
          `Failed to get or generate variant for ${component}/${variant}`,
          undefined,
          true,
        );
        return {}; // Return empty style to prevent crashes
      }

      // Get component colors
      const colorStyle = this.componentManager.getComponentStyleFromVariant(
        componentVariant,
        state,
      );

      // Get component typography
      const typography = this.typographyManager.getComponentTypography(
        component,
        variant,
        mode,
      );

      // If no typography found, return just the color style
      if (!typography) {
        this.log(
          `No typography found for ${component}/${variant}, returning only color style`,
          colorStyle,
        );
        return colorStyle;
      }

      // Combine color and typography styles
      const result = {
        ...colorStyle,
        fontSize: typography.fontSize,
        lineHeight: typography.lineHeight,
        letterSpacing: typography.letterSpacing,
        fontWeight: typography.fontWeight,
        ...(typography.fontFamily ? { fontFamily: typography.fontFamily } : {}),
        ...(typography.textTransform
          ? { textTransform: typography.textTransform }
          : {}),
      };

      this.log(
        `Generated component style for ${component}/${variant}/${state}`,
        result,
      );

      // Check for NaN values in the final style
      this.checkForNaN(result, `${component}/${variant}/${state} style`);

      return result;
    } catch (error) {
      this.log(
        `Error getting component style for ${component}/${variant}/${state}`,
        error,
        true,
      );
      return {}; // Return empty style to prevent crashes
    }
  }
}
