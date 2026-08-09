import { ThemeName, ThemeMode } from "@/theme/types";
import { AVAILABLE_THEME_NAMES } from "../constants/themes/catalog";

export const REQUIRED_BASE_COLORS = ["primary", "secondary", "accent"] as const;

export const REQUIRED_MODE_COLORS = ["background", "text", "border"] as const;

export const VALID_COLOR_SCHEMES: ThemeName[] = [...AVAILABLE_THEME_NAMES];

export const VALID_MODES: ThemeMode[] = ["light", "dark"];
