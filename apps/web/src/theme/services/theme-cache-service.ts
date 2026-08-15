// theme/core/theme-cache-service.ts

import {
  SemanticColors,
  ThemeColors,
  ThemeName,
  ThemeMode,
  ThemeSchemeInitial,
  ThemeCacheConfig,
  ThemeCacheEntry,
  ThemeCacheSource,
  IThemeCacheService,
} from "../types";
import { themeValidationManager } from "../providers";
import { ThemeTransformationManager } from "../managers/theme-transformation-manager";
import { DEFAULT_MODE } from "../constants/tokens";
import { logger } from "../../utils/logger";

/**
 * ThemeCacheService handles caching of transformed theme data.
 * It ensures that only fully transformed themes are stored in the cache.
 */
export class ThemeCacheService implements IThemeCacheService {
  private static instance: ThemeCacheService;
  private cache: Map<ThemeName, ThemeCacheEntry>;
  private config: ThemeCacheConfig;
  private readonly SERVICE_NAME = "ThemeCacheService";
  private readonly log = logger.createChild(this.SERVICE_NAME);
  private themeTransformationManager: ThemeTransformationManager;

  /**
   * Get the singleton instance of ThemeCacheService
   */
  static getInstance(config?: Partial<ThemeCacheConfig>): ThemeCacheService {
    if (!ThemeCacheService.instance) {
      ThemeCacheService.instance = new ThemeCacheService(config);
    } else if (config) {
      ThemeCacheService.instance.updateConfig(config);
    }
    return ThemeCacheService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config?: Partial<ThemeCacheConfig>) {
    this.cache = new Map<ThemeName, ThemeCacheEntry>();
    this.config = {
      cacheDuration: config?.cacheDuration || 1000 * 60 * 5, // 5 minutes by default
      defaultMode: config?.defaultMode || DEFAULT_MODE,
      maxCacheSize: config?.maxCacheSize || 10,
      enableLogging:
        config?.enableLogging !== undefined ? config.enableLogging : true,
    };

    // Initialize the transformation manager
    this.themeTransformationManager = new ThemeTransformationManager();
  }

  /**
   * Helper method to safely get the logging state
   */
  private isLoggingEnabled(): boolean {
    return this.config.enableLogging === true;
  }

  /**
   * Update the cache configuration
   */
  updateConfig(config: Partial<ThemeCacheConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.isLoggingEnabled()) {
      this.log.info("Cache configuration updated");
    }
  }

  /**
   * Get a theme from the cache if it exists and is not expired
   */
  get(name: ThemeName): ThemeColors | null {
    const loggingEnabled = this.isLoggingEnabled();
    if (loggingEnabled) {
      this.log.group(`Getting theme: ${name}`);
    }

    try {
      const entry = this.cache.get(name);

      if (!entry) {
        if (this.isLoggingEnabled()) {
          this.log.info(`Theme "${name}" not found in cache`);
        }
        return null;
      }

      // Check if the entry has expired
      if (Date.now() - entry.timestamp > this.config.cacheDuration) {
        if (this.isLoggingEnabled()) {
          this.log.info(`Theme "${name}" has expired`);
        }
        this.cache.delete(name);
        return null;
      }

      // Verify the theme is fully transformed
      if (!themeValidationManager.isFullyTransformed(entry.theme)) {
        if (this.isLoggingEnabled()) {
          this.log.warn(
            `Theme "${name}" is not fully transformed. Removing from cache.`,
          );
        }
        this.cache.delete(name);
        return null;
      }

      if (this.isLoggingEnabled()) {
        this.log.info(`Returning cached theme for "${name}"`);
      }
      return entry.theme;
    } finally {
      if (loggingEnabled) {
        this.log.groupEnd();
      }
    }
  }

  /**
   * Helper method to transform themes with proper mode handling
   */
  private transformThemeWithMode(
    input: ThemeColors | ThemeSchemeInitial,
    semantic?: SemanticColors,
  ): ThemeColors {
    const mode = this.config.defaultMode;

    if (this.isThemeSchemeInitial(input)) {
      // For ThemeSchemeInitial, use the transformation manager
      return this.themeTransformationManager.transformTheme(
        input,
        mode,
        semantic,
      );
    } else {
      // For ThemeColors that need transformation
      if (!themeValidationManager.isFullyTransformed(input)) {
        // Try to extract the mode from the input if available
        // Create a type guard to check if the input has a mode property
        const hasMode = (
          obj: ThemeColors,
        ): obj is ThemeColors & { mode: ThemeMode } =>
          "mode" in obj && typeof obj.mode === "string";

        // Use the type guard to safely access the mode property
        const inputMode = hasMode(input) ? input.mode : mode;

        // Use the transformation manager to handle complex transformations
        return this.themeTransformationManager.transformThemeColors(
          input,
          inputMode,
          semantic,
        );
      } else {
        // Already transformed, just update semantic if needed
        if (semantic && semantic !== input.semantic) {
          return {
            ...input,
            semantic: semantic,
          };
        }
        return input;
      }
    }
  }

  /**
   * Set a theme in the cache, ensuring it is fully transformed first
   */
  set(
    name: ThemeName,
    themeData: ThemeColors | ThemeSchemeInitial,
    semantic?: SemanticColors,
    source: ThemeCacheSource = "registered",
  ): ThemeColors {
    const loggingEnabled = this.isLoggingEnabled();
    if (loggingEnabled) {
      this.log.group(`Setting theme: ${name}`);
    }

    try {
      // Transform the theme using our helper method
      let transformedTheme: ThemeColors;
      try {
        transformedTheme = this.transformThemeWithMode(themeData, semantic);
      } catch (error) {
        if (this.isLoggingEnabled()) {
          this.log.warn(`Theme transformation failed for "${name}":`);
        }
        this.log.error(error);
        throw error;
      }

      // Validate the transformed theme
      try {
        if (this.isLoggingEnabled()) {
          this.log.info(`Validating transformed theme for "${name}"`);
        }
        themeValidationManager.validateProcessedTheme(transformedTheme);
      } catch (error) {
        if (this.isLoggingEnabled()) {
          this.log.warn(`Theme validation failed for "${name}":`);
        }
        this.log.error(error);
        throw error;
      }

      // Enforce cache size limit
      if (
        this.cache.size >= (this.config.maxCacheSize || 10) &&
        !this.cache.has(name)
      ) {
        // Remove the oldest entry
        const oldestEntry = Array.from(this.cache.entries()).sort(
          ([, a], [, b]) => a.timestamp - b.timestamp,
        )[0];

        if (oldestEntry) {
          if (this.isLoggingEnabled()) {
            this.log.info(`Cache full, removing oldest entry: ${oldestEntry[0]}`);
          }
          this.cache.delete(oldestEntry[0]);
        }
      }

      // Store in cache
      this.cache.set(name, {
        theme: transformedTheme,
        timestamp: Date.now(),
        source,
      });

      if (this.isLoggingEnabled()) {
        this.log.info(`Theme "${name}" successfully cached`);
      }
      return transformedTheme;
    } finally {
      if (loggingEnabled) {
        this.log.groupEnd();
      }
    }
  }

  /**
   * Type guard to check if input is a ThemeSchemeInitial
   * Reusing the same logic from ThemeTransformationManager
   */
  private isThemeSchemeInitial(input: unknown): input is ThemeSchemeInitial {
    return (
      input !== null &&
      typeof input === "object" &&
      "base" in input &&
      !("schemes" in input)
    );
  }

  /**
   * Check if a theme exists in the cache and is not expired
   */
  has(name: ThemeName): boolean {
    const entry = this.cache.get(name);
    if (!entry) return false;

    const isValid =
      Date.now() - entry.timestamp <= this.config.cacheDuration &&
      themeValidationManager.isFullyTransformed(entry.theme);

    return isValid;
  }

  /**
   * Clear the entire theme cache or a specific theme
   */
  clear(name?: ThemeName): void {
    if (name) {
      this.cache.delete(name);
      if (this.isLoggingEnabled()) {
        this.log.info(`Cleared theme "${name}" from cache`);
      }
    } else {
      this.cache.clear();
      if (this.isLoggingEnabled()) {
        this.log.info("Cleared entire theme cache");
      }
    }
  }

  /**
   * Get information about the current cache state
   */
  getCacheStatus(): {
    size: number;
    themes: ThemeName[];
    expirations: Record<string, number>;
    sources: Record<string, string>;
  } {
    // Initialize with empty objects instead of trying to create full Records
    const expirations: Record<string, number> = {};
    const sources: Record<string, string> = {};

    // Populate with actual data from the cache
    this.cache.forEach((entry, name) => {
      const expiresIn =
        this.config.cacheDuration - (Date.now() - entry.timestamp);
      expirations[name] = Math.max(0, expiresIn);
      sources[name] = entry.source;
    });

    return {
      size: this.cache.size,
      themes: Array.from(this.cache.keys()),
      expirations,
      sources,
    };
  }
}

// Export singleton instance
export const themeCacheService = ThemeCacheService.getInstance();
