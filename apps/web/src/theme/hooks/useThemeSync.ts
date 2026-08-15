// theme/hooks/useThemeSync.ts
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ThemeInitOptions,
  ThemeChangeEvent,
  ThemeMode,
  ThemeName,
  ThemeState,
} from "@/theme/types";
import { ThemeConfigValidation } from "@/theme/validation";
import { ThemeCore } from "@/theme/core/theme-core";
import { ThemeStateManager } from "@/theme/core";
import { ThemeAcquisitionManager } from "@/theme/managers/theme-acquisition-manager";
import { ThemeCacheService } from "@/theme/services/theme-cache-service";
import { ThemeRegistry } from "@/theme/registry/theme-registry";
import {
  generateSchemeSemantics,
  generateThemeVariables,
} from "@/theme/providers/theme-variables";
import { useSystemModeContext } from "@/SystemModeContext";
import { useCssVariables } from "./useCssVariables";
import { DEFAULT_THEME_NAME } from "@/theme/constants/themes/catalog";
import { logger } from "@/utils/logger";

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

export interface UseThemeSyncParams {
  themeCore: ThemeCore;
  themes: ThemeRegistry;
  themeManagerReady: boolean;
  config?: ThemeInitOptions;
  onThemeChange?: (event: ThemeChangeEvent) => void;
}

export interface UseThemeSyncResult {
  state: ThemeState;
  error: Error | null;
  setError: Dispatch<SetStateAction<Error | null>>;
  loadingTheme: boolean;
  isThemeCached: (scheme: ThemeName) => boolean;
  setMode: (mode: ThemeMode) => void;
  setUseSystemMode: (useSystem: boolean) => void;
  setThemeClasses: (themeName: ThemeName) => void;
  resetTheme: () => Promise<void>;
}

/**
 * Owns the provider's ThemeState and every operation that mutates it
 * (setMode/setUseSystemMode/setThemeClasses/resetTheme), plus the effects
 * that keep it in sync with ThemeStateManager, the OS color scheme
 * preference, and the acquisition of theme data that isn't in the registry.
 */
export function useThemeSync({
  themeCore,
  themes,
  themeManagerReady,
  config = {},
  onThemeChange,
}: UseThemeSyncParams): UseThemeSyncResult {
  const {
    systemMode,
    useSystemMode,
    setUseSystemMode: setUseSystemModeContext,
  } = useSystemModeContext();
  const { applyCssVariables } = useCssVariables();

  const [state, setState] = useState<ThemeState>(() => {
    try {
      const stateManager = ThemeStateManager.getInstance();
      const current = stateManager.getState();
      return {
        ...defaultState,
        ...config,
        ...current,
        themeName:
          current.themeName ||
          config.defaultThemeName ||
          defaultState.themeName,
        mode: current.mode || config.defaultMode || defaultState.mode,
      };
    } catch {
      return {
        ...defaultState,
        ...config,
        themeName: config.defaultThemeName ?? defaultState.themeName,
        mode: config.defaultMode ?? defaultState.mode,
      };
    }
  });
  const [error, setError] = useState<Error | null>(null);
  const [loadingTheme, setLoadingTheme] = useState<boolean>(false);

  const setMode = useCallback(
    (mode: ThemeMode): void => {
      if (mode === state.mode) {
        return;
      }

      if (!themeManagerReady) {
        logger.warn(
          "[ThemeProvider] Theme manager not ready, updating mode directly in state",
        );
        setState((prev) => ({
          ...prev,
          mode,
          previous: { themeName: prev.themeName, mode: prev.mode },
          initialized: false,
          timestamp: Date.now(),
        }));
        return;
      }

      themeCore
        .setMode(mode)
        .then(() => {
          setState((prev) => {
            if (prev.mode === mode) {
              return prev;
            }

            return {
              ...prev,
              mode,
              previous: { themeName: prev.themeName, mode: prev.mode },
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
          setState((prev) => ({
            ...prev,
            mode,
            previous: { themeName: prev.themeName, mode: prev.mode },
            timestamp: Date.now(),
          }));
        });
    },
    [state.themeName, state.mode, onThemeChange, themeManagerReady, themeCore],
  );

  const setUseSystemMode = useCallback(
    (useSystem: boolean): void => {
      setUseSystemModeContext(useSystem);

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

  const isThemeCached = useCallback(
    (scheme: ThemeName): boolean => {
      if (themes && themes.themes && themes.themes[scheme]) {
        return true;
      }
      return ThemeCacheService.getInstance().has(scheme);
    },
    [themes],
  );

  const setThemeClasses = useCallback(
    (themeName: ThemeName): void => {
      if (themeName === state.themeName) {
        return;
      }

      if (!themeManagerReady) {
        logger.warn(
          "[ThemeProvider] Cannot set theme classes because theme manager is not ready yet",
        );
        setState((prev) => ({
          ...prev,
          themeName: themeName,
          previous: { themeName: prev.themeName, mode: prev.mode },
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
              previous: { themeName: prev.themeName, mode: prev.mode },
              timestamp: Date.now(),
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

  const resetTheme = useCallback(async (): Promise<void> => {
    try {
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
        previous: { themeName: state.themeName, mode: state.mode },
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

  // Sync local state with ThemeStateManager's external state
  useEffect(() => {
    if (!themeManagerReady) return;

    const stateManager = ThemeStateManager.getInstance();
    const syncState = (): void => {
      const storedState = stateManager.getState();
      setState((prev) => {
        let changed = false;
        const updates: Partial<ThemeState> = {};

        if (storedState.themeName && storedState.themeName !== prev.themeName) {
          updates.themeName = storedState.themeName;
          changed = true;
        }

        if (storedState.mode && storedState.mode !== prev.mode) {
          updates.mode = storedState.mode;
          changed = true;
        }

        if (
          storedState.useSystem !== undefined &&
          storedState.useSystem !== prev.useSystem
        ) {
          updates.useSystem = storedState.useSystem;
          changed = true;
        }

        if (changed) {
          return { ...prev, ...updates, initialized: false };
        }
        return prev;
      });
    };

    syncState();
    return stateManager.subscribe(syncState);
  }, [themeManagerReady]);

  // Sync system mode with theme state
  useEffect(() => {
    if (!themeManagerReady) return;

    if (state.useSystem && systemMode !== state.mode) {
      setMode(systemMode);
    }
  }, [systemMode, state.useSystem, state.mode, setMode, themeManagerReady]);

  // Sync useSystem preference with context
  useEffect(() => {
    if (useSystemMode !== state.useSystem) {
      setUseSystemModeContext(state.useSystem);
    }
  }, [state.useSystem, setUseSystemModeContext, useSystemMode]);

  // Validate provider configuration
  useEffect(() => {
    const validationResult = ThemeConfigValidation.validateThemeConfig(config);
    if (!validationResult.isValid) {
      const firstError = validationResult.errors?.[0];
      setError(new Error(`${firstError.code}: ${firstError.message}`));
    }
  }, [config]);

  // Load/acquire theme data not yet present in the registry and mark
  // initialization complete
  useEffect(() => {
    if (!themeManagerReady) return;

    const initializeTheme = async (): Promise<void> => {
      try {
        logger.debug("[ThemeProvider] Starting theme initialization...");

        setLoadingTheme(true);

        let themeData = null;
        // Only themes acquired outside the registry need CSS variables
        // applied here — useThemeDomEffect's layout effect already applies
        // them synchronously for any theme already in `themes.themes`.
        let needsCssVariables = false;
        if (themes && themes.themes && themes.themes[state.themeName]) {
          themeData = themes.themes[state.themeName];
          logger.debug("[ThemeProvider] Using theme from registry");
        } else {
          const theme = await ThemeAcquisitionManager.getInstance().acquireTheme(
            state.themeName,
          );
          logger.debug("[ThemeProvider] Loaded theme from acquisition manager");

          if (theme.status === "success" && theme.data) {
            themeData = theme.data;
            needsCssVariables = true;
          }
        }

        if (themeData) {
          const _semantics = generateSchemeSemantics(themeData, state.mode);
          logger.debug("[ThemeProvider] Generated semantics");

          if (needsCssVariables) {
            const variables = generateThemeVariables(themeData, state.mode);
            logger.debug("[ThemeProvider] Generated variables");
            applyCssVariables(variables.computed);
          }

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

  return {
    state,
    error,
    setError,
    loadingTheme,
    isThemeCached,
    setMode,
    setUseSystemMode,
    setThemeClasses,
    resetTheme,
  };
}
