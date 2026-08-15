// src/theme/core/theme-state-manager.ts

import { ThemeStorageManager } from "./theme-storage-manager";
import {
  ThemeName,
  ThemeConfig,
  ThemeMode,
  ThemeState,
  StorageOptions,
} from "../types";
import { themeValidationManager } from "./theme-validation-manager";
import { ThemeAcquisitionManager } from "./theme-acquisition-manager";
import { ThemeCacheService } from "../services/theme-cache-service";
import { THEME_STORAGE_CONSTANTS } from "../constants/storage/theme-storage-constants";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";

/**
 * Manages the global theme state using the Singleton pattern.
 * Responsible for initializing, updating, and notifying about theme state changes.
 * @class ThemeStateManager
 */
export class ThemeStateManager {
  private static instance: ThemeStateManager;

  // State properties
  private currentThemeName!: ThemeName;
  private currentMode!: ThemeMode;
  private systemMode!: ThemeMode;
  private useSystem!: boolean;
  private _initialized: boolean = false;
  private config: ThemeConfig;

  // Theme loading state
  private _isLoadingTheme: boolean = false;
  private _loadingThemePromise: Promise<void> | null = null;
  private _loadingError: Error | null = null;

  // DOM-related properties
  private listeners: Set<() => void>;
  private mediaQuery: MediaQueryList | null = null;

  private constructor(
    config: ThemeConfig = { name: "default", useSystem: false },
  ) {
    // Initialize all properties first to avoid undefined errors
    this.listeners = new Set();
    this._initialized = false;
    this._isLoadingTheme = false;
    this._loadingThemePromise = null;
    this._loadingError = null;
    this.mediaQuery = null;

    // Then configure and initialize the state
    this.config = {
      ...config,
      themeName: config.themeName || DEFAULT_THEME_NAME,
      mode: config.mode || "dark",
      direction: config.direction || "ltr",
      version: config.version || "1.0.0",
    };

    // CRITICAL: Initialize state synchronously with dark mode default FIRST
    // This ensures dark mode is shown immediately before any async storage reads complete
    this.initializeState();

    // Then initialize state asynchronously (will update from storage if available)
    this.initializeStateAsync().catch((error) => {
      console.error("[ThemeStateManager] Failed to initialize state:", error);
    });

    // Set up browser-specific functionality
    if (typeof window !== "undefined") {
      // Apply dark mode immediately to prevent flash of light mode
      this.applyTheme();

      this.initializeSystemListener();
      this._initialized = true;

      // Load the initial theme after state is initialized
      setTimeout(() => {
        this.loadAndApplyTheme(this.currentThemeName).catch((error) => {
          console.error(
            "[ThemeStateManager] Failed to load initial theme:",
            error,
          );
          this._loadingError =
            error instanceof Error
              ? error
              : new Error("Failed to load initial theme");
        });
      }, 0);
    }
  }

  // Expose the initialized flag via a getter
  get initialized(): boolean {
    return this._initialized;
  }

  // Expose theme loading state
  get isLoadingTheme(): boolean {
    return this._isLoadingTheme;
  }

  // Expose loading error
  get loadingError(): Error | null {
    return this._loadingError;
  }

  /**
   * Initialize the state with stored values or defaults.
   */
  private async initializeStateAsync(): Promise<void> {
    const queryTheme =
      typeof window !== "undefined"
        ? this.getThemeFromQuery(window.location.search)
        : null;
    if (queryTheme) {
      this.currentThemeName = queryTheme;
      await ThemeStorageManager.saveThemeName(queryTheme);
    } else {
      this.currentThemeName = await this.getStoredOrDefaultThemeName();
    }
    this.currentMode = await this.getStoredOrDefaultMode();
    this.systemMode = this.getInitialSystemMode();
    this.useSystem = await this.getStoredOrDefaultUseSystem();
  }

  private getThemeFromQuery(search: string): ThemeName | null {
    if (!search) return null;
    try {
      const params = new URLSearchParams(search);
      const theme = params.get("theme");
      if (theme && themeValidationManager.isValidThemeName(theme)) {
        return theme as ThemeName;
      }
      const fixtureMap: Record<string, ThemeName> = {
        "cosmic-fixture": "cosmic-frontier",
        "forest-fixture": "forest",
        "highveld-fixture": "highveld",
        "phoenix-fixture": "phoenix",
        "ocean-fixture": "ocean",
        "cloud-fixture": "cloud",
        "lavender-fixture": "lavender",
        "classic-fixture": "classic",
      };
      for (const [fixtureParam, themeName] of Object.entries(fixtureMap)) {
        if (params.get(fixtureParam) === "static") {
          return themeName;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
    return null;
  }

  /**
   * Synchronous initialization for constructor
   * Uses URL query, stored values, and defaults
   */
  private initializeState(): void {
    const queryTheme =
      typeof window !== "undefined"
        ? this.getThemeFromQuery(window.location.search)
        : null;
    const storedTheme = ThemeStorageManager.getThemeNameSync();

    if (queryTheme) {
      this.currentThemeName = queryTheme;
      ThemeStorageManager.saveThemeNameSync(queryTheme);
    } else if (
      storedTheme &&
      themeValidationManager.isValidThemeName(storedTheme)
    ) {
      this.currentThemeName = storedTheme;
    } else {
      this.currentThemeName =
        this.config.themeName || THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME;
    }

    const storedMode = ThemeStorageManager.getThemeModeSync();
    this.currentMode =
      storedMode && themeValidationManager.isValidThemeMode(storedMode)
        ? storedMode
        : this.config.mode || "dark";

    this.systemMode = this.getInitialSystemMode();
    this.useSystem =
      ThemeStorageManager.getUseSystemSync() ??
      (this.config.useSystem || false);
  }

  private async getStoredOrDefaultThemeName(): Promise<ThemeName> {
    try {
      const storedTheme = await ThemeStorageManager.getThemeName();
      if (storedTheme && themeValidationManager.isValidThemeName(storedTheme)) {
        return storedTheme;
      }

      const defaultTheme = THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME;
      await ThemeStorageManager.saveThemeName(defaultTheme);
      return defaultTheme;
    } catch (error) {
      console.error(
        "[ThemeStateManager] Error getting stored theme name:",
        error,
      );
      return THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME;
    }
  }

  private async getStoredOrDefaultMode(): Promise<ThemeMode> {
    try {
      const storedMode = await ThemeStorageManager.getThemeMode();
      return storedMode && themeValidationManager.isValidThemeMode(storedMode)
        ? storedMode
        : "dark";
    } catch (error) {
      console.error(
        "[ThemeStateManager] Error getting stored theme mode:",
        error,
      );
      return "dark";
    }
  }

  private async getStoredOrDefaultUseSystem(): Promise<boolean> {
    try {
      // getUseSystem() already defaults to false if no stored value
      return await ThemeStorageManager.getUseSystem();
    } catch (error) {
      console.error(
        "[ThemeStateManager] Error getting stored use system setting:",
        error,
      );
      return false;
    }
  }

  /**
   * Get singleton instance.
   * NOTE: Connection to ThemeCore is now handled by ThemeProvider to avoid circular dependencies.
   */
  static getInstance(config?: ThemeConfig): ThemeStateManager {
    if (!ThemeStateManager.instance) {
      ThemeStateManager.instance = new ThemeStateManager(config);
      // Connection to ThemeCore is now handled by ThemeProvider to avoid circular dependencies
    } else if (config) {
      // Optionally update config if provided and instance exists
      ThemeStateManager.instance.updateConfig(config);
    }
    return ThemeStateManager.instance;
  }

  /**
   * Update config if needed after initialization
   */
  updateConfig(config: Partial<ThemeConfig>): void {
    this.config = { ...this.config, ...config };
    this.notify();
  }

  /**
   * Initialize system mode listener.
   */
  private initializeSystemListener(): void {
    if (typeof window === "undefined") return;

    try {
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = this.handleSystemModeChange.bind(this);

      // Initial check
      handleChange(this.mediaQuery);

      // Add listener with fallback
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener("change", handleChange);
      } else {
        this.mediaQuery.addListener(handleChange);
      }
    } catch (error) {
      console.error(
        "[ThemeStateManager] Error initializing system mode listener:",
        error,
      );
      this.handleSystemModeError();
    }
  }

  /**
   * Configure storage options for theme persistence
   * @param options Storage configuration options
   */
  async setStorageOptions(options: StorageOptions): Promise<void> {
    try {
      // Validate options
      if (!options) {
        throw new Error("Invalid storage options provided");
      }

      // Apply storage options to ThemeStorageManager
      await ThemeStorageManager.configureStorage(options);

      console.log(
        "[ThemeStateManager] Storage options configured:",
        options.provider || "default",
      );

      // Re-initialize state from the potentially new storage
      await this.initializeStateAsync();

      // Apply theme with potentially new storage settings
      this.applyTheme();

      // Notify listeners of the change
      this.notify();
    } catch (error) {
      console.error(
        "[ThemeStateManager] Error configuring storage options:",
        error,
      );
      throw error;
    }
  }

  private handleSystemModeChange(
    e: MediaQueryListEvent | MediaQueryList,
  ): void {
    this.systemMode = e.matches ? "dark" : "light";
    if (this.useSystem) {
      this.applyTheme();
    }
    this.notify();
  }

  private handleSystemModeError(): void {
    this.systemMode = "light";
    this.useSystem = false;
  }

  /**
   * Load and apply a theme by theme name
   */
  private async loadAndApplyTheme(themeName: ThemeName): Promise<void> {
    if (this._isLoadingTheme && this._loadingThemePromise) {
      return this._loadingThemePromise;
    }

    this._isLoadingTheme = true;
    this._loadingError = null;
    this.notify();

    this._loadingThemePromise = (async (): Promise<void> => {
      try {
        // Load the theme
        await ThemeAcquisitionManager.getInstance().acquireTheme(themeName);

        // Apply the theme
        this.applyTheme();
      } catch (error) {
        console.error(
          `[ThemeStateManager] Failed to load theme "${themeName}":`,
          error,
        );
        this._loadingError =
          error instanceof Error
            ? error
            : new Error(`Failed to load theme "${themeName}"`);

        // If this isn't the default theme, try to fall back
        if (themeName !== THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME) {
          console.warn(
            `[ThemeStateManager] Falling back to default theme: ${THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME}`,
          );

          // Reset theme name to default
          this.currentThemeName = THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME;
          await ThemeStorageManager.saveThemeName(this.currentThemeName);

          // Try to load default theme
          await ThemeAcquisitionManager.getInstance().acquireTheme(
            THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME,
          );
          this.applyTheme();
        } else {
          // This is already the default theme and it failed to load
          throw error;
        }
      } finally {
        this._isLoadingTheme = false;
        this._loadingThemePromise = null;
        this.notify();
      }
    })();

    return this._loadingThemePromise;
  }

  /**
   * Apply theme and update DOM.
   */
  private applyTheme(): void {
    if (typeof window === "undefined") return;

    try {
      const mode = this.useSystem ? this.systemMode : this.currentMode;
      const root = document.documentElement;

      this.updateRootClasses(root, mode);
      this.dispatchThemeChangeEvent(mode);
    } catch (error) {
      console.error("[ThemeStateManager] Error applying theme:", error);
    }
  }

  async setThemeClasses(themeName: ThemeName): Promise<void> {
    // If already loading, wait for that to complete
    if (this._loadingThemePromise) {
      await this._loadingThemePromise;
    }

    // If the theme is already set, no need to do anything
    if (this.currentThemeName === themeName) {
      return;
    }

    this._isLoadingTheme = true;
    this.currentThemeName = themeName;

    // Save the theme name to storage
    await ThemeStorageManager.saveThemeName(themeName);

    this._loadingThemePromise = (async (): Promise<void> => {
      try {
        // Load the theme
        await ThemeAcquisitionManager.getInstance().acquireTheme(themeName);

        // Apply the theme
        this.applyTheme();
      } catch (error) {
        console.error(
          `[ThemeStateManager] Failed to load theme "${themeName}":`,
          error,
        );
        this._loadingError =
          error instanceof Error
            ? error
            : new Error(`Failed to load theme "${themeName}"`);

        // If this isn't the default theme, try to fall back
        if (themeName !== THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME) {
          console.warn(
            `[ThemeStateManager] Falling back to default theme: ${THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME}`,
          );

          // Reset theme name to default
          this.currentThemeName = THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME;
          await ThemeStorageManager.saveThemeName(this.currentThemeName);

          // Try to load default theme
          await ThemeAcquisitionManager.getInstance().acquireTheme(
            THEME_STORAGE_CONSTANTS.DEFAULTS.THEME_NAME,
          );
          this.applyTheme();
        } else {
          // This is already the default theme and it failed to load
          throw error;
        }
      } finally {
        this._isLoadingTheme = false;
        this._loadingThemePromise = null;
        this.notify();
      }
    })();

    return this._loadingThemePromise;
  }

  private updateRootClasses(root: HTMLElement, mode: ThemeMode): void {
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    root.setAttribute("data-theme", this.currentThemeName);
    root.setAttribute("data-loading", this._isLoadingTheme ? "true" : "false");
  }

  private dispatchThemeChangeEvent(mode: ThemeMode): void {
    window.dispatchEvent(
      new CustomEvent(THEME_STORAGE_CONSTANTS.EVENTS.CHANGE, {
        detail: {
          mode,
          themeName: this.currentThemeName,
          isLoading: this._isLoadingTheme,
        },
      }),
    );
  }

  /**
   * State management methods.
   */
  async setTheme(themeName: ThemeName): Promise<void> {
    if (!themeValidationManager.isValidThemeName(themeName)) {
      console.warn("[ThemeStateManager] Invalid theme name provided");
      return;
    }

    try {
      // Only load if the theme has changed
      if (this.currentThemeName !== themeName) {
        this.currentThemeName = themeName;
        await ThemeStorageManager.saveThemeName(themeName);

        // Load and apply the new theme
        await this.loadAndApplyTheme(themeName);
      }
    } catch (error) {
      console.error("[ThemeStateManager] Error setting theme name:", error);
      throw error;
    }
  }

  async setMode(mode: ThemeMode): Promise<void> {
    if (!themeValidationManager.isValidThemeMode(mode)) {
      console.warn("[ThemeStateManager] Invalid mode provided");
      return;
    }
    try {
      this.currentMode = mode;
      this.useSystem = false;
      await ThemeStorageManager.saveThemeMode(mode);
      await ThemeStorageManager.saveUseSystem(false);
      this.applyTheme();
      this.notify();
    } catch (error) {
      console.error("[ThemeStateManager] Error setting mode:", error);
    }
  }

  async setUseSystem(useSystem: boolean): Promise<void> {
    try {
      this.useSystem = useSystem;
      await ThemeStorageManager.saveUseSystem(useSystem);
      this.applyTheme();
      this.notify();
    } catch (error) {
      console.error("[ThemeStateManager] Error setting system mode:", error);
    }
  }

  /**
   * Theme cache and loading management
   */
  isThemeCached(themeName: ThemeName): boolean {
    return ThemeCacheService.getInstance().has(themeName);
  }

  /**
   * Preload a theme for future use
   * @param themeName The theme name to preload
   */
  async preloadTheme(themeName: ThemeName): Promise<void> {
    if (!themeValidationManager.isValidThemeName(themeName)) {
      console.warn("[ThemeStateManager] Invalid theme name for preloading");
      return;
    }

    try {
      await ThemeAcquisitionManager.getInstance().preloadTheme(themeName);
      this.notify();
    } catch (error) {
      console.error(
        `[ThemeStateManager] Error preloading theme "${themeName}":`,
        error,
      );
    }
  }

  clearThemeCache(): void {
    ThemeCacheService.getInstance().clear();
    this.notify();
  }

  /**
   * Get cache status with proper structure
   * @returns Object containing cache size and schemes list
   */
  getCacheStatus(): { size: number; schemes: ThemeName[] } {
    const cacheStatus = ThemeCacheService.getInstance().getCacheStatus();
    return {
      size: cacheStatus.size,
      schemes: cacheStatus.themes,
    };
  }

  /**
   * Observer pattern implementation.
   */
  subscribe(listener: () => void): () => void {
    if (!listener || typeof listener !== "function") {
      throw new Error("[ThemeStateManager] Invalid listener provided");
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    try {
      if (this.listeners) {
        this.listeners.forEach((listener) => {
          if (typeof listener === "function") {
            listener();
          }
        });
      }
    } catch (error) {
      console.error("[ThemeStateManager] Error notifying listeners:", error);
    }
  }

  private getInitialSystemMode(): ThemeMode {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  /**
   * Public getter returning the current theme state.
   */
  getState(): ThemeState & {
    isLoadingTheme: boolean;
    loadingError: Error | null;
  } {
    return {
      themeName: this.currentThemeName,
      mode: this.useSystem ? this.systemMode : this.currentMode,
      systemMode: this.systemMode,
      useSystem: this.useSystem,
      initialized: this.initialized,
      timestamp: Date.now(),
      previous: {
        themeName: this.currentThemeName,
        mode: this.currentMode,
      },

      // Theme loading state
      isLoadingTheme: this._isLoadingTheme,
      loadingError: this._loadingError,

      // Use config properties
      name: this.config.name,
      direction: this.config.direction || "ltr",
      version: this.config.version || "1.0.0",
    };
  }

  /**
   * Cleanup method (primarily for testing).
   */
  destroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery = null;
    }
    this.listeners.clear();
    this._initialized = false;
    this._isLoadingTheme = false;
    this._loadingThemePromise = null;
    this._loadingError = null;
  }
}

// Export the class for explicit getInstance() calls
// Do NOT export a singleton instance to avoid circular dependency issues during module initialization
