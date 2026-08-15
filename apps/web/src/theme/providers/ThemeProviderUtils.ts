import { ThemeName, ThemeMode, ThemeClassSuffix, Theme } from "@/theme/types";
import { ThemeCore } from "../core/theme-core";

export const getThemeClassNames = (
  scheme: ThemeName,
): Record<string, string> => {
  const customClasses = ThemeCore.getInstance().getThemeClasses(scheme) || {};
  return {
    base: `theme-${scheme}`,
    light: `theme-${scheme}-light`,
    dark: `theme-${scheme}-dark`,
    ...customClasses,
  };
};

export const getSpecificClass = (
  themeName: ThemeName,
  suffix: ThemeClassSuffix,
): string => {
  const classes = getThemeClassNames(themeName);
  return classes[suffix] || classes.base;
};

export const isThemeClass = (className: string): boolean => {
  // TODO: Implement more robust check using ThemeCore
  const themeCore = ThemeCore.getInstance();
  const allThemes = Object.keys(
    themeCore.getAllComponentVariants(),
  ) as ThemeName[];
  return allThemes.some((themeName) => {
    const classes = themeCore.getThemeClasses(themeName);
    return Object.values(classes).includes(className);
  });
};

export const replaceThemeClasses = (
  currentClasses: string,
  newScheme: ThemeName,
  currentMode: ThemeMode,
): string => {
  const classArray = currentClasses.split(" ");
  const filteredClasses = classArray.filter((cls) => !isThemeClass(cls));
  const newClasses = getThemeClassNames(newScheme);
  return [
    ...filteredClasses,
    newClasses.base,
    newClasses[currentMode as keyof Theme],
  ].join(" ");
};

export const getAllThemeClasses = (): Record<
  ThemeName,
  Record<string, string>
> => {
  const themeCore = ThemeCore.getInstance();
  const allThemes = Object.keys(
    themeCore.getAllComponentVariants(),
  ) as ThemeName[];
  return allThemes.reduce(
    (acc, themeName) => {
      acc[themeName] = themeCore.getThemeClasses(themeName);
      return acc;
    },
    {} as Record<ThemeName, Record<string, string>>,
  );
};
