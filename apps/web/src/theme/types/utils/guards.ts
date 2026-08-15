// src/types/theme/guards.ts
import type { ThemeName, ThemeMode } from "../core/base";
import type { ThemeConfig, ThemeState } from "../core/config";

/**
 * Type guard to check if a value is a valid Theme Mode
 */
export const isThemeMode = (value: unknown): value is ThemeMode => {
  if (typeof value !== "string") return false;
  return ["light", "dark"].includes(value);
};

/**
 * Type guard to check if a value is a valid Color Scheme
 */
export const isColorScheme = (value: unknown): value is ThemeName => {
  if (typeof value !== "string") return false;
  // Must list every ThemeName member. It previously omitted "cosmic-frontier",
  // which made isThemeConfig reject the shipped default theme.
  return [
    "classic",
    "forest",
    "ocean",
    "phoenix",
    "lavender",
    "cloud",
    "cosmic-frontier",
    "highveld",
  ].includes(value);
};

/**
 * Type guard to check if a value is a valid Theme Config
 */
export const isThemeConfig = (value: unknown): value is ThemeConfig => {
  if (!value || typeof value !== "object") return false;

  const config = value as Partial<ThemeConfig>;
  return (
    "mode" in config &&
    isThemeMode(config.mode) &&
    "colorScheme" in config &&
    isColorScheme(config.themeName) &&
    "useSystem" in config &&
    typeof config.useSystem === "boolean"
  );
};

/**
 * Type guard to check if a value is a valid Theme State
 */
export const isThemeState = (value: unknown): value is ThemeState => {
  if (!isThemeConfig(value)) return false;

  const state = value as Partial<ThemeState>;
  return (
    "systemMode" in state &&
    isThemeMode(state.systemMode) &&
    "initialized" in state &&
    typeof state.initialized === "boolean" &&
    "timestamp" in state &&
    typeof state.timestamp === "number" &&
    (!state.previous ||
      (isThemeMode(state.previous.mode) &&
        isColorScheme(state.previous.themeName)))
  );
};

/**
 * Assertion functions
 */
export const assertThemeMode = (value: unknown): asserts value is ThemeMode => {
  if (!isThemeMode(value)) {
    throw new Error(`Invalid theme mode: ${String(value)}`);
  }
};

export const assertColorScheme = (
  value: unknown,
): asserts value is ThemeName => {
  if (!isColorScheme(value)) {
    throw new Error(`Invalid color scheme: ${String(value)}`);
  }
};

export const assertThemeConfig = (
  value: unknown,
): asserts value is ThemeConfig => {
  if (!isThemeConfig(value)) {
    throw new Error(`Invalid theme configuration: ${JSON.stringify(value)}`);
  }
};

export const assertThemeState = (
  value: unknown,
): asserts value is ThemeState => {
  if (!isThemeState(value)) {
    throw new Error(`Invalid theme state: ${JSON.stringify(value)}`);
  }
};
