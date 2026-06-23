// src/theme/utils/theme-variables.ts
import {
  SemanticColors,
  ThemeColors,
  ThemeName,
  ThemeMode,
  ThemeVariables,
} from "../types";
import { logger } from "@/utils/logger";

export const generateThemeVariables = (
  colors: ThemeColors,
  mode: ThemeMode,
  schemeName?: ThemeName,
): ThemeVariables => {
  try {
    logger.debug("[ThemeProvider] Generating theme variables", {
      mode,
      schemeName,
    });

    // Determine which scheme to use:
    let scheme: ThemeColors["schemes"][keyof ThemeColors["schemes"]];
    if (schemeName) {
      scheme = colors.schemes[schemeName];
      if (!scheme) {
        throw new Error(`Invalid color scheme: ${schemeName}`);
      }
    } else {
      const keys = Object.keys(colors.schemes) as ThemeName[];
      if (keys.length === 0) {
        throw new Error("No color schemes available");
      }
      scheme = colors.schemes[keys[0]];
    }

    // Get mode-specific colors (light or dark)
    const modeColors = scheme[mode as "light" | "dark"];
    if (!modeColors) {
      throw new Error(`Invalid mode: ${mode}`);
    }

    // Check if base exists
    if (!scheme.base) {
      logger.error("Missing scheme.base in color scheme");
      throw new Error("Missing scheme.base in color scheme");
    }

    // Check primary and secondary
    if (!scheme.base.primary) {
      logger.error("Missing scheme.base.primary in color scheme");
      throw new Error("Missing scheme.base.primary in color scheme");
    }

    if (!scheme.base.secondary) {
      logger.error("Missing scheme.base.secondary in color scheme");
      throw new Error("Missing scheme.base.secondary in color scheme");
    }

    // Build computed colors using HSL values
    // Use the direct color values instead of looking for [500]
    const computedColors = {
      // scheme.base.primary is a ColorShades map whose hsl/hex are reached via
      // its index signature (typed as a wide union); assert string to satisfy
      // the ThemeVariables.computed.colors contract without changing behaviour.
      primary: (scheme.base.primary.hsl || scheme.base.primary.hex) as string,
      secondary: (scheme.base.secondary.hsl ||
        scheme.base.secondary.hex) as string,
      background: modeColors.background.hsl,
      // modeColors.text is a { primary, secondary } pair, not a single color.
      text: modeColors.text.primary.hsl,
      border: modeColors.border.hsl,
    };

    // Build the ThemeVariables object.
    const themeVariables: ThemeVariables = {
      prefix: "--theme",
      mappings: colors,
      computed: {
        colors: computedColors,
        spacing: {
          xs: "0.25rem",
          sm: "0.5rem",
          md: "1rem",
          lg: "1.5rem",
          xl: "2rem",
        },
        typography: {
          body: {
            fontSize: "16px",
            lineHeight: "24px",
            fontWeight: 400,
            letterSpacing: "normal",
          },
          heading: {
            fontSize: "32px",
            lineHeight: "40px",
            fontWeight: 700,
            letterSpacing: "normal",
          },
        },
        breakpoints: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
          "2xl": "1536px",
        },
        animation: {
          fadeIn: {
            duration: "300ms",
            easing: "ease-in",
          },
          fadeOut: {
            duration: "300ms",
            easing: "ease-out",
          },
        },
        shadows: {
          small: "0 1px 3px rgba(0,0,0,0.12)",
          medium: "0 4px 6px rgba(0,0,0,0.1)",
          large: "0 10px 15px rgba(0,0,0,0.1)",
        },
        zIndex: {
          dropdown: 1000,
          modal: 1100,
          tooltip: 1200,
        },
      },
    };

    logger.debug("[ThemeProvider] Generated theme variables");
    return themeVariables;
  } catch (error) {
    logger.error("[ThemeProvider] Failed to generate theme variables:", error);

    // Create fallback theme variables to prevent cascading errors
    const fallbackThemeVariables: ThemeVariables = {
      prefix: "--theme",
      mappings: colors,
      computed: {
        colors: {
          primary: "hsl(210, 100%, 50%)",
          secondary: "hsl(270, 60%, 50%)",
          background: mode === "light" ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 10%)",
          text: mode === "light" ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 90%)",
          border: mode === "light" ? "hsl(0, 0%, 80%)" : "hsl(0, 0%, 30%)",
        },
        spacing: {
          xs: "0.25rem",
          sm: "0.5rem",
          md: "1rem",
          lg: "1.5rem",
          xl: "2rem",
        },
        typography: {
          body: {
            fontSize: "16px",
            lineHeight: "24px",
            fontWeight: 400,
            letterSpacing: "normal",
          },
          heading: {
            fontSize: "32px",
            lineHeight: "40px",
            fontWeight: 700,
            letterSpacing: "normal",
          },
        },
        breakpoints: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
          "2xl": "1536px",
        },
        animation: {
          fadeIn: {
            duration: "300ms",
            easing: "ease-in",
          },
          fadeOut: {
            duration: "300ms",
            easing: "ease-out",
          },
        },
        shadows: {
          small: "0 1px 3px rgba(0,0,0,0.12)",
          medium: "0 4px 6px rgba(0,0,0,0.1)",
          large: "0 10px 15px rgba(0,0,0,0.1)",
        },
        zIndex: {
          dropdown: 1000,
          modal: 1100,
          tooltip: 1200,
        },
      },
    };

    logger.debug("[ThemeProvider] Using fallback theme variables");
    return fallbackThemeVariables;
  }
};

/**
 * Generate a map of the scheme's semantic colors in your desired format (e.g. HSL).
 *
 * @param colors      Full ThemeColors object (including `.semantic`)
 * @param mode        Current theme mode ('light' or 'dark')
 * @param schemeName  Optional scheme name if you need context; not strictly required if semantics are top-level
 *
 * @returns An object of { [semanticKey]: string }, e.g. { error: "hsl(0, 60%, 50%)" }
 */
export function generateSchemeSemantics(
  colors: ThemeColors,
  _mode: ThemeMode,
  schemeName?: ThemeName,
): SemanticColors {
  try {
    logger.debug("generateSchemeSemantics", { schemeName });

    if (!colors.semantic) {
      logger.warn("No semantic colors found in ThemeColors");
      throw new Error("Missing semantic colors in ThemeColors");
    }

    if (schemeName && !colors.schemes[schemeName]) {
      throw new Error(`Invalid color scheme: ${schemeName}`);
    }

    // Prepare a new semantic colors object.
    const semanticResult: Partial<SemanticColors> = {};

    // Required semantic colors
    const requiredKeys: (keyof SemanticColors)[] = [
      "success",
      "warning",
      "error",
      "info",
    ];
    // Optional semantic colors
    const optionalKeys: (keyof SemanticColors)[] = ["neutral", "hint"];

    // Process required keys
    for (const key of requiredKeys) {
      const colorDef = colors.semantic[key];
      if (!colorDef) {
        logger.error(`Missing required semantic color for key: ${key}`);
        throw new Error(`Missing required semantic color: ${key}`);
      }
      if (!colorDef.hsl) {
        logger.warn(`Semantic color "${key}" has no HSL value`);
      }
      semanticResult[key] = colorDef;
    }

    // Process optional keys
    for (const key of optionalKeys) {
      const colorDef = colors.semantic[key];
      if (colorDef) {
        if (!colorDef.hsl) {
          logger.warn(`Optional semantic color "${key}" has no HSL value`);
        }
        semanticResult[key] = colorDef;
      }
    }

    return semanticResult as SemanticColors;
  } catch (error) {
    logger.error("Error in generateSchemeSemantics:", error);
    throw error;
  }
}
