import {
  ThemeSchemeInitial,
  SemanticColors,
  ValidationResult,
  ValidationError,
  ColorDefinition,
} from "@/theme/types";
import { validateHexOnly } from "./utils/color-hex-validation";
import { REQUIRED_BASE_COLORS, REQUIRED_MODE_COLORS } from "./constants";
import { SemanticColorValidation } from "./semantic-color-validation";

/**
 * Validation class for ThemeSchemeInitial objects
 */
export class ThemeInitialValidation {
  /**
   * Validates a ThemeSchemeInitial object
   * @param theme The theme to validate
   * @returns ValidationResult indicating if the theme is valid
   */
  static validateThemeInitial(
    theme: ThemeSchemeInitial & { semantic?: SemanticColors },
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate base colors
    if (!theme.base) {
      errors.push({
        code: "MISSING_BASE_COLORS",
        message: "Theme must include base colors",
        path: "base",
      });
    } else {
      REQUIRED_BASE_COLORS.forEach((color) => {
        if (!theme.base[color]) {
          errors.push({
            code: "MISSING_BASE_COLORS",
            message: `Missing base color ${color}`,
            path: `base.${color}`,
          });
        } else {
          const result = validateHexOnly(
            theme.base[color] as ColorDefinition,
            `base.${color}`,
          );
          if (!result.isValid) {
            errors.push(...result.errors!);
          }
        }
      });
    }

    // Validate mode colors
    ["light", "dark"].forEach((mode) => {
      const modeColors = theme[mode as "light" | "dark"];
      if (!modeColors) {
        errors.push({
          code: "MISSING_MODE_COLORS",
          message: `Missing ${mode} mode colors`,
          path: mode,
        });
      } else {
        REQUIRED_MODE_COLORS.forEach((color) => {
          if (!modeColors[color]) {
            errors.push({
              code: "MISSING_MODE_COLORS",
              message: `Missing ${mode} mode color ${color}`,
              path: `${mode}.${color}`,
            });
          } else {
            const result = validateHexOnly(
              modeColors[color] as ColorDefinition,
              `${mode}.${color}`,
            );
            if (!result.isValid) {
              errors.push(...result.errors!);
            }
          }
        });
      }
    });

    // Validate semantic colors if present
    if (theme.semantic) {
      const semanticResult = SemanticColorValidation.validateSemanticColors(
        theme.semantic,
      );
      if (!semanticResult.isValid) {
        errors.push(...semanticResult.errors!);
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        path: "theme",
        value: theme,
        errors,
      };
    }

    return {
      isValid: true,
      path: "theme",
      value: theme,
    };
  }

  /**
   * Type guard to check if an object is a valid ThemeSchemeInitial
   * @param obj Object to check
   * @returns Boolean indicating if the object is a valid ThemeSchemeInitial
   */
  static isThemeSchemeInitialType(obj: unknown): obj is ThemeSchemeInitial {
    if (!obj || typeof obj !== "object") return false;

    const theme = obj as Partial<ThemeSchemeInitial>;

    // Check for required properties
    if (!theme.base || !theme.light || !theme.dark) {
      return false;
    }

    // Check if base has all required colors
    for (const color of REQUIRED_BASE_COLORS) {
      if (!theme.base[color]) return false;
    }

    // Check if light mode has all required colors
    for (const color of REQUIRED_MODE_COLORS) {
      if (!theme.light[color]) return false;
    }

    // Check if dark mode has all required colors
    for (const color of REQUIRED_MODE_COLORS) {
      if (!theme.dark[color]) return false;
    }

    return true;
  }
}
