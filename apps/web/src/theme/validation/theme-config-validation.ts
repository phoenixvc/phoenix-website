import { ThemeInitOptions, ValidationResult } from "@/theme";
import {
  StorageValidation,
  ThemeValidationError,
  TransitionValidation,
} from ".";
import { createValidationResult } from "./utils/create-validation-result"; // Utility function for consistent result handling
import { AVAILABLE_THEME_NAMES } from "../constants/themes/catalog";

export class ThemeConfigValidation {
  static VALID_COLOR_SCHEMES = AVAILABLE_THEME_NAMES;
  static VALID_MODES = ["light", "dark"] as const;

  static validateThemeConfig(config: ThemeInitOptions): ValidationResult {
    const {
      defaultThemeName: defaultScheme,
      defaultMode,
      storage,
      transition,
    } = config;
    const errors: ThemeValidationError[] = [];

    // Validate defaultScheme
    if (
      defaultScheme &&
      !(this.VALID_COLOR_SCHEMES as readonly string[]).includes(defaultScheme)
    ) {
      errors.push(
        new ThemeValidationError(
          `Invalid default color scheme: ${defaultScheme}`,
          "INVALID_DEFAULT_SCHEME", // error code
          "defaultScheme", // path in the config object
        ),
      );
    }

    // Validate defaultMode
    if (defaultMode && !this.VALID_MODES.includes(defaultMode)) {
      errors.push(
        new ThemeValidationError(
          `Invalid default mode: ${defaultMode}`,
          "INVALID_DEFAULT_MODE", // error code
          "defaultMode", // path in the config object
        ),
      );
    }

    // Validate storage
    if (storage) {
      const storageResult = StorageValidation.validateStorage(storage);
      if (!storageResult.isValid && storageResult.errors) {
        errors.push(
          ...storageResult.errors.map(
            (error) =>
              new ThemeValidationError(
                error.message,
                error.code,
                error.path,
                error.details,
              ),
          ),
        );
      }
    }

    // Validate transition
    if (transition) {
      const transitionResult =
        TransitionValidation.validateTransitionConfig(transition);
      if (!transitionResult.isValid && transitionResult.errors) {
        errors.push(
          ...transitionResult.errors.map(
            (error) =>
              new ThemeValidationError(
                error.message,
                error.code,
                error.path,
                error.details,
              ),
          ),
        );
      }
    }

    // Use utility function to return the ValidationResult
    return createValidationResult("themeConfig", config, errors);
  }
}
