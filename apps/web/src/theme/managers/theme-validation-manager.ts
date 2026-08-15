// theme/core/theme-validation-manager.ts

import {
  ThemeColors,
  ThemeInitOptions,
  ThemeName,
  ThemeMode,
  ThemeSchemeInitial,
  ColorDefinition,
  ColorShades,
  SemanticColors,
  ValidationError,
  ValidationResult,
  ThemeError,
  TransformedColorObject,
} from "../types";

import { BaseColorValidation } from "../validation/base-color-validation";
import { ModeColorValidation } from "../validation/mode-color-validation";
import { SemanticColorValidation } from "../validation/semantic-color-validation";
import { ThemeConfigValidation } from "../validation/theme-config-validation";
import { ThemeValidationError } from "../validation/theme-validation-error";
import { VALID_COLOR_SCHEMES, VALID_MODES } from "../validation/constants";
import { ThemeProcessedValidation } from "../validation/theme-processed-validation";
import { ThemeInitialValidation } from "../validation/theme-initial-validation";
import { ColorShadesValidation } from "../validation/color-shades-validation";

/**
 * Utility functions for validation operations
 */
export const ValidationUtils = {
  /**
   * Creates a validation result indicating failure
   * @param path The path to the validated object
   * @param value The value being validated
   * @param error The validation error
   * @returns A validation result with isValid=false and the error
   */
  createInvalidResult(
    path: string,
    value: unknown,
    error: ValidationError,
  ): ValidationResult {
    return {
      isValid: false,
      path,
      value,
      errors: [error],
    };
  },

  /**
   * Creates a validation result indicating success
   * @param path The path to the validated object
   * @param value The value being validated
   * @returns A validation result with isValid=true
   */
  createValidResult(path: string, value: unknown): ValidationResult {
    return {
      isValid: true,
      path,
      value,
    };
  },
};

/**
 * ThemeValidationManager
 *
 * Centralized manager for theme validation that coordinates all validation operations
 * across different aspects of the theme system.
 */
export class ThemeValidationManager {
  private static instance: ThemeValidationManager;

  /**
   * Get the singleton instance of ThemeValidationManager
   */
  static getInstance(): ThemeValidationManager {
    if (!ThemeValidationManager.instance) {
      ThemeValidationManager.instance = new ThemeValidationManager();
    }
    return ThemeValidationManager.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Validate a theme configuration
   * @param config The theme configuration to validate
   * @throws ThemeValidationError if validation fails
   */
  validateThemeConfig(
    config: ThemeInitOptions & {
      disableTransitions?: boolean;
      disableStorage?: boolean;
      storageKey?: string;
    },
  ): void {
    try {
      const result = ThemeConfigValidation.validateThemeConfig(config);
      if (!result.isValid && result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
    } catch (error) {
      throw new ThemeValidationError(
        "Config validation failed",
        ThemeError.INVALID_THEME_CONFIG, // Use the appropriate enum value
        "config",
        {
          originalError: error,
          message: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Validate a processed theme
   * @param theme The processed theme to validate
   * @throws ThemeValidationError if validation fails
   */
  validateProcessedTheme(theme: ThemeColors): void {
    try {
      // Validate the schemes
      const schemesResult = ThemeProcessedValidation.validateProcessedTheme(
        theme.schemes,
      );
      if (
        !schemesResult.isValid &&
        schemesResult.errors &&
        schemesResult.errors.length > 0
      ) {
        throw new Error(schemesResult.errors[0].message);
      }

      // Validate semantic colors if present
      if (theme.semantic) {
        const semanticResult = SemanticColorValidation.validateSemanticColors(
          theme.semantic,
        );
        if (
          !semanticResult.isValid &&
          semanticResult.errors &&
          semanticResult.errors.length > 0
        ) {
          throw new Error(semanticResult.errors[0].message);
        }
      }
    } catch (error) {
      throw new ThemeValidationError(
        "Processed theme validation failed",
        ThemeError.INVALID_TYPE,
        "theme",
        { originalError: error },
      );
    }
  }

  /**
   * Validate an initial theme scheme
   * @param theme The initial theme scheme to validate
   * @throws ThemeValidationError if validation fails
   */
  validateInitialTheme(theme: ThemeSchemeInitial): void {
    try {
      const result = ThemeInitialValidation.validateThemeInitial(theme);
      if (!result.isValid && result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
    } catch (error) {
      throw new ThemeValidationError(
        "Initial theme validation failed",
        ThemeError.INVALID_SCHEME,
        "theme",
        { originalError: error },
      );
    }
  }

  /**
   * Validate base colors
   * @param baseColors The base colors to validate
   * @throws ThemeValidationError if validation fails
   */
  validateBaseColors(baseColors: Record<string, ColorDefinition>): void {
    try {
      const result = BaseColorValidation.validateBaseColors(baseColors);
      if (!result.isValid && result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
    } catch (error) {
      throw new ThemeValidationError(
        "Base colors validation failed",
        ThemeError.COLOR_INVALID_TYPE,
        "baseColors",
        { originalError: error },
      );
    }
  }

  /**
   * Validate color shades
   * @param shades The color shades to validate
   * @throws ThemeValidationError if validation fails
   */
  validateColorShades(shades: ColorShades, path: string = "colorShades"): void {
    try {
      const result = ColorShadesValidation.validateColorShades(shades, path);
      if (!result.isValid && result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
    } catch (error) {
      throw new ThemeValidationError(
        "Color shades validation failed",
        ThemeError.MISSING_OR_INVALID_SHADE,
        path,
        { originalError: error },
      );
    }
  }

  /**
   * Validate mode colors
   * @param colors The mode colors to validate
   * @param mode The theme mode (light or dark) - optional parameter
   * @throws ThemeValidationError if validation fails
   */
  validateModeColors(
    colors: Record<string, ColorDefinition>,
    mode: "light" | "dark",
  ): void {
    try {
      // Pass colors as the first parameter, mode as the second
      const result = ModeColorValidation.validateModeColors(colors, mode);
      if (!result.isValid && result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
    } catch (error) {
      throw new ThemeValidationError(
        `${mode || "theme"} mode colors validation failed`,
        ThemeError.INVALID_MODE,
        mode || "unknown",
        { originalError: error },
      );
    }
  }

  /**
   * Validate semantic colors
   * @param semanticColors The semantic colors to validate
   * @throws ThemeValidationError if validation fails
   */
  validateSemanticColors(semanticColors: SemanticColors): void {
    try {
      const result =
        SemanticColorValidation.validateSemanticColors(semanticColors);
      if (!result.isValid && result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
    } catch (error) {
      throw new ThemeValidationError(
        "Semantic colors validation failed",
        ThemeError.MISSING_SEMANTIC_COLORS,
        "semantic",
        { originalError: error },
      );
    }
  }

  /**
   * Check if a theme is fully transformed with all required components
   * @param theme The theme to check
   * @returns Boolean indicating if the theme is fully transformed
   */
  isFullyTransformed(theme: ThemeColors): boolean {
    try {
      // Check if at least one scheme exists
      const schemeNames = Object.keys(theme.schemes);
      if (schemeNames.length === 0) return false;

      // Get the first scheme
      const scheme = theme.schemes[schemeNames[0]];
      if (!scheme?.base) return false;

      // Check if primary and secondary have shade levels
      const baseColors = scheme.base;

      // Check primary
      if (
        !baseColors.primary ||
        typeof baseColors.primary !== "object" ||
        !this.hasRequiredShades(baseColors.primary as TransformedColorObject)
      ) {
        return false;
      }

      // Check secondary
      if (
        !baseColors.secondary ||
        typeof baseColors.secondary !== "object" ||
        !this.hasRequiredShades(baseColors.secondary as TransformedColorObject)
      ) {
        return false;
      }

      // Check accent if it exists
      if (
        baseColors.accent &&
        (typeof baseColors.accent !== "object" ||
          !this.hasRequiredShades(baseColors.accent as TransformedColorObject))
      ) {
        return false;
      }

      // Check for both light and dark mode colors
      if (!scheme.light || !scheme.dark) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[ThemeValidationManager] Error checking if theme is fully transformed:",
        error,
      );
      return false;
    }
  }

  /**
   * Check if a color object has all required shade levels
   * @param colorObj The color object to check
   * @returns Boolean indicating if the color object has all required shades
   */
  private hasRequiredShades(colorObj: TransformedColorObject): boolean {
    // Check for key shade levels
    return (
      colorObj.base !== undefined &&
      colorObj.shades !== undefined &&
      Array.isArray(colorObj.shades) &&
      colorObj.contrast !== undefined &&
      Array.isArray(colorObj.contrast)
    );
  }

  /**
   * Type guard to check if an object is a ThemeColors
   * @param theme The object to check
   * @returns Boolean indicating if the object is a ThemeColors
   */
  isThemeColorsType(theme: unknown): theme is ThemeColors {
    return (
      !!theme &&
      typeof theme === "object" &&
      "schemes" in (theme as Record<string, unknown>) &&
      typeof (theme as ThemeColors).schemes === "object"
    );
  }

  /**
   * Type guard to check if an object is a ThemeSchemeInitial
   * @param theme The object to check
   * @returns Boolean indicating if the object is a ThemeSchemeInitial
   */
  isThemeSchemeInitialType(theme: unknown): theme is ThemeSchemeInitial {
    return (
      !!theme &&
      typeof theme === "object" &&
      "base" in (theme as Record<string, unknown>) &&
      typeof (theme as ThemeSchemeInitial).base === "object"
    );
  }

  /**
   * Utility to check if a color scheme is valid
   * @param themeName The theme name to check
   * @returns Boolean indicating if the theme name is valid
   */
  isValidThemeName(themeName: unknown): themeName is ThemeName {
    return (
      typeof themeName === "string" &&
      (VALID_COLOR_SCHEMES as readonly string[]).includes(themeName)
    );
  }

  /**
   * Utility to check if a theme mode is valid
   * @param mode The theme mode to check
   * @returns Boolean indicating if the theme mode is valid
   */
  isValidThemeMode(mode: unknown): mode is ThemeMode {
    return (
      typeof mode === "string" &&
      (VALID_MODES as readonly string[]).includes(mode)
    );
  }

  /**
   * Create an invalid validation result using ValidationUtils
   * @param path The path to the validated object
   * @param value The value being validated
   * @param error The validation error
   * @returns A validation result with isValid=false and the error
   */
  createInvalidResult(
    path: string,
    value: unknown,
    error: ValidationError,
  ): ValidationResult {
    return ValidationUtils.createInvalidResult(path, value, error);
  }

  /**
   * Create a valid validation result using ValidationUtils
   * @param path The path to the validated object
   * @param value The value being validated
   * @returns A validation result with isValid=true
   */
  createValidResult(path: string, value: unknown): ValidationResult {
    return ValidationUtils.createValidResult(path, value);
  }
}

// Export singleton instance
export const themeValidationManager = ThemeValidationManager.getInstance();
