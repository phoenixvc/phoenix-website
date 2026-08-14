import {
  ThemeRegistry,
  createThemeRegistry,
} from "@/theme/registry/theme-registry";
import { cosmicFrontierColors } from "./cosmicFrontier";
import { phoenixColors } from "./phoenix";
import { DEFAULT_THEME_NAME, THEME_CATALOG } from "./catalog";

/** Build a fresh registry so React StrictMode never shares mutable registry state. */
export function createBuiltInThemeRegistry(): ThemeRegistry {
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

  const phoenix = THEME_CATALOG.phoenix;
  registry.registerTheme(phoenix.id, phoenixColors, {
    displayName: phoenix.displayName,
    description: phoenix.description,
    author: "Phoenix VC",
    version: "1.0.0",
    tags: ["environmental", "interactive", "phoenix", "rebirth", "first-party"],
    compatibleModes: ["light", "dark"],
  });

  registry.setDefaultTheme(DEFAULT_THEME_NAME, "dark");

  return registry;
}
