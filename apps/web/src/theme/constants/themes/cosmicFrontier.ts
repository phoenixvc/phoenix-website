import {
  ComponentVariants,
  Theme,
  ThemeBorders,
  ThemeBreakpoints,
  ThemeColors,
  ThemeConfig,
  ThemeScheme,
  ThemeShadows,
  ThemeSpacing,
  ThemeTransitions,
  ThemeTypography,
  ThemeVariables,
  ThemeZIndex,
} from "@/theme/types";
import {
  createColor,
  grayPalette,
  greenPalette,
  purplePalette,
  redPalette,
} from "./colors";
import indigoPalette from "./colors/indigo";
import skyPalette from "./colors/sky";
import { defaultTheme } from "./default";

const typedDefaultTheme = defaultTheme as Omit<Theme, "colors"> & {
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  breakpoints: ThemeBreakpoints;
  transitions: ThemeTransitions;
  zIndex: ThemeZIndex;
  variables: ThemeVariables;
  components: ComponentVariants;
  config: ThemeConfig;
};

/**
 * Cosmic Frontier is the website's first complete environmental theme.
 * Renderer code stays in the trusted environment registry; this object remains
 * serializable theme data for the existing provider and designer surfaces.
 */
export const cosmicFrontierColorScheme: ThemeScheme = {
  base: {
    primary: purplePalette,
    secondary: indigoPalette,
    accent: skyPalette,
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#F4F7FC"),
    text: {
      primary: createColor("#17203A"),
      secondary: createColor("#465376"),
    },
    muted: createColor("#647095"),
    border: createColor("#D6DDF0"),
    surface: createColor("#FFFFFF"),
    overlay: createColor("#131B34"),
    hover: createColor("#EEF0FF"),
    active: createColor("#E9E4FA"),
    focus: createColor("#0EA5E9"),
    disabled: createColor("#B7BDCA"),
  },
  dark: {
    background: createColor("#080B18"),
    text: {
      primary: createColor("#F4F7FF"),
      secondary: createColor("#B8C2DF"),
    },
    muted: createColor("#8D99BC"),
    border: createColor("#293251"),
    surface: createColor("#11162A"),
    overlay: createColor("#03050D"),
    hover: createColor("#262047"),
    active: createColor("#172D4B"),
    focus: createColor("#38BDF8"),
    disabled: createColor("#555968"),
  },
};

export const cosmicFrontierColors: ThemeColors = {
  schemes: { "cosmic-frontier": cosmicFrontierColorScheme },
  semantic: {
    success: createColor(greenPalette[500].hex),
    warning: createColor("#FBBF24"),
    error: createColor(redPalette[500].hex),
    info: createColor(skyPalette[400].hex),
  },
};

export const cosmicFrontierTheme: Theme = {
  ...typedDefaultTheme,
  colors: cosmicFrontierColors,
  typography: {
    ...typedDefaultTheme.typography,
    fontFamily: {
      base: "'Outfit', system-ui, sans-serif",
      heading: "'Space Grotesk', 'Outfit', system-ui, sans-serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...typedDefaultTheme.shadows,
    md: "0 12px 32px rgba(76, 29, 149, 0.22)",
    lg: "0 20px 52px rgba(49, 46, 129, 0.3)",
    xl: "0 28px 80px rgba(8, 11, 24, 0.48)",
  },
};

export default cosmicFrontierTheme;
