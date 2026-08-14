import { Theme, ThemeColors, ThemeScheme } from "@/theme/types";
import { createTheme } from "@/theme/core/theme";
import ColorUtils from "@/theme/utils/color-utils";
import {
  createColor,
  grayPalette,
  greenPalette,
  redPalette,
} from "./colors";
import yellowPalette from "./colors/yellow";

/**
 * Highveld is the first theme designed after the environment contract settled,
 * rather than retrofitted onto it. Renderer code stays in the trusted
 * environment registry; this object remains serializable theme data for the
 * provider, persistence, and designer surfaces.
 *
 * Palette reads off the South African interior plateau: sun-bleached veld gold,
 * thunderhead slate, and the aloe-ember that shows up in a Highveld sunset.
 */
export const highveldColorScheme: ThemeScheme = {
  base: {
    primary: ColorUtils.createColorShades("#C8912F"),
    secondary: ColorUtils.createColorShades("#5A7089"),
    accent: ColorUtils.createColorShades("#E0653A"),
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#FAF6EE"),
    text: {
      primary: createColor("#241F17"),
      secondary: createColor("#5C5344"),
    },
    muted: createColor("#7D7565"),
    border: createColor("#E3DACA"),
    surface: createColor("#FFFFFF"),
    overlay: createColor("#241F17"),
    hover: createColor("#F4EDDD"),
    active: createColor("#EDE2CB"),
    focus: createColor("#B07B18"),
    disabled: createColor("#B4AC9C"),
  },
  dark: {
    background: createColor("#0F1216"),
    text: {
      primary: createColor("#F2EDE3"),
      secondary: createColor("#B9B3A6"),
    },
    muted: createColor("#8C8579"),
    border: createColor("#303A46"),
    surface: createColor("#191E25"),
    overlay: createColor("#05070A"),
    hover: createColor("#232A33"),
    active: createColor("#2C3540"),
    focus: createColor("#E8B54A"),
    disabled: createColor("#5A5F68"),
  },
};

export const highveldColors: ThemeColors = {
  schemes: { highveld: highveldColorScheme },
  semantic: {
    success: createColor(greenPalette[600].hex),
    warning: createColor(yellowPalette[500].hex),
    error: createColor(redPalette[500].hex),
    info: createColor("#5A7089"),
  },
};

const highveldBaseTheme = createTheme(
  {
    name: "Highveld",
    themeName: "highveld",
    mode: "dark",
    useSystem: false,
    version: "1.0.0",
  },
  highveldColors,
);

export const highveldTheme: Theme = {
  ...highveldBaseTheme,
  typography: {
    ...highveldBaseTheme.typography,
    fontFamily: {
      base: "'Outfit', system-ui, sans-serif",
      heading: "'Zilla Slab', Georgia, serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...highveldBaseTheme.shadows,
    // Long, warm, low-sun shadows rather than the cool cast Cosmic uses.
    md: "0 10px 28px rgba(56, 42, 20, 0.20)",
    lg: "0 18px 46px rgba(38, 28, 14, 0.30)",
    xl: "0 30px 76px rgba(12, 9, 5, 0.46)",
  },
};

export default highveldTheme;
