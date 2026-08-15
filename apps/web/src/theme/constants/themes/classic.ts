import { Theme, ThemeColors, ThemeScheme } from "@/theme/types";
import { createTheme } from "@/theme/core/theme";
import ColorUtils from "@/theme/utils/color-utils";
import { createColor, grayPalette, greenPalette, redPalette } from "./colors";
import yellowPalette from "./colors/yellow";

/**
 * Classic is the eighth complete environmental theme. Renderer code stays in
 * the trusted environment registry; this object remains serializable theme
 * data for the provider, persistence, and designer surfaces.
 */
export const classicColorScheme: ThemeScheme = {
  base: {
    primary: ColorUtils.createColorShades("#38BDF8"),
    secondary: ColorUtils.createColorShades("#94A3B8"),
    accent: ColorUtils.createColorShades("#60A5FA"),
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#F8FAFC"),
    text: {
      primary: createColor("#0F172A"),
      secondary: createColor("#475569"),
    },
    muted: createColor("#64748B"),
    border: createColor("#E2E8F0"),
    surface: createColor("#FFFFFF"),
    overlay: createColor("#0F172A"),
    hover: createColor("#F1F5F9"),
    active: createColor("#E2E8F0"),
    focus: createColor("#0284C7"),
    disabled: createColor("#94A3B8"),
  },
  dark: {
    background: createColor("#090D16"),
    text: {
      primary: createColor("#F8FAFC"),
      secondary: createColor("#94A3B8"),
    },
    muted: createColor("#64748B"),
    border: createColor("#1E293B"),
    surface: createColor("#111827"),
    overlay: createColor("#05080E"),
    hover: createColor("#1E293B"),
    active: createColor("#334155"),
    focus: createColor("#38BDF8"),
    disabled: createColor("#475569"),
  },
};

export const classicColors: ThemeColors = {
  schemes: { classic: classicColorScheme, default: classicColorScheme },
  semantic: {
    success: createColor(greenPalette[600].hex),
    warning: createColor(yellowPalette[500].hex),
    error: createColor(redPalette[500].hex),
    info: createColor("#38BDF8"),
  },
};

const classicBaseTheme = createTheme(
  {
    name: "Classic",
    themeName: "classic",
    mode: "dark",
    useSystem: false,
    version: "1.0.0",
  },
  classicColors,
);

export const classicTheme: Theme = {
  ...classicBaseTheme,
  typography: {
    ...classicBaseTheme.typography,
    fontFamily: {
      base: "'Outfit', system-ui, sans-serif",
      heading: "'Space Grotesk', system-ui, sans-serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...classicBaseTheme.shadows,
    md: "0 8px 24px rgba(56, 189, 248, 0.18)",
    lg: "0 16px 40px rgba(15, 23, 42, 0.35)",
    xl: "0 28px 72px rgba(9, 13, 22, 0.6)",
  },
};

export default classicTheme;
