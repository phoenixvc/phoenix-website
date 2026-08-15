// theme/hooks/useThemeDomEffect.ts
import { useLayoutEffect } from "react";
import { ThemeMode, ThemeName } from "@/theme/types";
import { ThemeRegistry } from "@/theme/registry/theme-registry";
import { generateThemeVariables } from "@/theme/providers/theme-variables";
import { useCssVariables } from "./useCssVariables";
import { logger } from "@/utils/logger";

/**
 * Applies theme CSS variables and root data attributes synchronously before
 * first paint, so switching theme/mode never produces a flash of unstyled
 * content.
 */
export function useThemeDomEffect(
  themeName: ThemeName,
  mode: ThemeMode,
  themes: ThemeRegistry,
): void {
  const { applyCssVariables } = useCssVariables();

  useLayoutEffect(() => {
    const themeData = themes?.themes?.[themeName];
    if (!themeData) return;

    try {
      const variables = generateThemeVariables(themeData, mode);
      applyCssVariables(variables.computed);

      if (typeof document !== "undefined") {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(mode);
        root.setAttribute("data-theme", themeName);
      }
    } catch (err) {
      logger.error(
        "[ThemeProvider] Error applying CSS variables in layoutEffect:",
        err,
      );
    }
  }, [themeName, mode, themes, applyCssVariables]);
}
