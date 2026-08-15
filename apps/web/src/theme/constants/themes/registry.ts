import {
  ThemeRegistry,
  createThemeRegistry,
} from "@/theme/registry/theme-registry";
import { cosmicFrontierColors } from "./cosmicFrontier";
import { forestColors } from "./forest";
import { highveldColors } from "./highveld";
import { phoenixColors } from "./phoenix";
import { oceanColors } from "./ocean";
import { DEFAULT_THEME_NAME, THEME_CATALOG } from "./catalog";
import type { ThemeName } from "@/theme/types";

/** Build a fresh registry so React StrictMode never shares mutable registry state. */
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

  const forest = THEME_CATALOG.forest;
  registry.registerTheme(forest.id, forestColors, {
    displayName: forest.displayName,
    description: forest.description,
    author: "Phoenix VC",
    version: "1.0.0",
    tags: ["environmental", "interactive", "forest", "canopy", "first-party"],
    compatibleModes: ["light", "dark"],
  });

  const highveld = THEME_CATALOG.highveld;
  registry.registerTheme(highveld.id, highveldColors, {
    displayName: highveld.displayName,
    description: highveld.description,
    author: "Phoenix VC",
    version: "1.0.0",
    tags: ["environmental", "interactive", "highveld", "lightning", "first-party"],
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

  const ocean = THEME_CATALOG.ocean;
  registry.registerTheme(ocean.id, oceanColors, {
    displayName: ocean.displayName,
    description: ocean.description,
    author: "Phoenix VC",
    version: "1.0.0",
    tags: ["environmental", "interactive", "ocean", "abyss", "first-party"],
    compatibleModes: ["light", "dark"],
  });

  registry.setDefaultTheme(defaultThemeName, "dark");

  return registry;
}
