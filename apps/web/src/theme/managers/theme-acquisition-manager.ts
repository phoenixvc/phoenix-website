// theme/core/theme-acquisition-manager.ts

import {
  ThemeColors,
  ThemeName,
  ThemeSchemeInitial,
  SemanticColors,
  ThemeAcquisitionConfig,
  AcquisitionStatus,
  AcquisitionResult,
  Theme,
  ThemeScheme,
} from "../types";

import { themeValidationManager } from "./theme-validation-manager";
import { ThemeStorageManager } from "./theme-storage-manager";
import {
  themeCacheService,
  ThemeCacheService,
} from "../services/theme-cache-service";
import { ThemeTransformationManager } from "./theme-transformation-manager";
import { ThemeRegistry } from "../registry/theme-registry";
import { ThemeCore } from "../core/theme-core";
import { DEFAULT_MODE, DEFAULT_THEME } from "../constants/tokens";
import ColorUtils from "../utils/color-utils";
import { logger } from "../../utils/logger";

// Declare themeCore as an optional global variable
declare const themeCore: ThemeCore | undefined;

/**
 * ThemeAcquisitionManager
 *
 * Responsible for acquiring themes from various sources (registry, local, remote, default),
 * validating them, transforming them if needed, and managing them through the cache service.
 */
export class ThemeAcquisitionManager {
  private static instance: ThemeAcquisitionManager;

  private config: ThemeAcquisitionConfig;
  private acquisitionStatus: Map<ThemeName, AcquisitionStatus>;
  private defaultTheme: ThemeColors;
  private cacheService: ThemeCacheService;
  private themeTransformationManager: ThemeTransformationManager;
  private readonly SERVICE_NAME = "ThemeAcquisitionManager";
  private readonly log = logger.createChild(this.SERVICE_NAME);

  // Reference to the theme registry
  private themeRegistry: ThemeRegistry | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config?: ThemeAcquisitionConfig) {
    // Default configuration
    this.config = {
      baseUrl: config?.baseUrl || "/themes",
      timeout: config?.timeout || 5000,
      defaultMode: config?.defaultMode || DEFAULT_MODE,
      validateThemes:
        config?.validateThemes !== undefined ? config.validateThemes : true,
      transformThemes:
        config?.transformThemes !== undefined ? config.transformThemes : true,
      useLocalStorage:
        config?.useLocalStorage !== undefined ? config.useLocalStorage : true,
      enableLogging:
        config?.enableLogging !== undefined ? config.enableLogging : true,
      allowExternalLoading:
        config?.allowExternalLoading !== undefined
          ? config.allowExternalLoading
          : false,
      themeRegistry: config?.themeRegistry || undefined,
    };

    // Set theme registry if provided
    if (config?.themeRegistry) {
      this.themeRegistry = config.themeRegistry;
    }

    this.acquisitionStatus = new Map<ThemeName, AcquisitionStatus>();

    // Initialize cache service
    this.cacheService = themeCacheService;

    // Initialize with a minimal default theme
    this.defaultTheme = this.createDefaultTheme();

    // Load themes from local storage if enabled
    if (this.config.useLocalStorage) {
      this.loadThemesFromStorage().catch((error) => {
        if (this.isLoggingEnabled()) {
          this.log.warn("Failed to load themes from local storage");
        }
        this.log.warn(error);
      });
    }

    this.themeTransformationManager = new ThemeTransformationManager();
  }

  /**
   * Helper method to safely get the logging state
   */
  private isLoggingEnabled(): boolean {
    return this.config.enableLogging === true;
  }

  /**
   * Get the singleton instance of ThemeAcquisitionManager
   */
  static getInstance(config?: ThemeAcquisitionConfig): ThemeAcquisitionManager {
    if (!ThemeAcquisitionManager.instance) {
      ThemeAcquisitionManager.instance = new ThemeAcquisitionManager(config);
    } else if (config) {
      ThemeAcquisitionManager.instance.updateConfig(config);
    }
    return ThemeAcquisitionManager.instance;
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<ThemeAcquisitionConfig>): void {
    this.config = { ...this.config, ...config };

    // Update theme registry if provided
    if (config.themeRegistry) {
      this.themeRegistry = config.themeRegistry;
    }

    if (this.isLoggingEnabled()) {
      this.log.info("Configuration updated");
    }
  }

  /**
   * Set the theme registry
   */
  setThemeRegistry(registry: ThemeRegistry): void {
    this.themeRegistry = registry;
    if (this.isLoggingEnabled()) {
      this.log.info("Theme registry set");
    }
  }

  /**
   * Acquire a theme by name
   *
   * This method attempts to get a theme from registry first, then cache,
   * then local storage, then local sources (if allowed), then remote sources (if allowed),
   * and finally falls back to the default theme.
   */
  async acquireTheme(
    themeName: ThemeName,
    options?: {
      forceRefresh?: boolean;
      allowExternalLoading?: boolean;
    },
  ): Promise<AcquisitionResult> {
    const forceRefresh = options?.forceRefresh || false;
    const allowExternalLoading =
      options?.allowExternalLoading !== undefined
        ? options.allowExternalLoading
        : this.config.allowExternalLoading;

    const loggingEnabled = this.isLoggingEnabled();
    if (loggingEnabled) {
      this.log.group(
        `Acquiring theme: ${themeName} (forceRefresh: ${forceRefresh}, allowExternalLoading: ${allowExternalLoading})`,
      );
    }

    try {
      // Update status to loading
      this.acquisitionStatus.set(themeName, "loading");

      // First check the registry if available
      if (
        !forceRefresh &&
        this.themeRegistry &&
        this.themeRegistry.themes[themeName]
      ) {
        const registryTheme = this.themeRegistry.themes[themeName];
        if (registryTheme) {
          if (this.isLoggingEnabled()) {
            this.log.info(`Using theme from registry: ${themeName}`);
          }

          // Process the theme to ensure it"s in the right format
          const processedTheme = this.processTheme(registryTheme, themeName);

          // Cache the theme for future use
          this.cacheService.set(
            themeName,
            processedTheme,
            undefined,
            "registry",
          );
          this.acquisitionStatus.set(themeName, "success");

          return {
            status: "success",
            data: processedTheme,
            source: "registry",
            timestamp: Date.now(),
          };
        }
      }

      // Try to get from ThemeCore if available
      if (
        !forceRefresh &&
        typeof themeCore !== "undefined" &&
        typeof themeCore.getTheme === "function"
      ) {
        const coreTheme = themeCore.getTheme(themeName);
        if (coreTheme) {
          if (this.isLoggingEnabled()) {
            this.log.info(`Using theme from ThemeCore: ${themeName}`);
          }

          // Process the theme to ensure it"s in the right format
          const processedTheme = this.processTheme(coreTheme, themeName);

          // Cache the theme for future use
          this.cacheService.set(
            themeName,
            processedTheme,
            undefined,
            "registry",
          );
          this.acquisitionStatus.set(themeName, "success");

          return {
            status: "success",
            data: processedTheme,
            source: "registry",
            timestamp: Date.now(),
          };
        }
      }

      // Check cache if not forcing refresh
      if (!forceRefresh && this.cacheService.has(themeName)) {
        const cachedTheme = this.cacheService.get(themeName);
        if (cachedTheme) {
          if (this.isLoggingEnabled()) {
            this.log.info(`Using cached theme: ${themeName}`);
          }
          this.acquisitionStatus.set(themeName, "cached");

          return {
            status: "cached",
            data: cachedTheme,
            source: "cache",
            timestamp: Date.now(),
          };
        }
      }

      // Try to load from storage if enabled
      if (this.config.useLocalStorage && !forceRefresh) {
        const storedTheme = await ThemeStorageManager.getThemeData(themeName);
        if (storedTheme) {
          if (this.isLoggingEnabled()) {
            this.log.info(`Using stored theme: ${themeName}`);
          }

          // Process and cache the theme
          const processedTheme = this.processTheme(storedTheme, themeName);
          this.cacheService.set(themeName, processedTheme, undefined, "local");
          this.acquisitionStatus.set(themeName, "success");

          return {
            status: "success",
            data: processedTheme,
            source: "local",
            timestamp: Date.now(),
          };
        }
      }

      // Only proceed with external loading if explicitly allowed
      if (allowExternalLoading) {
        // Try to load from local source
        try {
          const localTheme = await this.loadLocalTheme(themeName);
          if (localTheme) {
            if (this.isLoggingEnabled()) {
              this.log.info(`Loaded local theme: ${themeName}`);
            }

            // Process and cache the theme
            const processedTheme = this.processTheme(localTheme, themeName);
            this.cacheService.set(
              themeName,
              processedTheme,
              undefined,
              "local",
            );
            this.acquisitionStatus.set(themeName, "success");

            // Save to local storage if enabled
            if (this.config.useLocalStorage) {
              await this.saveToLocalStorage(themeName, processedTheme);
            }

            // Add to registry if available
            if (this.themeRegistry) {
              this.themeRegistry.themes[themeName] = processedTheme;
            }

            return {
              status: "success",
              data: processedTheme,
              source: "local",
              timestamp: Date.now(),
            };
          }
        } catch (error) {
          if (this.isLoggingEnabled()) {
            this.log.warn(`Failed to load local theme: ${themeName}`);
          }
          this.log.warn(error);
          // Continue to try remote sources
        }

        // Try to load from remote source
        try {
          const remoteTheme = await this.loadRemoteTheme(themeName);
          if (remoteTheme) {
            if (this.isLoggingEnabled()) {
              this.log.info(`Loaded remote theme: ${themeName}`);
            }

            // Process and cache the theme
            const processedTheme = this.processTheme(remoteTheme, themeName);
            this.cacheService.set(
              themeName,
              processedTheme,
              undefined,
              "remote",
            );
            this.acquisitionStatus.set(themeName, "success");

            // Save to local storage if enabled
            if (this.config.useLocalStorage) {
              await this.saveToLocalStorage(themeName, processedTheme);
            }

            // Add to registry if available
            if (this.themeRegistry) {
              this.themeRegistry.themes[themeName] = processedTheme;
            }

            return {
              status: "success",
              data: processedTheme,
              source: "remote",
              timestamp: Date.now(),
            };
          }
        } catch (error) {
          if (this.isLoggingEnabled()) {
            this.log.warn(`Failed to load remote theme: ${themeName}`);
          }
          this.log.warn(error);
          // Fall back to default theme
        }
      } else {
        if (this.isLoggingEnabled()) {
          this.log.info(
            `External loading is disabled. Skipping local and remote theme loading for: ${themeName}`,
          );
        }
      }

      // Try to get default theme from registry if available
      if (
        this.themeRegistry &&
        this.themeRegistry.defaults &&
        this.themeRegistry.defaults.themeName
      ) {
        const defaultThemeName = this.themeRegistry.defaults.themeName;
        if (
          defaultThemeName !== themeName &&
          this.themeRegistry.themes[defaultThemeName]
        ) {
          if (this.isLoggingEnabled()) {
            this.log.info(
              `Using default theme from registry: ${defaultThemeName} for: ${themeName}`,
            );
          }

          const defaultTheme = this.themeRegistry.themes[defaultThemeName];
          const processedTheme = this.processTheme(defaultTheme, themeName);

          // Cache the default theme for this name
          this.cacheService.set(
            themeName,
            processedTheme,
            undefined,
            "default",
          );
          this.acquisitionStatus.set(themeName, "success");

          return {
            status: "success",
            data: processedTheme,
            source: "registry",
            timestamp: Date.now(),
          };
        }
      }

      // Fall back to default theme
      if (this.isLoggingEnabled()) {
        this.log.warn(`Using default theme for: ${themeName}`);
      }
      this.acquisitionStatus.set(themeName, "success");

      // Cache the default theme for this name
      this.cacheService.set(themeName, this.defaultTheme, undefined, "default");

      return {
        status: "success",
        data: this.defaultTheme,
        source: "default",
        timestamp: Date.now(),
      };
    } catch (error) {
      if (this.isLoggingEnabled()) {
        this.log.warn(`Error acquiring theme: ${themeName}`);
      }
      this.log.error(error);
      this.acquisitionStatus.set(themeName, "error");

      return {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    } finally {
      // Always end the group that was started at the beginning of this method
      if (loggingEnabled) {
        this.log.groupEnd();
      }
    }
  }

  /**
   * Get the acquisition status for a theme
   */
  getAcquisitionStatus(themeName: ThemeName): AcquisitionStatus {
    return this.acquisitionStatus.get(themeName) || "idle";
  }

  /**
   * Check if a theme is cached or in registry
   */
  isThemeCached(themeName: ThemeName): boolean {
    // Check registry first
    if (this.themeRegistry && this.themeRegistry.themes[themeName]) {
      return true;
    }

    // Check ThemeCore if available
    if (
      typeof themeCore !== "undefined" &&
      typeof themeCore.getTheme === "function" &&
      themeCore.getTheme(themeName)
    ) {
      return true;
    }

    // Then check cache
    return this.cacheService.has(themeName);
  }

  /**
   * Get cache status information
   */
  getCacheStatus(): {
    size: number;
    themes: ThemeName[];
    expirations: Record<string, number>;
    sources: Record<string, string>;
  } {
    const cacheStatus = this.cacheService.getCacheStatus();

    // Add registry themes if available
    if (this.themeRegistry) {
      const registryThemes = Object.keys(
        this.themeRegistry.themes,
      ) as ThemeName[];

      // Combine and deduplicate themes
      const allThemes = [
        ...new Set([...cacheStatus.themes, ...registryThemes]),
      ];

      return {
        ...cacheStatus,
        size: allThemes.length,
        themes: allThemes,
      };
    }

    return cacheStatus;
  }

  /**
   * Clear the theme cache and optionally registry
   */
  async clearCache(themeName?: ThemeName, clearRegistry = true): Promise<void> {
    this.cacheService.clear(themeName);

    // Also clear from local storage if enabled
    if (this.config.useLocalStorage && themeName) {
      await this.removeFromLocalStorage(themeName);
    } else if (this.config.useLocalStorage) {
      await this.clearLocalStorage();
    }

    // Clear from registry if requested
    if (clearRegistry && this.themeRegistry && themeName) {
      delete this.themeRegistry.themes[themeName];
    } else if (clearRegistry && this.themeRegistry) {
      this.themeRegistry.themes = {} as Record<ThemeName, ThemeColors>;
    }

    if (this.isLoggingEnabled()) {
      this.log.info(
        themeName
          ? `Cleared theme "${themeName}" from cache${clearRegistry ? " and registry" : ""}`
          : `Cleared entire theme cache${clearRegistry ? " and registry" : ""}`,
      );
    }
  }

  /**
   * Preload a theme
   */
  async preloadTheme(
    themeName: ThemeName,
    config?: Partial<ThemeAcquisitionConfig>,
  ): Promise<void> {
    const loggingEnabled = this.isLoggingEnabled();
    if (loggingEnabled) {
      this.log.group(`Preloading theme: ${themeName}`);
    }

    try {
      // Update config if provided
      if (config) {
        this.updateConfig(config);
      }

      const allowExternalLoading =
        config?.allowExternalLoading !== undefined
          ? config.allowExternalLoading
          : this.config.allowExternalLoading;

      await this.acquireTheme(themeName, { allowExternalLoading });
    } finally {
      if (loggingEnabled) {
        this.log.groupEnd();
      }
    }
  }

  /**
   * Register a theme directly
   */
  async registerTheme(
    themeName: ThemeName,
    theme: ThemeColors | ThemeSchemeInitial,
    semantic?: SemanticColors,
  ): Promise<ThemeColors> {
    const loggingEnabled = this.isLoggingEnabled();
    if (loggingEnabled) {
      this.log.group(`Registering theme: ${themeName}`);
    }

    try {
      // Process and cache the theme
      const processedTheme = this.processTheme(theme, themeName, semantic);
      this.cacheService.set(themeName, processedTheme, semantic, "registered");

      // Add to registry if available
      if (this.themeRegistry) {
        this.themeRegistry.themes[themeName] = processedTheme;

        // Add metadata if not present
        if (!this.themeRegistry.metadata[themeName]) {
          this.themeRegistry.metadata[themeName] = {
            displayName: themeName,
            description: `Theme ${themeName}`,
          };
        }
      }

      // Save to local storage if enabled
      if (this.config.useLocalStorage) {
        await this.saveToLocalStorage(themeName, processedTheme);
      }

      return processedTheme;
    } finally {
      if (loggingEnabled) {
        this.log.groupEnd();
      }
    }
  }

  /**
   * Process a theme (validate and transform if needed)
   * This can handle Theme objects as well as ThemeColors or ThemeSchemeInitial
   */
  private processTheme(
    theme: Theme | ThemeColors | ThemeSchemeInitial,
    themeName: ThemeName,
    semantic?: SemanticColors,
  ): ThemeColors {
    // First check if it"s a Theme object
    if (this.isThemeObject(theme)) {
      // If it"s a Theme object, extract the ThemeColors part
      const themeObj = theme as Theme;
      return this.processTheme(themeObj.colors, themeName, semantic);
    }

    // Transform the theme if needed
    let processedTheme: ThemeColors;

    if (this.config.transformThemes) {
      if (themeValidationManager.isThemeColorsType(theme)) {
        // If it"s a ThemeColors object, we need to extract the scheme for transformation
        // Get the first scheme from the ThemeColors object
        const schemeKey = Object.keys(theme.schemes)[0] || themeName;
        const scheme = theme.schemes[schemeKey];

        // If it already has semantic colors, use them unless overridden
        const semanticColors = semantic || theme.semantic;

        // Now transform it
        processedTheme = {
          schemes: {
            [schemeKey]:
              this.themeTransformationManager.ensureFullyProcessed(scheme),
          },
          semantic: semanticColors,
        };
      } else {
        // It"s a ThemeSchemeInitial, transform it directly
        const transformedScheme =
          this.themeTransformationManager.transformScheme(theme);

        // Create a ThemeColors object with the transformed scheme
        processedTheme = {
          schemes: {
            [themeName]: transformedScheme,
          },
          semantic: semantic,
        };
      }
    } else if (themeValidationManager.isThemeColorsType(theme)) {
      // It"s already a ThemeColors and we"re not transforming
      processedTheme = theme;

      // Add semantic colors if provided
      if (semantic) {
        processedTheme.semantic = semantic;
      }
    } else {
      // It"s a ThemeSchemeInitial but we"re not transforming
      // This is an error state since we need a fully formed ThemeColors
      throw new Error(
        "Cannot process theme: transformation is disabled but theme is not a ThemeColors object",
      );
    }

    // Validate the theme if needed
    if (this.config.validateThemes) {
      themeValidationManager.validateProcessedTheme(processedTheme);
    }

    return processedTheme;
  }

  /**
   * Check if an object is a Theme
   */
  private isThemeObject(obj: unknown): obj is Theme {
    if (!obj || typeof obj !== "object") {
      return false;
    }

    const candidate = obj as Record<string, unknown>;
    return (
      "name" in candidate && "colors" in candidate && "config" in candidate
    );
  }

  /**
   * Load a theme from local sources
   */
  private async loadLocalTheme(
    themeName: ThemeName,
  ): Promise<ThemeColors | ThemeSchemeInitial | undefined> {
    try {
      // Use Vite's import.meta.glob to get all theme files
      const themeModules = import.meta.glob("../themes/*.js");

      // Create the path to the theme file
      const themePath = `../themes/${themeName}.js`;

      // Check if the theme exists in the available modules
      if (themeModules[themePath]) {
        // Import the theme dynamically
        const module = await themeModules[themePath]();
        return (
          (module as { default?: ThemeColors | ThemeSchemeInitial })?.default ||
          (module as ThemeColors | ThemeSchemeInitial)
        );
      }

      // Theme not found
      if (this.isLoggingEnabled()) {
        this.log.warn(`Theme not found: ${themeName}`);
      }
      return undefined;
    } catch (error) {
      if (this.isLoggingEnabled()) {
        this.log.warn(`Failed to load local theme: ${themeName}`);
      }
      this.log.warn(error);
      return undefined;
    }
  }

  /**
   * Load a theme from remote sources
   */
  private async loadRemoteTheme(
    themeName: ThemeName,
  ): Promise<ThemeColors | ThemeSchemeInitial | undefined> {
    // Implementation depends on your remote theme sources
    // This could be fetched from an API, CDN, etc.

    // Example implementation for fetch from API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(`${this.config.baseUrl}/${themeName}.json`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch theme: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Timeout fetching theme: ${themeName}`);
      }

      if (this.isLoggingEnabled()) {
        this.log.warn(`Failed to load remote theme: ${themeName}`);
      }
      this.log.warn(error);
      return undefined;
    }
  }

  /**
   * Load theme with backward compatibility for theme-loader
   */
  async loadTheme(
    themeName?: ThemeName,
    config?: Partial<ThemeAcquisitionConfig>,
  ): Promise<ThemeColors> {
    if (config) {
      this.updateConfig(config);
    }

    // Use DEFAULT_THEME from theme-constants.ts as the fallback
    const effectiveThemeName =
      themeName || this.themeRegistry?.defaults?.themeName || DEFAULT_THEME;

    const result = await this.acquireTheme(effectiveThemeName, {
      allowExternalLoading: config?.allowExternalLoading,
    });

    if (result.status === "error") {
      throw new Error(result.error || "Failed to load theme");
    }

    return result.data!;
  }

  /**
   * Create the default theme from constants or registry
   */
  private createDefaultTheme(): ThemeColors {
    // Create a theme transformation manager instance
    const themeManager = new ThemeTransformationManager(this.config);

    // Try to get default theme from registry first
    if (
      this.themeRegistry &&
      this.themeRegistry.defaults &&
      this.themeRegistry.defaults.themeName &&
      this.themeRegistry.themes[this.themeRegistry.defaults.themeName]
    ) {
      const registryTheme =
        this.themeRegistry.themes[this.themeRegistry.defaults.themeName];
      if (this.isLoggingEnabled()) {
        this.log.info("Using default theme from registry");
      }

      return registryTheme;
    }

    try {
      // Create a minimal color scheme using hex strings for base colors
      const minimalColorScheme: ThemeSchemeInitial = {
        base: {
          primary: "#0066cc",
          secondary: "#6c757d",
          tertiary: "#6f42c1",
          neutral: "#6c757d",
          accent: "#fd7e14",
        },
        light: {
          // Use ColorUtils.createColorDefinition to ensure proper color definition objects
          background: ColorUtils.createColorDefinition("#ffffff"),
          surface: ColorUtils.createColorDefinition("#f8f9fa"),
          border: ColorUtils.createColorDefinition("#dee2e6"),
          muted: ColorUtils.createColorDefinition("#e9ecef"),
          text: {
            primary: ColorUtils.createColorDefinition("#212529"),
            secondary: ColorUtils.createColorDefinition("#6c757d"),
          },
        },
        dark: {
          // Use ColorUtils.createColorDefinition to ensure proper color definition objects
          background: ColorUtils.createColorDefinition("#212529"),
          surface: ColorUtils.createColorDefinition("#343a40"),
          border: ColorUtils.createColorDefinition("#495057"),
          muted: ColorUtils.createColorDefinition("#6c757d"),
          text: {
            primary: ColorUtils.createColorDefinition("#f8f9fa"),
            secondary: ColorUtils.createColorDefinition("#adb5bd"),
          },
        },
      };

      // Create semantic colors
      const semanticColors: SemanticColors = {
        success: ColorUtils.createColorDefinition("#28a745"),
        warning: ColorUtils.createColorDefinition("#ffc107"),
        error: ColorUtils.createColorDefinition("#dc3545"),
        info: ColorUtils.createColorDefinition("#17a2b8"),
      };

      // Transform the color scheme
      const transformedColorScheme =
        themeManager.transformScheme(minimalColorScheme);

      // Return colors part to be merged with defaultTheme
      return {
        schemes: {
          [DEFAULT_MODE]: transformedColorScheme,
        },
        semantic: semanticColors,
      };
    } catch (error) {
      if (this.isLoggingEnabled()) {
        this.log.warn(`Failed to create default theme colors: ${error}`);
      }

      // If we can't create the color scheme, use a fallback approach
      try {
        // For the fallback, use the ColorUtils.createColorShades helper
        const fallbackScheme: ThemeScheme = {
          base: {
            primary: ColorUtils.createColorShades("#0066cc"),
            secondary: ColorUtils.createColorShades("#6c757d"),
            tertiary: ColorUtils.createColorShades("#6f42c1"),
            neutral: ColorUtils.createColorShades("#6c757d"),
            accent: ColorUtils.createColorShades("#fd7e14"),
          },
          light: {
            background: ColorUtils.createColorDefinition("#ffffff"),
            surface: ColorUtils.createColorDefinition("#f8f9fa"),
            border: ColorUtils.createColorDefinition("#dee2e6"),
            muted: ColorUtils.createColorDefinition("#e9ecef"),
            text: {
              primary: ColorUtils.createColorDefinition("#212529"),
              secondary: ColorUtils.createColorDefinition("#6c757d"),
            },
          },
          dark: {
            background: ColorUtils.createColorDefinition("#212529"),
            surface: ColorUtils.createColorDefinition("#343a40"),
            border: ColorUtils.createColorDefinition("#495057"),
            muted: ColorUtils.createColorDefinition("#6c757d"),
            text: {
              primary: ColorUtils.createColorDefinition("#f8f9fa"),
              secondary: ColorUtils.createColorDefinition("#adb5bd"),
            },
          },
        };

        // Create fallback semantic colors
        const fallbackSemanticColors: SemanticColors = {
          success: ColorUtils.createColorDefinition("#28a745"),
          warning: ColorUtils.createColorDefinition("#ffc107"),
          error: ColorUtils.createColorDefinition("#dc3545"),
          info: ColorUtils.createColorDefinition("#17a2b8"),
        };

        return {
          schemes: {
            [DEFAULT_MODE]: fallbackScheme,
          },
          semantic: fallbackSemanticColors,
        };
      } catch (fallbackError) {
        if (this.isLoggingEnabled()) {
          this.log.error(
            `Failed to create fallback theme colors: ${fallbackError}`,
          );
        }
        throw new Error(
          `Unable to create theme colors: ${error}. Fallback also failed: ${fallbackError}`,
        );
      }
    }
  }

  /**
   * Save a theme to local storage
   */
  private async saveToLocalStorage(
    themeName: ThemeName,
    theme: ThemeColors,
  ): Promise<void> {
    if (!this.config.useLocalStorage) return;

    try {
      await ThemeStorageManager.saveThemeData(themeName, theme);
      if (this.isLoggingEnabled()) {
        this.log.info(`Saved theme to local storage: ${themeName}`);
      }
    } catch (error) {
      if (this.isLoggingEnabled()) {
        this.log.warn(`Failed to save theme to local storage: ${themeName}`);
      }
      this.log.warn(error);
    }
  }

  /**
   * Remove a theme from local storage
   */
  private async removeFromLocalStorage(themeName: ThemeName): Promise<void> {
    if (!this.config.useLocalStorage) return;

    try {
      await ThemeStorageManager.removeThemeData(themeName);
      if (this.isLoggingEnabled()) {
        this.log.info(`Removed theme from local storage: ${themeName}`);
      }
    } catch (error) {
      if (this.isLoggingEnabled()) {
        this.log.warn(`Failed to remove theme from local storage: ${themeName}`);
      }
      this.log.warn(error);
    }
  }

  /**
   * Clear all themes from local storage
   */
  private async clearLocalStorage(): Promise<void> {
    if (!this.config.useLocalStorage) return;

    try {
      await ThemeStorageManager.clearAllThemeData();
      if (this.isLoggingEnabled()) {
        this.log.info("Cleared all themes from local storage");
      }
    } catch (error) {
      if (this.isLoggingEnabled()) {
        this.log.warn("Failed to clear themes from local storage");
      }
      this.log.warn(error);
    }
  }

  /**
   * Load themes from local storage into cache
   */
  private async loadThemesFromStorage(): Promise<void> {
    if (!this.config.useLocalStorage) return;

    try {
      const themeNames = await ThemeStorageManager.getStoredThemeNames();
      if (this.isLoggingEnabled()) {
        this.log.info(`Found ${themeNames.length} themes in storage`);
      }

      for (const themeName of themeNames) {
        const theme = await ThemeStorageManager.getThemeData(themeName);
        if (theme) {
          this.cacheService.set(themeName, theme, undefined, "local");

          // Also add to registry if available
          if (this.themeRegistry) {
            this.themeRegistry.themes[themeName] = theme;
          }

          if (this.isLoggingEnabled()) {
            this.log.info(`Loaded theme from storage: ${themeName}`);
          }
        }
      }
    } catch (error) {
      if (this.isLoggingEnabled()) {
        this.log.warn("Failed to load themes from storage");
      }
      this.log.warn(error);
    }
  }
}

// Export singleton instance
export const themeAcquisitionManager = ThemeAcquisitionManager.getInstance();
