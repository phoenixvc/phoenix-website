import type { ThemeName } from "@/theme/types";
import {
  ThemeRegistry,
  createThemeRegistry,
} from "@/theme/registry/theme-registry";
import { cosmicFrontierColors } from "./cosmicFrontier";
import { highveldColors } from "./highveld";
import { DEFAULT_THEME_NAME, THEME_CATALOG } from "./catalog";

/**
 * Build a fresh registry so React StrictMode never shares mutable registry
 * state. `defaultThemeName` is the effective startup theme: ThemeCore's
 * `initializeRegistries` applies the registry default over both stored state
 * and the provider config, so this is the only place a caller can influence it.
 */
export function createBuiltInThemeRegistry(
  defaultThemeName: ThemeName = DEFAULT_THEME_NAME,
): ThemeRegistry {
  const registry = createThemeRegistry();

  const cosmic = THEME_CATALOG["cosmic-frontier"];
  registry.registerTheme(cosmic.id, cosmicFrontierColors, {
    displayName: cosmic.displayName,
    description: cosmic.description,
    author: "Phoenix VC",
    version: "1.0.0",
    tags: ["environmental", "interactive", "cosmic", "first-party"],
    compatibleModes: ["light", "dark"],
  });

  const highveld = THEME_CATALOG.highveld;
  registry.registerTheme(highveld.id, highveldColors, {
    displayName: highveld.displayName,
    description: highveld.description,
    author: "Phoenix VC",
    version: "1.0.0",
    tags: ["environmental", "interactive", "highveld", "first-party"],
    compatibleModes: ["light", "dark"],
  });

  registry.setDefaultTheme(defaultThemeName, "dark");

  return registry;
}
