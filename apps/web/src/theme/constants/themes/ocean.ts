import { Theme, ThemeColors, ThemeScheme } from "@/theme/types";
import { createTheme } from "@/theme/core/theme";
import ColorUtils from "@/theme/utils/color-utils";
import { createColor, grayPalette, greenPalette, redPalette } from "./colors";
import yellowPalette from "./colors/yellow";

/**
 * Ocean is the fifth complete environmental theme. Renderer code stays in
 * the trusted environment registry; this object remains serializable theme
 * data for the provider, persistence, and designer surfaces.
 */
export const oceanColorScheme: ThemeScheme = {
  base: {
    primary: ColorUtils.createColorShades("#00F0FF"),
    secondary: ColorUtils.createColorShades("#0284C7"),
    accent: ColorUtils.createColorShades("#14B8A6"),
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#F0F9FF"),
    text: {
      primary: createColor("#0A2540"),
      secondary: createColor("#334155"),
    },
    muted: createColor("#64748B"),
    border: createColor("#BAE6FD"),
    surface: createColor("#FFFFFF"),
    overlay: createColor("#0A2540"),
    hover: createColor("#E0F2FE"),
    active: createColor("#BAE6FD"),
    focus: createColor("#0284C7"),
    disabled: createColor("#94A3B8"),
  },
  dark: {
    background: createColor("#030B17"),
    text: {
      primary: createColor("#F0F9FF"),
      secondary: createColor("#7DD3FC"),
    },
    muted: createColor("#475569"),
    border: createColor("#0C4A6E"),
    surface: createColor("#081B2E"),
    overlay: createColor("#02060D"),
    hover: createColor("#0C2D48"),
    active: createColor("#144272"),
    focus: createColor("#00F0FF"),
    disabled: createColor("#334155"),
  },
};

export const oceanColors: ThemeColors = {
  schemes: { ocean: oceanColorScheme, default: oceanColorScheme },
  semantic: {
    success: createColor(greenPalette[600].hex),
    warning: createColor(yellowPalette[500].hex),
    error: createColor(redPalette[500].hex),
    info: createColor("#00F0FF"),
  },
};

const oceanBaseTheme = createTheme(
  {
    name: "Ocean",
    themeName: "ocean",
    mode: "dark",
    useSystem: false,
    version: "1.0.0",
  },
  oceanColors,
);

export const oceanTheme: Theme = {
  ...oceanBaseTheme,
  typography: {
    ...oceanBaseTheme.typography,
    fontFamily: {
      base: "'Outfit', system-ui, sans-serif",
      heading: "'Plus Jakarta Sans', system-ui, sans-serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...oceanBaseTheme.shadows,
    md: "0 8px 24px rgba(0, 240, 255, 0.18)",
    lg: "0 16px 40px rgba(2, 132, 199, 0.28)",
    xl: "0 28px 72px rgba(3, 11, 23, 0.55)",
  },
};

export default oceanTheme;
