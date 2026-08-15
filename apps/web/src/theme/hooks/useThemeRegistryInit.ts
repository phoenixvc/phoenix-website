// theme/hooks/useThemeRegistryInit.ts
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ThemeInitOptions,
  ThemeName,
  StorageOptions,
  ThemeStorage,
} from "@/theme/types";
import { ThemeCore } from "@/theme/core/theme-core";
import { ThemeStateManager } from "@/theme/core";
import { ThemeAcquisitionManager } from "@/theme/managers/theme-acquisition-manager";
import {
  ThemeRegistry,
  createThemeRegistry,
} from "@/theme/registry/theme-registry";
import {
  ComponentThemeRegistry,
  createComponentRegistry,
} from "@/theme/registry/component-theme-registry";
import { registerDefaultComponents } from "@/theme/utils/register-default-components";
import { logger } from "@/utils/logger";

/**
 * Convert ThemeStorage configuration to StorageOptions
 */
function convertThemeStorageToOptions(
  themeStorage?: Partial<ThemeStorage>,
): StorageOptions | undefined {
  if (!themeStorage) return undefined;

  const options: StorageOptions = {};

  if (themeStorage.type) {
    options.provider = themeStorage.type;
  }
  if (themeStorage.prefix) {
    options.key = themeStorage.prefix;
  }

  return options;
}

export interface UseThemeRegistryInitResult {
  themeCore: ThemeCore;
  themes: ThemeRegistry;
  setThemes: Dispatch<SetStateAction<ThemeRegistry>>;
  components: ComponentThemeRegistry;
  themeManagerReady: boolean;
}

/**
 * The single bootstrap path for the theme registries and the
 * ThemeCore/ThemeStateManager singletons — keep all registry/state-manager
 * connection logic here rather than splitting it across another effect, or
 * multiple ThemeProvider instances will race to connect the same singletons.
 */
export function useThemeRegistryInit(
  themeRegistry: Partial<ThemeRegistry> = {},
  componentRegistry: Partial<ComponentThemeRegistry> = {},
  config: ThemeInitOptions = {},
  onError?: (error: Error) => void,
): UseThemeRegistryInitResult {
  const themeCore = useMemo(() => ThemeCore.getInstance(), []);
  const [themeManagerReady, setThemeManagerReady] = useState(false);

  const [themes, setThemes] = useState(() =>
    createThemeRegistry(themeRegistry),
  );
  const [components] = useState(() => createComponentRegistry(componentRegistry));

  // Give the acquisition manager the current registry before any passive
  // initialization effect can request a theme.
  useLayoutEffect(() => {
    ThemeAcquisitionManager.getInstance().setThemeRegistry(themes);
  }, [themes]);

  // Connect the singleton state manager to the core and apply one-time
  // provider configuration (storage/transition options)
  useEffect(() => {
    try {
      if (!themeCore.isInitialized()) {
        const stateManager = ThemeStateManager.getInstance();
        themeCore.connectStateManager(stateManager);

        if (config.storage) {
          const storageOptions = convertThemeStorageToOptions(config.storage);
          if (storageOptions) {
            void themeCore
              .setStorageOptions(storageOptions)
              .catch((err) =>
                logger.error(
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
              logger.error(
                "[ThemeProvider] Error setting transition options:",
                err,
              ),
            );
        }

        logger.debug("[ThemeProvider] Theme system initialized successfully");
      }

      setThemeManagerReady(true);
    } catch (error) {
      logger.error(
        "[ThemeProvider] Failed to initialize state manager:",
        error,
      );
      onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to initialize state manager"),
      );
    }
    // config is provided fresh by the caller on every render; only the
    // presence of storage/transition matters for the one-time setup guarded
    // above by themeCore.isInitialized().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeCore]);

  // Initialize ThemeCore with the current registries once the state manager is ready
  useEffect(() => {
    if (!themeManagerReady) return;

    try {
      if (typeof themeCore.initializeRegistries === "function") {
        themeCore.initializeRegistries({
          themeRegistry: themes,
          componentRegistry: components,
        });
      } else {
        logger.warn(
          "[ThemeProvider] Using legacy initialization method. Please update ThemeCore.",
        );

        if (themes && themes.themes) {
          Object.entries(themes.themes).forEach(([name, theme]) => {
            if (theme) {
              themeCore.registerThemeColors(name as ThemeName, theme);
            }
          });
        }
      }

      registerDefaultComponents();

      logger.debug(
        "[ThemeProvider] Successfully initialized theme system with registries",
      );
    } catch (error) {
      logger.error("[ThemeProvider] Failed to initialize theme system:", error);
      onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to initialize theme system"),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes, components, themeManagerReady, themeCore]);

  return { themeCore, themes, setThemes, components, themeManagerReady };
}
