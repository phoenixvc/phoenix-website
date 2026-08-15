// theme/providers/ThemeProvider.tsx
import React, { useCallback, useMemo } from "react";
import {
  CssVariableConfig,
  ThemeAcquisitionConfig,
  ThemeContext,
  ThemeContextType,
  ThemeName,
  ThemeProviderProps,
} from "@/theme/types";
import { ThemeErrorBoundary } from "@/theme/components/theme-error-boundary";
import { SystemModeProvider, useSystemModeContext } from "@/SystemModeContext";
import { ExtendedThemeState } from "../types/context/state";
import { TypographyScale } from "../mappings";
import { createThemeRegistry } from "@/theme/registry/theme-registry";
import { ThemeAcquisitionManager } from "../managers/theme-acquisition-manager";
import { useCssVariables } from "../hooks/useCssVariables";
import { useThemeRegistryInit } from "../hooks/useThemeRegistryInit";
import { useThemeDomEffect } from "../hooks/useThemeDomEffect";
import { useThemeSync } from "../hooks/useThemeSync";
import {
  getThemeClassNames,
  getSpecificClass,
  isThemeClass,
  replaceThemeClasses,
  getAllThemeClasses,
} from "./ThemeProviderUtils";
import { logger } from "@/utils/logger";

const ThemeProviderCore: React.FC<ThemeProviderProps> = ({
  children,
  config = {},
  className,
  onThemeChange,
  componentRegistry = {},
  themeRegistry = {},
}) => {
  const { systemMode } = useSystemModeContext();
  const { getCssVariable } = useCssVariables();

  const { themeCore, themes, setThemes, components, themeManagerReady } =
    useThemeRegistryInit(
      themeRegistry,
      componentRegistry,
      config,
      (error) => logger.error("[ThemeProvider] Registry init error:", error),
    );

  const {
    state,
    loadingTheme,
    isThemeCached,
    setMode,
    setUseSystemMode,
    setThemeClasses,
    resetTheme,
  } = useThemeSync({ themeCore, themes, themeManagerReady, config, onThemeChange });

  useThemeDomEffect(state.themeName, state.mode, themes);

  const toggleMode = useCallback((): void => {
    setMode(state.mode === "light" ? "dark" : "light");
  }, [state.mode, setMode]);

  const toggleUseSystem = useCallback((): void => {
    setUseSystemMode(!state.useSystem);
  }, [state.useSystem, setUseSystemMode]);

  const getComputedThemeStyles = useCallback((): CSSStyleDeclaration => {
    return getComputedStyle(document.documentElement);
  }, []);

  const isThemeSupported = useCallback(
    (themeName: ThemeName): boolean => {
      if (themes && themes.themes && themes.themes[themeName]) {
        return true;
      }

      const registry = themeCore.getComponentRegistry();
      return Object.keys(registry).includes(themeName);
    },
    [themes, themeCore],
  );

  const isThemeLoading = useCallback((): boolean => {
    return loadingTheme;
  }, [loadingTheme]);

  const preloadThemeHandler = useCallback(
    async (
      themeName: ThemeName,
      preloadConfig?: Partial<ThemeAcquisitionConfig>,
    ): Promise<void> => {
      try {
        if (themes && themes.themes && themes.themes[themeName]) {
          return;
        }

        if (typeof themeCore.preloadTheme === "function") {
          await themeCore.preloadTheme(themeName, preloadConfig);
        } else {
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
    setThemes(createThemeRegistry(themeRegistry));
  }, [themeRegistry, themeCore, setThemes]);

  const getCacheStatus = useCallback((): {
    size: number;
    schemes: ThemeName[];
  } => {
    const themesCached =
      themes && themes.themes
        ? (Object.keys(themes.themes) as ThemeName[])
        : [];
    const coreStatus = themeCore.getCacheStatus();
    const allSchemes = [...new Set([...themesCached, ...coreStatus.schemes])];

    return { size: allSchemes.length, schemes: allSchemes };
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
        return themeCore.getComponentTypography(component, variant || "default");
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

  const contextValue = useMemo(
    (): ThemeContextType => ({
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

      isThemeLoading,

      isThemeCached,
      preloadTheme: preloadThemeHandler,
      clearThemeCache,
      getCacheStatus,

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

      typography,

      getComponentStyle,

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
        className={[
          className || "",
          themeManagerReady
            ? `${getThemeClassNames(state.themeName).base} ${getThemeClassNames(state.themeName)[state.mode]}`
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
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

/**
 * Public ThemeProvider — wraps ThemeProviderCore in the error boundary and
 * system-mode context it needs. All registry bootstrapping, DOM effects, and
 * state synchronization live in useThemeRegistryInit/useThemeDomEffect/
 * useThemeSync, keeping this component to composition and context wiring.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = (props) => (
  <ThemeErrorBoundary>
    <SystemModeProvider>
      <ThemeProviderCore {...props} />
    </SystemModeProvider>
  </ThemeErrorBoundary>
);
