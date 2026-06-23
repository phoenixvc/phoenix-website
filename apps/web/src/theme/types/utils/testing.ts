// src/types/theme/testing.ts
import type { ThemeConfig } from "../core/config";
import type { DeepPartial } from "./utils";

/**
 * Creates a base theme configuration with defaults.
 * You can extend this function as needed.
 */
export const createTheme = (config?: Partial<ThemeConfig>): ThemeConfig => {
  return {
    name: config?.name ?? config?.themeName ?? "default",
    mode: config?.mode ?? "light",
    themeName: config?.themeName ?? "classic",
    useSystem: config?.useSystem ?? true,
    direction: config?.direction,
    version: config?.version,
  };
};

/**
 * Creates a test theme configuration.
 * Applies any overrides and ensures a default value for useSystem.
 *
 * @example
 * const testTheme = createTestTheme({ mode: 'dark' });
 */
export const createTestTheme = (
  overrides?: DeepPartial<ThemeConfig>,
): ThemeConfig => {
  const baseTheme: ThemeConfig = {
    ...createTheme(),
    useSystem: true, // Provide a default value or the appropriate default
  };

  return {
    ...baseTheme,
    ...overrides,
    useSystem:
      overrides && "useSystem" in overrides
        ? overrides.useSystem!
        : baseTheme.useSystem,
  };
};
