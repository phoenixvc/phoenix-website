import { Theme, ThemeColors, ThemeScheme } from "@/theme/types";
import { createTheme } from "@/theme/core/theme";
import ColorUtils from "@/theme/utils/color-utils";
import { createColor, grayPalette, greenPalette, redPalette } from "./colors";
import yellowPalette from "./colors/yellow";

/**
 * Cloud is the sixth complete environmental theme. Renderer code stays in
 * the trusted environment registry; this object remains serializable theme
 * data for the provider, persistence, and designer surfaces.
 */
export const cloudColorScheme: ThemeScheme = {
  base: {
    primary: ColorUtils.createColorShades("#60A5FA"),
    secondary: ColorUtils.createColorShades("#818CF8"),
    accent: ColorUtils.createColorShades("#38BDF8"),
    neutral: grayPalette,
    gray: grayPalette,
  },
  light: {
    background: createColor("#F8FAFC"),
    text: {
      primary: createColor("#0F172A"),
      secondary: createColor("#334155"),
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
    background: createColor("#0B132B"),
    text: {
      primary: createColor("#F8FAFC"),
      secondary: createColor("#93C5FD"),
    },
    muted: createColor("#64748B"),
    border: createColor("#1E293B"),
    surface: createColor("#1C2541"),
    overlay: createColor("#060A17"),
    hover: createColor("#1E2D5A"),
    active: createColor("#2A3D7C"),
    focus: createColor("#60A5FA"),
    disabled: createColor("#475569"),
  },
};

export const cloudColors: ThemeColors = {
  schemes: { cloud: cloudColorScheme, default: cloudColorScheme },
  semantic: {
    success: createColor(greenPalette[600].hex),
    warning: createColor(yellowPalette[500].hex),
    error: createColor(redPalette[500].hex),
    info: createColor("#38BDF8"),
  },
};

const cloudBaseTheme = createTheme(
  {
    name: "Cloud",
    themeName: "cloud",
    mode: "dark",
    useSystem: false,
    version: "1.0.0",
  },
  cloudColors,
);

export const cloudTheme: Theme = {
  ...cloudBaseTheme,
  typography: {
    ...cloudBaseTheme.typography,
    fontFamily: {
      base: "'Outfit', system-ui, sans-serif",
      heading: "'Plus Jakarta Sans', system-ui, sans-serif",
      monospace: "'Fira Code', monospace",
    },
  },
  shadows: {
    ...cloudBaseTheme.shadows,
    md: "0 8px 24px rgba(96, 165, 250, 0.18)",
    lg: "0 16px 40px rgba(56, 189, 248, 0.25)",
    xl: "0 28px 72px rgba(11, 19, 43, 0.5)",
  },
};

export default cloudTheme;
