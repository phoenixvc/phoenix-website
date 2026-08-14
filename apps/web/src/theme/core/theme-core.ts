import { ColorMapping, TypographyScale } from "../mappings";
import {
  ColorDefinition,
  ThemeName,
  ThemeMode,
  ThemeState,
  ThemeColors,
  Theme,
  ThemeAcquisitionConfig,
  StorageOptions,
  TransitionOptions,
} from "../types";
import { ComponentRegistryManager } from "../registry/component-registry-manager";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";
import { ComponentManager } from "../managers/component-manager";
import type { ThemeStateManager } from "../managers/theme-state-manager";
import { ThemeStyleManager } from "../managers/theme-style-manager";
import { TypographyManager } from "../managers/typography-manager";
import { ComponentVariantType } from "../types/mappings/component-variants";
import { ComponentThemeRegistry } from "../registry/component-theme-registry";
import { ThemeRegistry } from "../registry/theme-registry";
import { ThemeTransformationManager } from "../managers/theme-transformation-manager";
import CssVariableManager from "../managers/css-variable-manager";

// Modified ThemeCore class with proper initialization and error handling

export class ThemeCore {
  private static instance: ThemeCore;

  private stateManager: ThemeStateManager | null = null;
  private styleManager: ThemeStyleManager;
  private typographyManager: TypographyManager;
  private componentManager: ComponentManager;
  private componentRegistryManager: ComponentRegistryManager;
  private transformationManager: ThemeTransformationManager;
  private initialized: boolean = false;

  // Add registry properties with proper typing
  private themeRegistry: ThemeRegistry | null = null;
  private componentRegistry: ComponentThemeRegistry | null = null;
  private cssVariableManager: CssVariableManager;

  /**
   * Private constructor to enforce singleton pattern
   * Initializes all required managers and services
   */
  private constructor() {
    // Initialize everything except stateManager
    this.componentRegistryManager = new ComponentRegistryManager();
    this.componentRegistry = this.componentRegistryManager.getRegistry();
    this.componentManager = new ComponentManager(this.componentRegistry);

    // Initialize styling services
    const colorMapping = new ColorMapping();
    this.typographyManager = new TypographyManager();
    this.cssVariableManager = new CssVariableManager();

    // Create style manager with dependencies
    this.styleManager = new ThemeStyleManager(
      this.componentManager,
      this.componentRegistryManager,
      colorMapping,
      this.typographyManager,
      this.cssVariableManager,
    );

    // Create transformation manager with configuration
    this.transformationManager = new ThemeTransformationManager({
      defaultMode: "dark",
      shadeCount: 9,
      shadeIntensity: 0.1,
      contrastThreshold: 0.5,
    });

    // Set up registry for the transformation manager
    if (this.themeRegistry) {
      this.transformationManager.setRegistry(this.themeRegistry);
    }

    // DO NOT initialize state manager here to avoid circular dependency
    // The state manager will be connected later via connectStateManager()
  }

  // Method to connect the state manager after both are initialized
  connectStateManager(stateManager: ThemeStateManager): void {
    if (this.stateManager === stateManager) return; // Already connected

    this.stateManager = stateManager;

    // Subscribe to state changes
    this.stateManager.subscribe(() => this.handleThemeStateChange());

    // Initial theme application
    this.handleThemeStateChange();

    this.initialized = true;
    console.log("[ThemeCore] Successfully connected to state manager");
  }

  static getInstance(): ThemeCore {
    if (!ThemeCore.instance) {
      ThemeCore.instance = new ThemeCore();
    }
    return ThemeCore.instance;
  }

  // CRITICAL: Add safe methods that check for stateManager before using it

  initializeRegistries({
    themeRegistry,
    componentRegistry,
  }: {
    themeRegistry: ThemeRegistry;
    componentRegistry: ComponentThemeRegistry;
  }): void {
    this.themeRegistry = themeRegistry;
    this.componentRegistry = componentRegistry;

    // Register themes from the registry with the component registry manager
    if (themeRegistry && themeRegistry.themes) {
      Object.entries(themeRegistry.themes).forEach(([name, themeColors]) => {
        if (themeColors) {
          // Convert ThemeColors to Theme or handle differently
          this.registerThemeColors(name as ThemeName, themeColors);
        }
      });
    }

    // Set default theme if provided, but ONLY if stateManager is available
    if (themeRegistry && themeRegistry.defaults && this.stateManager) {
      const { themeName, mode } = themeRegistry.defaults;
      const selectedTheme = this.stateManager.getState().themeName;
      if (themeName && (!selectedTheme || selectedTheme === themeName)) {
        // Do not overwrite a query- or storage-selected theme with the registry default.
        void this.setColorScheme(themeName);
      }
      if (mode) {
        // Handle promise properly to avoid ESLint error
        void this.setMode(mode);
      }
    } else if (themeRegistry && themeRegistry.defaults) {
      console.warn(
        "[ThemeCore] Cannot set default theme/mode because state manager is not connected yet",
      );
    }

    // Log initialization
    console.log("[ThemeCore] Initialized with registries:", {
      themes: themeRegistry ? Object.keys(themeRegistry.themes || {}) : [],
      components: componentRegistry ? Object.keys(componentRegistry || {}) : [],
    });
  }

  // Add a new method to handle ThemeColors registration
  registerThemeColors(themeName: ThemeName, themeColors: ThemeColors): void {
    // Register with style manager directly
    this.styleManager.registerThemeColors(themeName, themeColors);
  }

  // Modify the existing registerTheme method to extract colors
  registerTheme(theme: Theme): void {
    this.componentRegistryManager.registerTheme(theme);
    this.styleManager.registerTheme(theme);

    // Update theme registry if available
    if (this.themeRegistry && "name" in theme) {
      // Make sure themes property exists
      if (!this.themeRegistry.themes) {
        this.themeRegistry.themes = {} as Record<ThemeName, ThemeColors>;
      }

      // Store only the ThemeColors part in the registry
      this.themeRegistry.themes[theme.name as ThemeName] = theme.colors;
    }
  }

  // Fix the setMode method to return a Promise and handle missing stateManager
  setMode(mode: ThemeMode): Promise<void> {
    if (!this.stateManager) {
      console.warn(
        "[ThemeCore] Cannot set mode because state manager is not connected yet",
      );
      return Promise.reject(new Error("State manager not connected yet"));
    }

    return this.stateManager.setMode(mode).catch((error) => {
      console.error("[ThemeCore] Error setting mode:", error);
      throw error;
    });
  }

  /**
   * Get the theme registry
   */
  getThemeRegistry(): ThemeRegistry {
    if (!this.themeRegistry) {
      throw new Error("[ThemeCore] Theme registry not initialized");
    }
    return this.themeRegistry;
  }

  private applyVariablesToDOM(
    variables: Record<string, string | ColorDefinition>,
  ): void {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    Object.entries(variables).forEach(([key, value]) => {
      if (typeof value === "string") {
        root.style.setProperty(`--${key}`, value);
      }
    });
  }

  // Public API with safe state manager access
  generateThemeVariables(
    mode: ThemeMode,
    colorScheme?: ThemeName,
  ): Record<string, string | ColorDefinition> {
    return this.styleManager.generateThemeVariables(
      mode,
      colorScheme ||
        (this.stateManager
          ? this.stateManager.getState().themeName
          : DEFAULT_THEME_NAME),
    );
  }

  getComponentStyle(
    component: string,
    variant: string = "default",
    state: string = "default",
  ): React.CSSProperties {
    const mode = this.stateManager ? this.stateManager.getState().mode : "dark";
    return this.styleManager.getComponentStyle(component, variant, state, mode);
  }

  getComponentTypography(
    component: string,
    variant: string = "default",
  ): TypographyScale {
    const mode = this.stateManager ? this.stateManager.getState().mode : "dark";
    const typography = this.typographyManager.getComponentTypography(
      component,
      variant,
      mode,
    );

    // Return with default values if typography is undefined
    return (
      typography || {
        fontSize: "1rem",
        lineHeight: 1.5,
        letterSpacing: "normal",
        fontWeight: 400,
        // Optional properties are not required
      }
    );
  }

  getTypographyForElement(element: string): TypographyScale {
    const mode = this.stateManager ? this.stateManager.getState().mode : "dark";
    const typography = this.typographyManager.getComponentTypography(
      element,
      "default",
      mode,
    );

    // Return with default values if typography is undefined
    return (
      typography || {
        fontSize: "1rem",
        lineHeight: 1.5,
        letterSpacing: "normal",
        fontWeight: 400,
      }
    );
  }

  // Expose state manager methods with Promise handling and safety checks
  setColorScheme(themeName: ThemeName): Promise<void> {
    if (!this.stateManager) {
      console.warn(
        "[ThemeCore] Cannot set color scheme because state manager is not connected yet",
      );
      return Promise.reject(new Error("State manager not connected yet"));
    }

    return this.stateManager.setThemeClasses(themeName).catch((error) => {
      console.error(
        `[ThemeCore] Error setting theme classes for "${themeName}":`,
        error,
      );
      throw error;
    });
  }

  setUseSystem(useSystem: boolean): Promise<void> {
    if (!this.stateManager) {
      console.warn(
        "[ThemeCore] Cannot set system mode usage because state manager is not connected yet",
      );
      return Promise.reject(new Error("State manager not connected yet"));
    }

    return this.stateManager.setUseSystem(useSystem).catch((error) => {
      console.error("[ThemeCore] Error setting system mode:", error);
      throw error;
    });
  }

  getState(): ThemeState {
    if (!this.stateManager) {
      throw new Error("[ThemeCore] State manager not connected yet");
    }
    return this.stateManager.getState();
  }

  subscribe(listener: () => void): () => void {
    if (!this.stateManager) {
      console.warn(
        "[ThemeCore] Cannot subscribe because state manager is not connected yet",
      );
      // Return a no-op unsubscribe function
      return () => {};
    }
    return this.stateManager.subscribe(listener);
  }

  // ComponentRegistryManager methods
  getComponentRegistry(): ComponentThemeRegistry {
    // Return the new componentRegistry if available, otherwise fall back to the old one
    return (
      this.componentRegistry || this.componentRegistryManager.getRegistry()
    );
  }

  // ComponentRegistryManager methods
  getStyleManager(): ThemeStyleManager {
    return this.styleManager;
  }

  /**
   * Get a specific theme by name from the registry
   */
  getTheme(themeName: ThemeName): Theme | undefined {
    // First try to reconstruct a full Theme from ThemeColors
    if (
      this.themeRegistry &&
      this.themeRegistry.themes &&
      this.themeRegistry.themes[themeName]
    ) {
      // Get the ThemeColors from the registry
      const themeColors = this.themeRegistry.themes[themeName];

      // Check if we can get a full Theme from the style manager
      const fullTheme = this.styleManager.getFullThemeFromColors(
        themeName,
        themeColors,
      );
      if (fullTheme) {
        return fullTheme;
      }
    }

    // Fall back to other methods if needed
    return undefined;
  }

  getComponentVariant(
    component: string,
    variant: string = "default",
  ): ComponentVariantType | undefined {
    // Try to get from the new registry first
    if (
      this.componentRegistry &&
      this.componentRegistry[component] &&
      this.componentRegistry[component][variant]
    ) {
      return this.componentRegistry[component][variant];
    }

    // Fall back to the component registry manager
    return this.componentRegistryManager.getVariant(component, variant);
  }

  // ThemeStateManager methods with safety checks
  isThemeCached(scheme: ThemeName): boolean {
    // Check if we have the theme colors in the registry
    if (
      this.themeRegistry &&
      this.themeRegistry.themes &&
      this.themeRegistry.themes[scheme]
    ) {
      return true;
    }

    // Fall back to state manager if available
    return this.stateManager ? this.stateManager.isThemeCached(scheme) : false;
  }

  preloadTheme(
    scheme: ThemeName,
    _config?: Partial<ThemeAcquisitionConfig>,
  ): Promise<void> {
    if (!this.stateManager) {
      console.warn(
        "[ThemeCore] Cannot preload theme because state manager is not connected yet",
      );
      return Promise.reject(new Error("State manager not connected yet"));
    }

    return this.stateManager.preloadTheme(scheme);
  }

  clearThemeCache(): void {
    if (this.stateManager) {
      this.stateManager.clearThemeCache();
    }

    // Also clear the registry if available
    if (this.themeRegistry) {
      this.themeRegistry.themes = {} as Record<ThemeName, ThemeColors>;
    }
  }

  getCacheStatus(): { size: number; schemes: ThemeName[] } {
    // Get schemes from registry
    const registrySchemes =
      this.themeRegistry && this.themeRegistry.themes
        ? (Object.keys(this.themeRegistry.themes) as ThemeName[])
        : [];

    // Get schemes from state manager if available
    const stateManagerSchemes = this.stateManager
      ? ((this.stateManager.getCacheStatus().schemes || []) as ThemeName[])
      : [];

    // Combine and deduplicate schemes
    const allSchemes = [
      ...new Set([...registrySchemes, ...stateManagerSchemes]),
    ];

    return {
      size: allSchemes.length,
      schemes: allSchemes,
    };
  }

  // ThemeComponentManager methods with safety checks
  getThemeClasses(themeName: ThemeName): Record<string, string> {
    const mode = this.stateManager ? this.stateManager.getState().mode : "dark";
    return this.styleManager.generateThemeClasses(mode, themeName);
  }

  getAllComponentVariants(): ComponentThemeRegistry {
    // Return the new registry if available, otherwise fall back to the old one
    return (
      this.componentRegistry || this.componentManager.getAllComponentVariants()
    );
  }

  // TypographyManager methods
  getTypographyScale(element: string): TypographyScale {
    const typography = this.typographyManager.getComponentTypography(element);

    // Return with default values if typography is undefined
    return (
      typography || {
        fontSize: "1rem",
        lineHeight: 1.5,
        letterSpacing: "normal",
        fontWeight: 400,
      }
    );
  }

  setComponentTypography(
    component: string,
    variant: string,
    typography: TypographyScale,
  ): void {
    this.typographyManager.setComponentTypography(
      component,
      variant,
      typography,
    );
  }

  /**
   * Configure storage options for theme persistence
   */
  setStorageOptions(options: StorageOptions): Promise<void> {
    if (!this.stateManager) {
      console.warn(
        "[ThemeCore] Cannot set storage options because state manager is not connected yet",
      );
      return Promise.reject(new Error("State manager not connected yet"));
    }

    // Pass the options to the state manager if it supports them
    if (typeof this.stateManager.setStorageOptions === "function") {
      try {
        return this.stateManager
          .setStorageOptions(options)
          .then(() => {
            console.log(
              "[ThemeCore] Storage options configured:",
              options.provider || "default",
            );
          })
          .catch((error) => {
            console.error(
              "[ThemeCore] Error configuring storage options:",
              error,
            );
            throw error;
          });
      } catch (error) {
        console.error("[ThemeCore] Error configuring storage options:", error);
        return Promise.reject(error);
      }
    }

    console.warn("[ThemeCore] State manager does not support storage options");
    return Promise.resolve();
  }

  /**
   * Configure transition options for theme changes
   */
  setTransitionOptions(options: TransitionOptions): Promise<void> {
    // Store the transition options
    this._transitionOptions = options;

    // Apply transition styles if enabled
    if (options.enabled !== false && typeof window !== "undefined") {
      try {
        this.applyTransitionStyles(options);
        console.log(
          "[ThemeCore] Transition options configured:",
          options.duration || "default",
        );
        return Promise.resolve();
      } catch (error) {
        console.error(
          "[ThemeCore] Error configuring transition options:",
          error,
        );
        return Promise.reject(error);
      }
    }

    if (options.enabled === false) {
      this.removeTransitionStyles();
    }

    return Promise.resolve();
  }

  // Add this property to store transition options
  private _transitionOptions: TransitionOptions = {
    duration: 200,
    easing: "ease",
    properties: ["color", "background-color", "border-color", "box-shadow"],
    enabled: true,
  };

  // Add these helper methods for transition handling
  private applyTransitionStyles(
    options: TransitionOptions = this._transitionOptions,
  ): void {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const duration = options.duration || 200;
    const easing = options.easing || "ease";
    const properties = options.properties || [
      "color",
      "background-color",
      "border-color",
      "box-shadow",
    ];

    // Apply transition CSS variable
    root.style.setProperty("--theme-transition-duration", `${duration}ms`);
    root.style.setProperty("--theme-transition-easing", easing);

    // Apply the transition to the root element
    const transitionValue = properties
      .map(
        (prop) =>
          `${prop} var(--theme-transition-duration) var(--theme-transition-easing)`,
      )
      .join(", ");

    root.style.setProperty("transition", transitionValue);
  }

  private removeTransitionStyles(): void {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    root.style.removeProperty("transition");
    root.style.removeProperty("--theme-transition-duration");
    root.style.removeProperty("--theme-transition-easing");
  }

  /**
   * Check if theme core is fully initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.stateManager !== null;
  }

  private handleThemeStateChange(): void {
    if (!this.stateManager) return;

    try {
      const state = this.stateManager.getState();

      // Generate and apply CSS variables based on current state
      const variables = this.styleManager.generateThemeVariables(state.mode);

      // Apply variables to CSS custom properties
      this.applyVariablesToDOM(variables);
    } catch (error) {
      console.error("[ThemeCore] Error handling theme state change:", error);
    }
  }
}

// Export the class for explicit getInstance() calls
// Do NOT export a singleton instance to avoid circular dependency issues during module initialization
