import { ColorDefinition, RGBColor } from "../types";
import ColorUtils from "../utils/color-utils";

class CssVariableManager {
  private cache: Map<string, string> = new Map();
  private primaryColor: string;
  private secondaryColor: string;
  private neutralBaseColor: string = "#808080"; // Medium gray as default neutral base

  constructor(
    primaryColor: string = "#3b82f6",
    secondaryColor: string = "#10b981",
  ) {
    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;
    this.generateColorPalette();
  }

  /**
   * Generates a complete color palette with variations 100-900 for primary, secondary, and neutral
   */
  private generateColorPalette(): void {
    // Generate primary color variations (100-900)
    const primaryHsl = ColorUtils.hexToHsl(this.primaryColor);
    this.generateColorVariations("primary", primaryHsl);

    // Generate secondary color variations (100-900)
    const secondaryHsl = ColorUtils.hexToHsl(this.secondaryColor);
    this.generateColorVariations("secondary", secondaryHsl);

    // Generate neutral color variations (100-900)
    const neutralHsl = ColorUtils.hexToHsl(this.neutralBaseColor);
    this.generateNeutralVariations(neutralHsl);
  }

  /**
   * Set the primary and secondary colors and regenerate the palette
   */
  setThemeColors(primaryColor: string, secondaryColor: string): void {
    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;
    this.generateColorPalette();
  }

  /**
   * Generates color variations from 100-900 for a given base color
   */
  private generateColorVariations(
    colorName: string,
    baseHsl: { h: number; s: number; l: number },
  ): void {
    // For 100-900 scale:
    // - 500 is the base color
    // - Lower numbers are lighter (higher lightness)
    // - Higher numbers are darker (lower lightness)

    const variations = [
      { level: 50, lightness: 0.97 }, // Very light
      { level: 100, lightness: 0.95 },
      { level: 200, lightness: 0.85 },
      { level: 300, lightness: 0.75 },
      { level: 400, lightness: 0.65 },
      { level: 500, lightness: 0.55 }, // Base
      { level: 600, lightness: 0.45 },
      { level: 700, lightness: 0.35 },
      { level: 800, lightness: 0.25 },
      { level: 900, lightness: 0.15 }, // Very dark
      { level: 950, lightness: 0.08 }, // Extremely dark
    ];

    variations.forEach(({ level, lightness }) => {
      // Create a new HSL with the same hue and saturation, but adjusted lightness
      const newHsl = {
        h: baseHsl.h,
        s: level < 500 ? Math.max(baseHsl.s * 0.9, 0.1) : baseHsl.s, // Slightly desaturate lighter shades
        l: lightness,
      };

      // Convert to hex
      const rgb = ColorUtils.hslToRgb(newHsl);
      const hex = ColorUtils.rgbToHex(rgb);

      // Store in cache
      const varName = `--color-${colorName}-${level}`;
      this.cache.set(varName, hex);
    });
  }

  /**
   * Generates neutral color variations from 100-900
   * Neutral colors typically have very low saturation
   */
  private generateNeutralVariations(baseHsl: {
    h: number;
    s: number;
    l: number;
  }): void {
    // For neutrals, we want very low saturation
    const neutralHsl = { ...baseHsl, s: 0.05 };

    const variations = [
      { level: 50, lightness: 0.99 }, // Almost white
      { level: 100, lightness: 0.98 },
      { level: 200, lightness: 0.93 },
      { level: 300, lightness: 0.85 },
      { level: 400, lightness: 0.75 },
      { level: 500, lightness: 0.62 }, // Middle gray
      { level: 600, lightness: 0.48 },
      { level: 700, lightness: 0.35 },
      { level: 800, lightness: 0.22 },
      { level: 900, lightness: 0.1 }, // Almost black
      { level: 950, lightness: 0.05 }, // Extremely dark
    ];

    variations.forEach(({ level, lightness }) => {
      const newHsl = { ...neutralHsl, l: lightness };
      const rgb = ColorUtils.hslToRgb(newHsl);
      const hex = ColorUtils.rgbToHex(rgb);

      const varName = `--color-neutral-${level}`;
      this.cache.set(varName, hex);
    });
  }

  /**
   * Set a specific color variable
   * Used by the theme system to register theme colors
   */
  setColorVariable(variableName: string, colorValue: string): void {
    // Normalize variable name
    const normalizedName = variableName.startsWith("--")
      ? variableName
      : `--${variableName}`;

    // Store in cache
    this.cache.set(normalizedName, colorValue);
  }

  /**
   * Get all color variables as a record
   * Used by the theme system to generate CSS
   */
  getColorVariables(): Record<string, string> {
    const variables: Record<string, string> = {};

    // Convert the cache to a plain object
    this.cache.forEach((value, key) => {
      variables[key] = value;
    });

    return variables;
  }

  /**
   * Refresh the cache with values from the DOM
   * Useful when the theme might have been changed externally
   */
  refreshCache(): void {
    try {
      const styles = getComputedStyle(document.documentElement);
      // Try to get actual values from CSS if available
      for (const key of this.cache.keys()) {
        const value = styles.getPropertyValue(key).trim();
        if (value) {
          this.cache.set(key, value);
        }
      }
    } catch (error) {
      console.warn(
        "Could not access document styles, using generated values",
        error,
      );
    }
  }

  /**
   * Get a CSS variable value
   * Falls back to generated values if not found in the DOM
   */
  getValue(variableName: string): string {
    // Normalize variable name
    const normalizedName = variableName.replace(/var\(|\)/g, "").trim();
    const cssVarName = normalizedName.startsWith("--")
      ? normalizedName
      : `--${normalizedName}`;

    // Check cache first
    if (this.cache.has(cssVarName)) {
      return this.cache.get(cssVarName)!;
    }

    // Try to get from DOM if available
    try {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(cssVarName)
        .trim();

      if (value) {
        this.cache.set(cssVarName, value);
        return value;
      }
    } catch (_error) {
      // Silent fail - we'll use fallbacks
    }

    // If we get here, we don"t have a value - try to generate one
    if (cssVarName.match(/--color-(primary|secondary|neutral)-\d{2,3}/)) {
      // Extract color type and level
      const match = cssVarName.match(/--color-(\w+)-(\d{2,3})/);
      if (match) {
        const [, colorType, levelStr] = match;
        const level = parseInt(levelStr, 10);

        // Generate an appropriate color based on the pattern
        if (colorType === "primary") {
          return this.generateDynamicColor(this.primaryColor, level);
        } else if (colorType === "secondary") {
          return this.generateDynamicColor(this.secondaryColor, level);
        } else if (colorType === "neutral") {
          return this.generateDynamicNeutral(level);
        }
      }
    }

    // Default fallback
    console.warn(
      `No value found for CSS variable: ${cssVarName}, using default`,
    );
    return "#cccccc";
  }

  /**
   * Dynamically generates a color variation based on a base color and level
   */
  private generateDynamicColor(baseColor: string, level: number): string {
    const baseHsl = ColorUtils.hexToHsl(baseColor);
    const lightnessFactor = (1000 - level) / 1000; // 100 → 0.9, 900 → 0.1
    const newHsl = {
      h: baseHsl.h,
      s: level < 500 ? Math.max(baseHsl.s * 0.9, 0.1) : baseHsl.s,
      l: Math.min(Math.max(lightnessFactor, 0.05), 0.95),
    };

    const rgb = ColorUtils.hslToRgb(newHsl);
    return ColorUtils.rgbToHex(rgb);
  }

  /**
   * Dynamically generates a neutral color variation based on level
   */
  private generateDynamicNeutral(level: number): string {
    const baseHsl = ColorUtils.hexToHsl(this.neutralBaseColor);
    const lightnessFactor = (1000 - level) / 1000; // 100 → 0.9, 900 → 0.1
    const newHsl = {
      h: baseHsl.h,
      s: 0.05, // Very low saturation for neutrals
      l: Math.min(Math.max(lightnessFactor, 0.05), 0.98),
    };

    const rgb = ColorUtils.hslToRgb(newHsl);
    return ColorUtils.rgbToHex(rgb);
  }

  /**
   * Get a full ColorDefinition for a CSS variable
   * Includes hex, RGB, and HSL representations
   */
  getCssVariableColor(variableName: string): ColorDefinition {
    const colorValue = this.getValue(variableName);

    // Now parse the color value based on its format
    if (colorValue.startsWith("#")) {
      // It"s a hex color
      const rgbObj = ColorUtils.hexToRgb(colorValue) as RGBColor;
      // Check if rgbObj is properly structured
      if (typeof rgbObj !== "object" || rgbObj === null || !("r" in rgbObj)) {
        throw new Error(
          `Invalid RGB object returned from hexToRgb: ${JSON.stringify(rgbObj)}`,
        );
      }

      const rgb = `rgb(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b})`;
      const hsl = ColorUtils.rgbToHsl(rgbObj);
      return { hex: colorValue, rgb, hsl };
    } else if (colorValue.startsWith("rgb")) {
      // It"s an RGB color
      const rgbObj = this.parseRgbString(colorValue);
      const rgb = colorValue;
      const hex = ColorUtils.rgbToHex(rgbObj);
      const hsl = ColorUtils.rgbToHsl(rgbObj);
      return { hex, rgb, hsl };
    } else if (colorValue.startsWith("hsl")) {
      // It"s an HSL color
      const hsl = colorValue;
      const hslObj = this.parseHslString(colorValue);
      const rgbObj = ColorUtils.hslToRgb(hslObj) as RGBColor;
      const rgb = `rgb(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b})`;
      const hex = ColorUtils.rgbToHex(rgbObj);
      return { hex, rgb, hsl };
    } else if (colorValue.startsWith("var(")) {
      // It"s a reference to another CSS variable
      // Recursively resolve it
      const innerVarName = colorValue.replace(/var\(|\)/g, "").trim();
      return this.getCssVariableColor(innerVarName);
    }

    // Fallback - try to interpret as a named color or other format
    try {
      // Create a temporary element to leverage browser"s color parsing
      const tempEl = document.createElement("div");
      tempEl.style.color = colorValue;
      document.body.appendChild(tempEl);

      // Get computed style
      const computedColor = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);

      // Parse the computed color (should be in rgb format)
      const rgbObj = this.parseRgbString(computedColor);
      const rgb = computedColor;
      const hex = ColorUtils.rgbToHex(rgbObj);
      const hsl = ColorUtils.rgbToHsl(rgbObj);
      return { hex, rgb, hsl };
    } catch (_e) {
      // If browser parsing fails, throw an error
      throw new Error(`Could not parse CSS variable value: ${colorValue}`);
    }
  }

  /**
   * Apply all CSS variables to the document root
   * Used to apply the theme to the DOM
   */
  applyToDOM(): void {
    try {
      if (typeof document === "undefined") return;

      const root = document.documentElement;
      this.cache.forEach((value, key) => {
        root.style.setProperty(key, value);
      });
    } catch (error) {
      console.warn("Could not apply CSS variables to DOM", error);
    }
  }

  /**
   * Generate a CSS string with all variables
   * Useful for server-side rendering or creating stylesheets
   */
  generateCSSString(): string {
    let css = ":root {\n";

    this.cache.forEach((value, key) => {
      css += `  ${key}: ${value};\n`;
    });

    css += "}\n";
    return css;
  }

  /**
   * Clear all variables and reset to defaults
   */
  reset(): void {
    this.cache.clear();
    this.generateColorPalette();
  }

  // Helper to parse HSL string like "hsl(120, 100%, 50%)"
  private parseHslString(hslStr: string): { h: number; s: number; l: number } {
    const matches = hslStr.match(
      /hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/,
    );
    if (!matches) {
      throw new Error(`Invalid HSL string: ${hslStr}`);
    }
    return {
      h: parseInt(matches[1], 10),
      s: parseInt(matches[2], 10) / 100,
      l: parseInt(matches[3], 10) / 100,
    };
  }

  // Helper to parse RGB string like "rgb(255, 0, 0)"
  private parseRgbString(rgbStr: string): { r: number; g: number; b: number } {
    const matches = rgbStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (!matches) {
      throw new Error(`Invalid RGB string: ${rgbStr}`);
    }
    return {
      r: parseInt(matches[1], 10),
      g: parseInt(matches[2], 10),
      b: parseInt(matches[3], 10),
    };
  }
}

export default CssVariableManager;
