import { Theme, ThemeColors, ThemeScheme } from "@/theme/types";
import { createTheme } from "@/theme/core/theme";
import {
  createColor,
  grayPalette,
  redPalette,
} from "./colors";
import orangePalette from "./colors/orange";
import yellowPalette from "./colors/yellow";
import { bluePalette } from "./colors/blue";

/**
 * Phoenix Theme Color Scheme
 * A vibrant, incandescent color scheme based on volcanic obsidian,
 * molten amber, solar gold, and vermilion tones.
 */
export const phoenixColorScheme: ThemeScheme = {
  base: {
    primary: orangePalette,
    secondary: redPalette,
    accent: yellowPalette,
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#FCF8F2"),
    text: {
      primary: createColor("#1C130D"),
      secondary: createColor("#785645"),
    },
    muted: createColor("#8C6B5A"),
    border: createColor("#EADCCE"),
    surface: createColor("#FFFFFF"),
    overlay: createColor("#1C130D"),
    hover: createColor("#FFF3E6"),
    active: createColor("#FFE4CC"),
    focus: createColor("#F97316"),
    disabled: createColor("#B7BDCA"),
  },
  dark: {
    background: createColor("#090708"),
    text: {
      primary: createColor("#FFF5EE"),
      secondary: createColor("#B89D91"),
    },
    muted: createColor("#8D766C"),
    border: createColor("#2F1F1C"),
    surface: createColor("#140E10"),
    overlay: createColor("#040203"),
    hover: createColor("#261411"),
    active: createColor("#381B15"),
    focus: createColor("#FB923C"),
    disabled: createColor("#555968"),
  },
};

/**
 * Phoenix Theme Colors
 */
export const phoenixColors: ThemeColors = {
  schemes: {
    phoenix: phoenixColorScheme,
    default: phoenixColorScheme,
  },
  semantic: {
    success: createColor("#22C55E"),
    warning: createColor("#F59E0B"),
    error: createColor("#EF4444"),
    info: createColor(bluePalette[400].hex),
  },
};

const phoenixBaseTheme = createTheme(
  {
    name: "Phoenix",
    themeName: "phoenix",
    mode: "dark",
    useSystem: false,
    version: "1.0.0",
  },
  phoenixColors,
);

/**
 * Phoenix Theme
 * A vibrant, energetic theme with a focus on orange, vermilion, and obsidian tones,
 * creating a warm and dynamic rebirth aesthetic.
 */
export const phoenixTheme: Theme = {
  ...phoenixBaseTheme,
  typography: {
    ...phoenixBaseTheme.typography,
    fontFamily: {
      base: "'Outfit', system-ui, sans-serif",
      heading: "'Space Grotesk', 'Outfit', system-ui, sans-serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...phoenixBaseTheme.shadows,
    md: "0 12px 32px rgba(234, 88, 12, 0.22)",
    lg: "0 20px 52px rgba(185, 28, 28, 0.3)",
    xl: "0 28px 80px rgba(9, 7, 8, 0.55)",
  },
};

export default phoenixTheme;
