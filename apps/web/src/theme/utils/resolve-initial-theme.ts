import { THEME_STORAGE_CONSTANTS } from "../constants/storage/theme-storage-constants";
import {
  DEFAULT_THEME_NAME,
  isAvailableThemeName,
} from "../constants/themes/catalog";
import type { ThemeName } from "../types";

export function readQueryThemeName(): ThemeName | null {
  if (typeof window === "undefined") {
    return null;
  }

  const requested = new URLSearchParams(window.location.search).get("theme");
  return isAvailableThemeName(requested) ? requested : null;
}

export function readStoredThemeName(): ThemeName | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(THEME_STORAGE_CONSTANTS.KEYS.THEME_NAME);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isAvailableThemeName(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistThemeName(themeName: ThemeName): void {
  if (typeof window === "undefined" || !isAvailableThemeName(themeName)) {
    return;
  }

  localStorage.setItem(
    THEME_STORAGE_CONSTANTS.KEYS.THEME_NAME,
    JSON.stringify(themeName),
  );
}

export function resolveInitialThemeName(
  fallback: ThemeName = DEFAULT_THEME_NAME,
): ThemeName {
  const fromQuery = readQueryThemeName();
  if (fromQuery) {
    persistThemeName(fromQuery);
    return fromQuery;
  }

  return readStoredThemeName() ?? fallback;
}
