import { Theme, ThemeColors, ThemeScheme } from "@/theme/types";
import { createTheme } from "@/theme/core/theme";
import ColorUtils from "@/theme/utils/color-utils";
import { createColor, grayPalette, greenPalette, redPalette } from "./colors";
import yellowPalette from "./colors/yellow";

/**
 * Lavender is the seventh complete environmental theme. Renderer code stays in
 * the trusted environment registry; this object remains serializable theme
 * data for the provider, persistence, and designer surfaces.
 */
export const lavenderColorScheme: ThemeScheme = {
  base: {
    primary: ColorUtils.createColorShades("#C084FC"),
    secondary: ColorUtils.createColorShades("#A855F7"),
    accent: ColorUtils.createColorShades("#E879F9"),
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#FAF5FF"),
    text: {
      primary: createColor("#1E1B4B"),
      secondary: createColor("#581C87"),
    },
    muted: createColor("#7E22CE"),
    border: createColor("#F3E8FF"),
    surface: createColor("#FFFFFF"),
    overlay: createColor("#1E1B4B"),
    hover: createColor("#F3E8FF"),
    active: createColor("#E9D5FF"),
    focus: createColor("#9333EA"),
    disabled: createColor("#C084FC"),
  },
  dark: {
    background: createColor("#120D1C"),
    text: {
      primary: createColor("#FAF5FF"),
      secondary: createColor("#D8B4FE"),
    },
    muted: createColor("#9333EA"),
    border: createColor("#3B0764"),
    surface: createColor("#1F172E"),
    overlay: createColor("#0A0612"),
    hover: createColor("#2E1065"),
    active: createColor("#3B0764"),
    focus: createColor("#C084FC"),
    disabled: createColor("#581C87"),
  },
};

export const lavenderColors: ThemeColors = {
  schemes: { lavender: lavenderColorScheme, default: lavenderColorScheme },
  semantic: {
    success: createColor(greenPalette[600].hex),
    warning: createColor(yellowPalette[500].hex),
    error: createColor(redPalette[500].hex),
    info: createColor("#C084FC"),
  },
};

const lavenderBaseTheme = createTheme(
  {
    name: "Lavender",
    themeName: "lavender",
    mode: "dark",
    useSystem: false,
    version: "1.0.0",
  },
  lavenderColors,
);

export const lavenderTheme: Theme = {
  ...lavenderBaseTheme,
  typography: {
    ...lavenderBaseTheme.typography,
    fontFamily: {
      base: "'Outfit', system-ui, sans-serif",
      heading: "'Plus Jakarta Sans', system-ui, sans-serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...lavenderBaseTheme.shadows,
    md: "0 8px 24px rgba(192, 132, 252, 0.18)",
    lg: "0 16px 40px rgba(168, 85, 247, 0.25)",
    xl: "0 28px 72px rgba(18, 13, 28, 0.5)",
  },
};

export default lavenderTheme;
