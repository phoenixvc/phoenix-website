// theme/providers/ThemeProvider.tsx
import React, { useEffect } from "react";
import {
  StorageOptions,
  ThemeProviderProps,
  ThemeStorage,
} from "@/theme/types";
import { ThemeErrorBoundary } from "@/theme/components/theme-error-boundary";
import { SystemModeProvider } from "@/SystemModeContext";
import ThemeProviderInner from "./ThemeProviderInner";
import { createThemeRegistry } from "@/theme/registry/theme-registry";
import { ThemeCore } from "@/theme/core/theme-core";
import { ThemeStateManager } from "../core";
import { ThemeAcquisitionManager } from "../managers/theme-acquisition-manager";
// Add this function to ThemeProvider.tsx or create a utility file

/**
 * Convert ThemeStorage configuration to StorageOptions
 * @param themeStorage Partial ThemeStorage configuration
 * @returns StorageOptions compatible with ThemeCore
 */
function convertThemeStorageToOptions(
  themeStorage?: Partial<ThemeStorage>,
): StorageOptions | undefined {
  if (!themeStorage) return undefined;

  const options: StorageOptions = {};

  // Map storage type to provider
  if (themeStorage.type) {
    options.provider = themeStorage.type;
  }

  // Map prefix to key
  if (themeStorage.prefix) {
    options.key = themeStorage.prefix;
  }

  // If custom provider is needed, it would need to be passed separately
  // as ThemeStorage doesn't have a direct equivalent

  return options;
}

// Main ThemeProvider that wraps SystemModeProvider
export const ThemeProvider: React.FC<ThemeProviderProps> = (props) => {
  const {
    themeRegistry = {},
    componentRegistry = {},
    config,
    ...restProps
  } = props;

  // Initialize the theme system when the provider mounts
  useEffect(() => {
    // Get the singleton instances
    const themeCore = ThemeCore.getInstance();
    const themeStateManager = ThemeStateManager.getInstance();

    // Create the registries
    const fullThemeRegistry = createThemeRegistry(themeRegistry);
    ThemeAcquisitionManager.getInstance().setThemeRegistry(fullThemeRegistry);

    // Initialize the theme core with the registries
    themeCore.initializeRegistries({
      themeRegistry: fullThemeRegistry,
      componentRegistry: componentRegistry || {},
    });

    // Connect ThemeCore and ThemeStateManager to resolve circular dependency
    if (!themeCore.isInitialized()) {
      try {
        // Connect the state manager to the core
        themeCore.connectStateManager(themeStateManager);

        // Apply configuration if provided
        if (config) {
          if (config.defaultThemeName) {
            // Handle potential promises
            void themeCore
              .setColorScheme(config.defaultThemeName)
              .catch((err) =>
                console.error(
                  "[ThemeProvider] Error setting color scheme:",
                  err,
                ),
              );
          }
          if (config.defaultMode) {
            void themeCore
              .setMode(config.defaultMode)
              .catch((err) =>
                console.error("[ThemeProvider] Error setting mode:", err),
              );
          }
          if (config.useSystem !== undefined) {
            void themeCore
              .setUseSystem(config.useSystem)
              .catch((err) =>
                console.error(
                  "[ThemeProvider] Error setting system mode:",
                  err,
                ),
              );
          }
          if (config.storage) {
            const storageOptions = convertThemeStorageToOptions(config.storage);
            if (storageOptions) {
              void themeCore
                .setStorageOptions(storageOptions)
                .catch((err) =>
                  console.error(
                    "[ThemeProvider] Error setting storage options:",
                    err,
                  ),
                );
            }
          }
          if (config.transition) {
            void themeCore
              .setTransitionOptions(config.transition)
              .catch((err) =>
                console.error(
                  "[ThemeProvider] Error setting transition options:",
                  err,
                ),
              );
          }
        }

        console.log("[ThemeProvider] Theme system initialized successfully");
      } catch (error) {
        console.error(
          "[ThemeProvider] Failed to initialize theme system:",
          error,
        );
      }
    }

    // Return cleanup function
    return (): void => {
      // Optional: Perform any cleanup if needed when ThemeProvider unmounts
    };
  }, [themeRegistry, componentRegistry, config]);

  return (
    <ThemeErrorBoundary>
      <SystemModeProvider>
        <ThemeProviderInner {...restProps} />
      </SystemModeProvider>
    </ThemeErrorBoundary>
  );
};
