// theme/providers/ThemeProviderInner.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
} from "react";
import { useCssVariables } from "../hooks/useCssVariables";
import {
  ThemeName,
  ThemeMode,
  ThemeState,
  ThemeContextType,
  ThemeProviderProps,
  CssVariableConfig,
  ThemeContext,
  ThemeAcquisitionConfig,
} from "@/theme/types";
import { ThemeConfigValidation } from "../validation";
import { generateSchemeSemantics, generateThemeVariables } from ".";
import { ExtendedThemeState } from "../types/context/state";
import { TypographyScale } from "../mappings";
import { ThemeCore } from "../core/theme-core";
import { useSystemModeContext } from "@/SystemModeContext";
import {
  getThemeClassNames,
  getSpecificClass,
  isThemeClass,
  replaceThemeClasses,
  getAllThemeClasses,
} from "./ThemeProviderUtils";
import { registerDefaultComponents } from "../utils/register-default-components";
import { ThemeAcquisitionManager } from "../managers/theme-acquisition-manager";
import { ThemeCacheService } from "../services/theme-cache-service";
import { createThemeRegistry } from "../registry/theme-registry";
import { createComponentRegistry } from "../registry/component-theme-registry";
import { ThemeStateManager } from "../core";
import { logger } from "@/utils/logger";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";

const defaultState: ThemeState = {
  name: "Default Theme",
  themeName: DEFAULT_THEME_NAME,
  mode: "dark",
  useSystem: false,
  systemMode: "light",
  initialized: false,
  timestamp: Date.now(),
  direction: "ltr",
  version: "1.0.0",
  previous: {
    themeName: DEFAULT_THEME_NAME,
    mode: "light",
  },
};

const ThemeProviderInner: React.FC<ThemeProviderProps> = ({
  children,
  config = {},
  className,
  onThemeChange,
  componentRegistry = {},
  themeRegistry = {},
}) => {
  // Get singleton instances once
  const themeCore = useMemo(() => ThemeCore.getInstance(), []);

  const [state, setState] = useState<ThemeState>({
    ...defaultState,
    ...config,
    themeName: config.defaultThemeName ?? defaultState.themeName,
    mode: config.defaultMode ?? defaultState.mode,
  });
  const [error, setError] = useState<Error | null>(null);
  const [loadingTheme, setLoadingTheme] = useState<boolean>(false);
  const [themeManagerReady, setThemeManagerReady] = useState<boolean>(false);

  // Initialize registries
  const [themes, setThemes] = useState(() =>
    createThemeRegistry(themeRegistry),
  );
  const [components, _setComponents] = useState(() =>
    createComponentRegistry(componentRegistry),
  );

  // Acquisition is a singleton used by ThemeStateManager. Give it the same
  // registry before passive initialization effects can request a theme.
  useLayoutEffect(() => {
    ThemeAcquisitionManager.getInstance().setThemeRegistry(themes);
  }, [themes]);

  // Get systemMode from context instead of using useSystemMode hook
  const {
    systemMode,
    useSystemMode,
    setUseSystemMode: setUseSystemModeContext,
  } = useSystemModeContext();
  const { applyCssVariables, getCssVariable } = useCssVariables();

  // Define callbacks before useEffect hooks to avoid TDZ errors
  const setMode = useCallback(
    (mode: ThemeMode): void => {
      // Don't update if the mode hasn't changed
      if (mode === state.mode) {
        return;
      }

      // If theme manager is not ready, update state directly as fallback
      if (!themeManagerReady) {
        logger.warn(
          "[ThemeProvider] Theme manager not ready, updating mode directly in state",
        );
        setState((prev) => ({
          ...prev,
          mode,
          previous: {
            themeName: prev.themeName,
            mode: prev.mode,
          },
          initialized: false,
          timestamp: Date.now(),
        }));
        return;
      }

      themeCore
        .setMode(mode)
        .then(() => {
          setState((prev) => {
            // Prevent unnecessary updates if the mode hasn't changed
            if (prev.mode === mode) {
              return prev;
            }

            return {
              ...prev,
              mode,
              previous: {
                themeName: prev.themeName,
                mode: prev.mode,
              },
              initialized: false,
              timestamp: Date.now(),
            };
          });

          if (onThemeChange) {
            onThemeChange({
              currentThemeName: state.themeName,
              currentMode: mode,
              previousThemeName: state.themeName,
              previousMode: state.mode,
              source: "user",
            });
          }
        })
        .catch((err) => {
          logger.error(`Failed to set mode "${mode}":`, err);
          // Fall back to direct state update on error
          setState((prev) => ({
            ...prev,
            mode,
            previous: {
              themeName: prev.themeName,
              mode: prev.mode,
            },
            timestamp: Date.now(),
          }));
        });
    },
    [state.themeName, state.mode, onThemeChange, themeManagerReady, themeCore],
  );

  const setUseSystemMode = useCallback(
    (useSystem: boolean): void => {
      // Update both local state and context
      setUseSystemModeContext(useSystem);

      // Use themeCore to set system mode usage
      themeCore
        .setUseSystem(useSystem)
        .then(() => {
          setState((prev) => ({
            ...prev,
            useSystem,
            timestamp: Date.now(),
          }));

          if (useSystem && systemMode !== state.mode) {
            if (onThemeChange) {
              onThemeChange({
                currentThemeName: state.themeName,
                currentMode: systemMode,
                previousThemeName: state.themeName,
                previousMode: state.mode,
                source: "system",
              });
            }

            // If using system mode, update the theme mode to match system
            setMode(systemMode);
          }
        })
        .catch((err) => {
          logger.error(`Failed to set use system mode "${useSystem}":`, err);
        });
    },
    [
      setUseSystemModeContext,
      systemMode,
      state.themeName,
      state.mode,
      onThemeChange,
      setMode,
      themeCore,
    ],
  );

  // Initialize ThemeStateManager first
  useEffect(() => {
    // Create a local state manager
    try {
      const stateManager = ThemeStateManager.getInstance();

      // Connect it to the ThemeCore
      themeCore.connectStateManager(stateManager);

      // Mark as ready
      setThemeManagerReady(true);
      logger.debug(
        "[ThemeProvider] Successfully connected state manager to theme core",
      );
    } catch (error) {
      logger.error(
        "[ThemeProvider] Failed to initialize state manager:",
        error,
      );
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to initialize state manager"),
      );
    }
  }, [themeCore]);

  // Initialize ThemeCore with registries only after state manager is ready
  useEffect(() => {
    if (!themeManagerReady) return;

    try {
      // Check if initializeRegistries method exists on themeCore
      if (typeof themeCore.initializeRegistries === "function") {
        // Use the new method if available
        themeCore.initializeRegistries({
          themeRegistry: themes,
          componentRegistry: components,
        });
      } else {
        // Fall back to the old initialize method if needed
        logger.warn(
          "[ThemeProvider] Using legacy initialization method. Please update ThemeCore.",
        );

        // Register themes from the registry with the component registry manager
        if (themes && themes.themes) {
          Object.entries(themes.themes).forEach(([name, theme]) => {
            if (theme) {
              themeCore.registerThemeColors(name as ThemeName, theme);
            }
          });
        }
      }

      // Register default components if needed
      registerDefaultComponents();

      logger.debug(
        "[ThemeProvider] Successfully initialized theme system with registries",
      );
    } catch (error) {
      logger.error("[ThemeProvider] Failed to initialize theme system:", error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to initialize theme system"),
      );
    }
  }, [themes, components, themeManagerReady, themeCore]);

  // Effect to load stored theme settings from localStorage on mount
  useEffect(() => {
    if (!themeManagerReady) return;

    // Small delay to ensure ThemeStateManager's async initialization has completed
    const timeoutId = setTimeout(() => {
      try {
        // Get the state manager's current state which includes localStorage values
        const stateManager = ThemeStateManager.getInstance();
        const storedState = stateManager.getState();

        logger.debug(
          "[ThemeProvider] Loading stored theme settings:",
          storedState,
        );

        // Update React state with stored values if they differ
        setState((prev) => {
          const updates: Partial<ThemeState> = {};

          if (
            storedState.themeName &&
            storedState.themeName !== prev.themeName
          ) {
            updates.themeName = storedState.themeName;
          }

          if (storedState.mode && storedState.mode !== prev.mode) {
            updates.mode = storedState.mode;
          }

          if (
            storedState.useSystem !== undefined &&
            storedState.useSystem !== prev.useSystem
          ) {
            updates.useSystem = storedState.useSystem;
          }

          // Only update if there are actual changes
          if (Object.keys(updates).length > 0) {
            logger.debug("[ThemeProvider] Applying stored settings:", updates);
            return { ...prev, ...updates, initialized: false }; // Reset initialized to trigger re-init with new settings
          }

          return prev;
        });
      } catch (error) {
        logger.error(
          "[ThemeProvider] Failed to load stored theme settings:",
          error,
        );
      }
    }, 50); // Small delay for async initialization to complete

    return (): void => clearTimeout(timeoutId);
  }, [themeManagerReady]);

  // Effect to sync system mode with theme state - only when manager is ready
  useEffect(() => {
    if (!themeManagerReady) return;

    if (state.useSystem && systemMode !== state.mode) {
      setMode(systemMode);
    }
  }, [systemMode, state.useSystem, state.mode, setMode, themeManagerReady]);

  // Effect to sync useSystem preference with context
  useEffect(() => {
    if (useSystemMode !== state.useSystem) {
      setUseSystemModeContext(state.useSystem);
    }
  }, [state.useSystem, setUseSystemModeContext, useSystemMode]);

  useEffect(() => {
    const validationResult = ThemeConfigValidation.validateThemeConfig(config);
    if (!validationResult.isValid) {
      const firstError = validationResult.errors?.[0];
      setError(new Error(`${firstError.code}: ${firstError.message}`));
    }
  }, [config]);

  useEffect(() => {
    if (!themeManagerReady) return;

    const initializeTheme = async (): Promise<void> => {
      try {
        logger.debug("[ThemeProvider] Starting theme initialization...");

        setLoadingTheme(true);

        // Try to get theme from registry first
        let themeData = null;
        if (themes && themes.themes && themes.themes[state.themeName]) {
          themeData = themes.themes[state.themeName];
          logger.debug("[ThemeProvider] Using theme from registry");
        } else {
          // Fall back to acquisition manager if not in registry
          const theme =
            await ThemeAcquisitionManager.getInstance().acquireTheme(
              state.themeName,
            );
          logger.debug("[ThemeProvider] Loaded theme from acquisition manager");

          if (theme.status === "success" && theme.data) {
            themeData = theme.data;
          }
        }

        if (themeData) {
          const _semantics = generateSchemeSemantics(themeData, state.mode);
          logger.debug("[ThemeProvider] Generated semantics");

          const variables = generateThemeVariables(themeData, state.mode);
          logger.debug("[ThemeProvider] Generated variables");

          applyCssVariables(variables.computed);

          setState((prev) => ({ ...prev, initialized: true }));
        } else {
          throw new Error(
            `Theme "${state.themeName}" not found in registry or acquisition failed`,
          );
        }
      } catch (err) {
        logger.error("[ThemeProvider] Theme initialization failed:", err);
        setError(
          err instanceof Error ? err : new Error("Theme initialization failed"),
        );
      } finally {
        setLoadingTheme(false);
      }
    };

    if (!state.initialized && !error) {
      void initializeTheme();
    }
  }, [
    state.themeName,
    state.mode,
    state.initialized,
    error,
    applyCssVariables,
    themes,
    themeManagerReady,
  ]);

  const isThemeCached = useCallback(
    (scheme: ThemeName): boolean => {
      // Check both registry and cache service
      if (themes && themes.themes && themes.themes[scheme]) {
        return true;
      }
      return ThemeCacheService.getInstance().has(scheme);
    },
    [themes],
  );

  // Ensure getThemeState returns the correct type
  const getThemeState = useCallback((): ExtendedThemeState => {
    return {
      ...state,
      systemMode,
      previous: state.previous || {
        themeName: state.themeName,
        mode: state.mode,
      },
    };
  }, [state, systemMode]);

  // Modified setThemeClasses function with manager ready check
  const setThemeClasses = useCallback(
    (themeName: ThemeName): void => {
      if (themeName === state.themeName) {
        return;
      }

      if (!themeManagerReady) {
        logger.warn(
          "[ThemeProvider] Cannot set theme classes because theme manager is not ready yet",
        );
        // Update state directly as a fallback
        setState((prev) => ({
          ...prev,
          themeName: themeName,
          previous: {
            themeName: prev.themeName,
            mode: prev.mode,
          },
          timestamp: Date.now(),
        }));
        return;
      }

      if (!isThemeCached(themeName)) {
        setLoadingTheme(true);
      }

      themeCore
        .setColorScheme(themeName)
        .then(() => {
          setState((prev) => {
            if (prev.themeName === themeName) {
              return prev;
            }

            return {
              ...prev,
              themeName: themeName,
              previous: {
                themeName: prev.themeName,
                mode: prev.mode,
              },
              timestamp: Date.now(),
              // Don"t force re-initialization if not necessary
              initialized: isThemeCached(themeName),
            };
          });

          if (onThemeChange) {
            onThemeChange({
              currentThemeName: themeName,
              currentMode: state.mode,
              previousThemeName: state.themeName,
              previousMode: state.mode,
              source: "user",
            });
          }
        })
        .catch((err) => {
          logger.error(`Failed to load theme "${themeName}":`, err);
          setError(
            err instanceof Error
              ? err
              : new Error(`Failed to load theme "${themeName}"`),
          );
        })
        .finally(() => {
          // Only clear loading state if we set it earlier
          if (!isThemeCached(themeName)) {
            setLoadingTheme(false);
          }
        });
    },
    [
      state.themeName,
      state.mode,
      onThemeChange,
      isThemeCached,
      themeManagerReady,
      themeCore,
    ],
  );

  const toggleMode = useCallback((): void => {
    const newMode = state.mode === "light" ? "dark" : "light";
    setMode(newMode);
  }, [state.mode, setMode]);

  const toggleUseSystem = useCallback((): void => {
    setUseSystemMode(!state.useSystem);
  }, [state.useSystem, setUseSystemMode]);

  // Include the rest of the utility functions
  const getComputedThemeStyles = useCallback((): CSSStyleDeclaration => {
    return getComputedStyle(document.documentElement);
  }, []);

  const isThemeSupported = useCallback(
    (themeName: ThemeName): boolean => {
      // Check registry first
      if (themes && themes.themes && themes.themes[themeName]) {
        return true;
      }

      // Then check component registry
      const registry = themeCore.getComponentRegistry();
      return Object.keys(registry).includes(themeName);
    },
    [themes, themeCore],
  );

  // Theme loading status
  const isThemeLoading = useCallback((): boolean => {
    return loadingTheme;
  }, [loadingTheme]);

  // Theme cache utilities
  const preloadThemeHandler = useCallback(
    async (
      themeName: ThemeName,
      config?: Partial<ThemeAcquisitionConfig>,
    ): Promise<void> => {
      try {
        // Check if theme is in registry first
        if (themes && themes.themes && themes.themes[themeName]) {
          // Theme is already available in registry
          return;
        }

        // Use ThemeCore"s preloadTheme if available
        if (typeof themeCore.preloadTheme === "function") {
          await themeCore.preloadTheme(themeName, config);
        } else {
          // Fall back to acquisition manager
          await ThemeAcquisitionManager.getInstance().acquireTheme(themeName);
        }
      } catch (err) {
        logger.error(
          `[ThemeProvider] Failed to preload theme "${themeName}":`,
          err,
        );
        throw err;
      }
    },
    [themes, themeCore],
  );

  const clearThemeCache = useCallback((): void => {
    themeCore.clearThemeCache();

    // Also reset the registry to initial state
    setThemes(createThemeRegistry(themeRegistry));
  }, [themeRegistry, themeCore]);

  const getCacheStatus = useCallback((): {
    size: number;
    schemes: ThemeName[];
  } => {
    // Get schemes from both registry and ThemeCore
    const themesCached =
      themes && themes.themes
        ? (Object.keys(themes.themes) as ThemeName[])
        : [];
    const coreStatus = themeCore.getCacheStatus();

    // Combine and deduplicate
    const allSchemes = [...new Set([...themesCached, ...coreStatus.schemes])];

    return {
      size: allSchemes.length,
      schemes: allSchemes,
    };
  }, [themes, themeCore]);

  const typography = useMemo(
    () => ({
      getScale: (element: string): TypographyScale | undefined => {
        return themeCore.getTypographyScale(element);
      },
      getComponentTypography: (
        component: string,
        variant?: string,
        _mode?: string,
      ): TypographyScale | undefined => {
        return themeCore.getComponentTypography(
          component,
          variant || "default",
        );
      },
    }),
    [themeCore],
  );

  const getComponentStyle = useCallback(
    (
      component: string,
      variant?: string,
      state?: string,
      _mode?: string,
    ): React.CSSProperties => {
      return themeCore.getComponentStyle(component, variant, state);
    },
    [themeCore],
  );

  const resetTheme = useCallback(async (): Promise<void> => {
    try {
      // Get default theme from registry if available
      const defaultThemeName =
        themes && themes.defaults
          ? themes.defaults.themeName
          : defaultState.themeName;
      const defaultMode =
        themes && themes.defaults ? themes.defaults.mode : defaultState.mode;

      await themeCore.setColorScheme(defaultThemeName);
      await themeCore.setMode(defaultMode);

      setState({
        ...defaultState,
        themeName: defaultThemeName,
        mode: defaultMode,
        timestamp: Date.now(),
        previous: {
          themeName: state.themeName,
          mode: state.mode,
        },
      });

      if (onThemeChange) {
        onThemeChange({
          currentThemeName: defaultThemeName,
          currentMode: defaultMode,
          previousThemeName: state.themeName,
          previousMode: state.mode,
          source: "default",
        });
      }
    } catch (err) {
      logger.error("Failed to reset theme:", err);
    }
  }, [state.themeName, state.mode, onThemeChange, themes, themeCore]);

  const contextValue = useMemo(
    (): ThemeContextType => ({
      // Required properties
      themeName: state.themeName,
      themeMode: state.mode,
      systemMode,
      useSystemMode: state.useSystem,
      getThemeClassNames,
      getSpecificClass: (suffix): string =>
        getSpecificClass(state.themeName, suffix),
      replaceThemeClasses: (currentClasses, newScheme): string =>
        replaceThemeClasses(currentClasses, newScheme, state.mode),
      setTheme: setThemeClasses,
      setMode,
      toggleMode,
      setUseSystemMode,
      getCssVariable: (
        name: string,
        _config?: Partial<CssVariableConfig>,
      ): string => getCssVariable(name),
      getAllThemeClasses,
      isThemeClass,

      // Theme loading status
      isThemeLoading,

      // Theme cache utilities
      isThemeCached,
      preloadTheme: preloadThemeHandler,
      clearThemeCache,
      getCacheStatus,

      // Optional methods
      getComputedThemeStyles,
      isThemeSupported,
      getThemeState,
      resetTheme,
      subscribeToThemeChanges: (callback): (() => void) => {
        const observer = new MutationObserver(() => {
          callback(getThemeState());
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme", "data-mode"],
        });
        return (): void => observer.disconnect();
      },
      toggleUseSystem,

      // Typography support
      typography,

      // Component style support
      getComponentStyle,

      // Add registry access
      getThemeRegistry: () => themes,
      getComponentRegistry: () => components,
    }),
    [
      state,
      systemMode,
      getCssVariable,
      setThemeClasses,
      setMode,
      toggleMode,
      setUseSystemMode,
      isThemeLoading,
      isThemeCached,
      preloadThemeHandler,
      clearThemeCache,
      getCacheStatus,
      getComputedThemeStyles,
      isThemeSupported,
      getThemeState,
      resetTheme,
      toggleUseSystem,
      typography,
      getComponentStyle,
      themes,
      components,
    ],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <div
        className={`${className || ""} ${
          themeManagerReady
            ? `${getThemeClassNames(state.themeName).base} ${getThemeClassNames(state.themeName)[state.mode]}`
            : ""
        }`}
        data-theme={state.themeName}
        data-mode={state.mode}
        data-loading={loadingTheme || !themeManagerReady ? "true" : "false"}
        data-manager-ready={themeManagerReady ? "true" : "false"}
      >
        {(loadingTheme || !themeManagerReady) && (
          <div
            className="theme-loading-indicator"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background:
                "linear-gradient(to right, transparent, var(--color-primary-500), transparent)",
              zIndex: 9999,
            }}
          />
        )}
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export default ThemeProviderInner;
