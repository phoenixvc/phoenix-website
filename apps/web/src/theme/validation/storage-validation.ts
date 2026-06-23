import { ThemeStorage, ValidationResult } from "@/theme/types";
import { ThemeValidationError } from "./theme-validation-error";
import { createValidationResult } from "./utils/create-validation-result"; // Utility for consistent result handling

export class StorageValidation {
  static VALID_STORAGE_TYPES = [
    "localStorage",
    "sessionStorage",
    "memory",
  ] as const;

  static validateStorage(storage: Partial<ThemeStorage>): ValidationResult {
    const errors: ThemeValidationError[] = [];

    // Validate storage type
    if (
      storage.type &&
      !(this.VALID_STORAGE_TYPES as readonly string[]).includes(storage.type)
    ) {
      errors.push(
        new ThemeValidationError(
          `Invalid storage type: ${storage.type}`,
          "INVALID_STORAGE_TYPE", // Example error code
          "storage.type",
          { validTypes: this.VALID_STORAGE_TYPES },
        ),
      );
    }

    // Validate prefix
    if (storage.prefix !== undefined && typeof storage.prefix !== "string") {
      errors.push(
        new ThemeValidationError(
          "Storage prefix must be a string",
          "INVALID_STORAGE_PREFIX", // Example error code
          "storage.prefix",
        ),
      );
    }

    // Validate version
    if (storage.version !== undefined && typeof storage.version !== "string") {
      errors.push(
        new ThemeValidationError(
          "Storage version must be a string",
          "INVALID_STORAGE_VERSION", // Example error code
          "storage.version",
        ),
      );
    }

    // Validate expiration
    if (
      storage.expiration !== undefined &&
      typeof storage.expiration !== "number"
    ) {
      errors.push(
        new ThemeValidationError(
          "Storage expiration must be a number",
          "INVALID_STORAGE_EXPIRATION", // Example error code
          "storage.expiration",
        ),
      );
    }

    // Validate keys
    if (storage.keys !== undefined && typeof storage.keys !== "object") {
      errors.push(
        new ThemeValidationError(
          "Storage keys must be an object",
          "INVALID_STORAGE_KEYS", // Example error code
          "storage.keys",
        ),
      );
    }

    // Validate defaults
    if (
      storage.defaults !== undefined &&
      typeof storage.defaults !== "object"
    ) {
      errors.push(
        new ThemeValidationError(
          "Storage defaults must be an object",
          "INVALID_STORAGE_DEFAULTS", // Example error code
          "storage.defaults",
        ),
      );
    }

    // Return validation result using utility function
    return createValidationResult("storage", storage, errors);
  }
}
