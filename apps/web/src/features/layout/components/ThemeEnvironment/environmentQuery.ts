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
  const requested = new URLSearchParams(search).get("theme");
  return requested && isAvailableThemeName(requested) ? requested : null;
};

export const resolveEnvironmentFixture = (
  search: string,
  themeName: ThemeName,
): EnvironmentFixture | undefined => {
  const definition =
    THEME_ENVIRONMENTS[themeName as keyof typeof THEME_ENVIRONMENTS];
  if (!definition) {
    return undefined;
  }
  return new URLSearchParams(search).get(definition.fixtureParam) === "static"
    ? definition.staticFixture
    : undefined;
};
