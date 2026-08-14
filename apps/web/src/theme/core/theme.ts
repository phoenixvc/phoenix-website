import {
  Theme,
  ThemeColors,
  ThemeConfig,
  ThemeSpacing,
  ThemeVariables,
} from "../types";
import { defaultTheme } from "./defaultTheme";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";

// Theme factory function for the hybrid approach
export function createTheme(
  config: ThemeConfig,
  colors: ThemeColors,
  overrides?: Partial<
    Omit<Theme, "config" | "colors" | "variables" | "typography" | "components">
  >,
): Theme {
  // Generate variables from colors (from Implementation 2)
  const variables: ThemeVariables = generateThemeVariables(config, colors);

  // Create the theme object with both approaches
  const theme: Theme = {
    ...defaultTheme,
    config,
    colors,
    variables,
    // Ensure spacing.unit is a string
    spacing: {
      // Convert all numeric spacing properties to strings
      ...Object.entries(defaultTheme.spacing).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: typeof value === "number" ? String(value) : value,
        }),
        {},
      ),

      // Apply any overrides, also ensuring they're strings
      ...(overrides?.spacing
        ? Object.entries(overrides.spacing).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key]: typeof value === "number" ? String(value) : value,
            }),
            {},
          )
        : {}),
    } as ThemeSpacing,
    // Deep merge for nested objects
    typography: {
      ...defaultTheme.typography,
      ...(overrides?.typography || {}),
    },
    components: {
      ...defaultTheme.components,
      ...(overrides?.components || {}),
    },
    // Other properties from defaultTheme and overrides
  };

  // Add any remaining overrides
  if (overrides) {
    Object.keys(overrides).forEach((key) => {
      if (
        ![
          "config",
          "colors",
          "variables",
          "typography",
          "components",
          "spacing",
        ].includes(key)
      ) {
        // @ts-ignore - We"re being careful with the keys
        theme[key] = overrides[key];
      }
    });
  }

  return theme;
}

// Helper function to generate theme variables from colors
function generateThemeVariables(
  config: ThemeConfig,
  colors: ThemeColors,
): ThemeVariables {
  // Get the current color scheme
  const colorScheme = config.themeName || DEFAULT_THEME_NAME;
  const mode = config.mode || "light";

  // Get the appropriate color scheme
  const schemeColors =
    colors.schemes[colorScheme] || Object.values(colors.schemes)[0]; // Fallback to first scheme

  // Get the appropriate mode colors
  const modeColors = schemeColors[mode];

  // Base colors from the scheme
  const baseColors = schemeColors.base;

  // Generate computed values
  const computed = {
    colors: {
      primary: baseColors.primary[500].hsl,
      secondary: baseColors.secondary[500].hsl,
      accent: baseColors.accent[500].hsl,
      background: modeColors.background.hsl,
      text: modeColors.text.primary.hsl,
      textSecondary: modeColors.text.secondary.hsl,
      muted: modeColors.muted.hsl,
      border: modeColors.border.hsl,
      surface: modeColors.surface?.hsl ?? modeColors.background.hsl,
      overlay: modeColors.overlay?.hsl ?? modeColors.background.hsl,
      hover: modeColors.hover?.hsl ?? baseColors.primary[100].hsl,
      active: modeColors.active?.hsl ?? baseColors.primary[200].hsl,
      focus: modeColors.focus?.hsl ?? baseColors.accent[500].hsl,
      disabled: modeColors.disabled?.hsl ?? modeColors.muted.hsl,
      success: colors.semantic?.success.hsl ?? baseColors.primary[500].hsl,
      warning: colors.semantic?.warning.hsl ?? baseColors.accent[500].hsl,
      error: colors.semantic?.error.hsl ?? baseColors.secondary[500].hsl,
      info: colors.semantic?.info.hsl ?? baseColors.accent[500].hsl,
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      xxl: "3rem",
    },
    typography: {
      body: {
        fontSize: "1rem",
        lineHeight: "1.5",
        fontWeight: 400,
      },
      heading: {
        fontSize: "1.5rem",
        lineHeight: "1.2",
        fontWeight: 700,
      },
    },
    breakpoints: {
      xs: "0px",
      sm: "600px",
      md: "960px",
      lg: "1280px",
      xl: "1920px",
    },
    shadows: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    },
    animation: {
      fast: { duration: "150ms", easing: "ease-in-out" },
      normal: { duration: "300ms", easing: "ease-in-out" },
      slow: { duration: "500ms", easing: "ease-in-out" },
    },
    zIndex: {
      dropdown: 1000,
      modal: 1300,
      overlay: 1200,
      popover: 1100,
      tooltip: 1500,
    },
  };

  // Return the complete variables object
  return {
    prefix: "theme",
    mappings: colors,
    computed,
  };
}
