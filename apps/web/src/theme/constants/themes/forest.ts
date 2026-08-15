import { Theme, ThemeColors, ThemeScheme } from "@/theme/types";
import { createTheme } from "@/theme/core/theme";
import ColorUtils from "@/theme/utils/color-utils";
import { createColor, grayPalette, greenPalette, redPalette } from "./colors";
import yellowPalette from "./colors/yellow";

/**
 * Forest is the second complete environmental theme. Renderer code stays in
 * the trusted environment registry; this object remains serializable theme
 * data for the provider, persistence, and designer surfaces.
 */
export const forestColorScheme: ThemeScheme = {
  base: {
    primary: greenPalette,
    secondary: ColorUtils.createColorShades("#8B6B4A"),
    accent: ColorUtils.createColorShades("#D4A017"),
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#F3F7F0"),
    text: {
      primary: createColor("#1A2E20"),
      secondary: createColor("#4A6352"),
    },
    muted: createColor("#6B8574"),
    border: createColor("#D4E0D2"),
    surface: createColor("#FFFFFF"),
    overlay: createColor("#1A2E20"),
    hover: createColor("#E8F2E6"),
    active: createColor("#D8EBD4"),
    focus: createColor("#C9A227"),
    disabled: createColor("#A8B8AC"),
  },
  dark: {
    background: createColor("#0A1610"),
    text: {
      primary: createColor("#E8F0E4"),
      secondary: createColor("#A8BFA8"),
    },
    muted: createColor("#7F9A84"),
    border: createColor("#2A4030"),
    surface: createColor("#14241A"),
    overlay: createColor("#040A07"),
    hover: createColor("#1A3324"),
    active: createColor("#23402C"),
    focus: createColor("#E8C547"),
    disabled: createColor("#55685A"),
  },
};

export const forestColors: ThemeColors = {
  schemes: { forest: forestColorScheme },
  semantic: {
    success: createColor(greenPalette[600].hex),
    warning: createColor(yellowPalette[500].hex),
    error: createColor(redPalette[500].hex),
    info: createColor("#3F8F5A"),
  },
};

const forestBaseTheme = createTheme(
  {
    name: "Forest",
    themeName: "forest",
    mode: "dark",
    useSystem: false,
    version: "1.0.0",
  },
  forestColors,
);

export const forestTheme: Theme = {
  ...forestBaseTheme,
  typography: {
    ...forestBaseTheme.typography,
    fontFamily: {
      base: "'Noto Sans', system-ui, sans-serif",
      heading: "'Bitter', serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...forestBaseTheme.shadows,
    md: "0 8px 24px rgba(15, 36, 24, 0.22)",
    lg: "0 16px 40px rgba(10, 22, 16, 0.32)",
    xl: "0 28px 72px rgba(4, 10, 7, 0.48)",
  },
};

export default forestTheme;
