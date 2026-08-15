import type { ThemeName } from "@/theme";
import { isAvailableThemeName } from "@/theme/constants/themes/catalog";
import { THEME_ENVIRONMENTS } from "./registry";
import type { EnvironmentFixture } from "./types";

/**
 * Shared query-parameter plumbing for every environmental theme, so each new
 * renderer does not add another branch to Layout.
 *
 * - `?theme=<name>` selects an available theme (shareable deep link).
 * - `?<theme>-fixture=static` pins that theme's environment to the single
 *   deterministic frame declared in its registry entry.
 */

export const themeNameFromQuery = (search: string): ThemeName | null => {
  const params = new URLSearchParams(search);
  const requested = params.get("theme");
  if (requested && isAvailableThemeName(requested)) {
    return requested;
  }
  for (const [theme, def] of Object.entries(THEME_ENVIRONMENTS)) {
    if (
      params.get(def.fixtureParam) === "static" &&
      isAvailableThemeName(theme)
    ) {
      return theme as ThemeName;
    }
  }
  return null;
};

export const resolveEnvironmentFixture = (
  search: string,
  themeName: ThemeName,
): EnvironmentFixture | undefined => {
  const params = new URLSearchParams(search);
  const definition =
    THEME_ENVIRONMENTS[themeName as keyof typeof THEME_ENVIRONMENTS];
  if (definition && params.get(definition.fixtureParam) === "static") {
    return definition.staticFixture;
  }
  for (const def of Object.values(THEME_ENVIRONMENTS)) {
    if (params.get(def.fixtureParam) === "static") {
      return def.staticFixture;
    }
  }
  return undefined;
};
