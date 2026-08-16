import {
  ColorDefinition,
  ColorAdjustments,
  HSLColor,
  ColorPaletteConfig,
  ValidationResult,
  ValidationError,
  RGBColor,
  ColorShades,
} from "../types";

/**
 * Custom error for color operations.
 */
export class ColorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ColorError";
  }
}

// Regex constants
const HEX_FULL_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const RGB_REGEX = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
const HSL_REGEX =
  /hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/;

/**
 * Color utility object
 */
export const ColorUtils = {
  //------------------------------------------------
  //                PRIVATE HELPERS
  //------------------------------------------------

  /**
   * Parse a hex string (with optional shorthand) into numeric RGB components.
   */
  _getRgbComponentsFromHex(hex: string): { r: number; g: number; b: number } {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
      // Expand shorthand #RGB => #RRGGBB
      hex = hex
        .split("")
        .map((c): string => c + c)
        .join("");
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  },

  /**
   * Convert numeric RGB components to a 6-digit uppercase hex string (#RRGGBB).
   */
  _rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number): string => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  },

  /**
   * Convert numeric RGB (0–255) to an HSLColor,
   * rounding hue and clamping s/l in [0..100].
   */
  _hslFromRgb(r: number, g: number, b: number): HSLColor {
    // Normalize to [0..1]
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;

    let h = 0;
    let s = 0;

    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    // Convert to degrees + percentages
    // 1) Round hue
    h = Math.round(h * 360);

    // 2) s, l => decimal but clamp to [0..100]
    s = s * 100;
    s = Math.min(100, Math.max(0, s));
    // If you only want 2 decimal places, do s = parseFloat(s.toFixed(2));

    let light = l * 100;
    light = Math.min(100, Math.max(0, light));
    // If you only want 2 decimal places, do light = parseFloat(light.toFixed(2));

    return {
      h,
      s,
      l: light,
    };
  },

  /**
   * Convert numeric h, s, l to an {r, g, b} object (0-255).
   */
  _hslToRgb(
    h: number,
    s: number,
    l: number,
  ): { r: number; g: number; b: number } {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0,
      g = 0,
      b = 0;

    if (hh >= 0 && hh < 1) {
      r = c;
      g = x;
    } else if (hh >= 1 && hh < 2) {
      r = x;
      g = c;
    } else if (hh >= 2 && hh < 3) {
      g = c;
      b = x;
    } else if (hh >= 3 && hh < 4) {
      g = x;
      b = c;
    } else if (hh >= 4 && hh < 5) {
      r = x;
      b = c;
    } else if (hh >= 5 && hh < 6) {
      r = c;
      b = x;
    }

    const m = l - c / 2;
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  },

  //------------------------------------------------
  //            DEPRECATED METHODS
  //------------------------------------------------

  /**
   * @deprecated
   * Use `createColorDefinition` + `validateColorDefinition` instead
   */
  createValidColorDefinition: (color: string): ColorDefinition => {
    console.warn(
      "[DEPRECATED] createValidColorDefinition => use createColorDefinition + validateColorDefinition",
    );
    // Now we rely on createColorDefinition
    const def = ColorUtils.createColorDefinition(color);
    // optionally validate
    // ... your validation logic, or none
    return def;
  },

  /**
   * @deprecated
   * Use `createPalette` instead
   */
  generatePalette: (config: ColorPaletteConfig): ColorDefinition[] => {
    console.warn("[DEPRECATED] generatePalette => use createPalette");
    return ColorUtils.createPalette(config.baseColor, config.shades || 10);
  },

  /**
   * @deprecated
   * Use `hslToRgb` instead
   */
  hslToRGB: (_hsl: string): string => {
    console.warn("[DEPRECATED] hslToRGB => use hslToRgb");
    return ColorUtils.hslToRgb(_hsl) as string;
  },

  /**
   * @deprecated
   * Use `createColorDefinition` or `ensureColorDefinition` instead
   */
  createColorObject: (
    color: string,
  ): { hex: string; rgb: string; hsl: string } => {
    console.warn(
      "[DEPRECATED] createColorObject => use createColorDefinition or ensureColorDefinition",
    );
    // Reuse createColorDefinition here
    const cd = ColorUtils.createColorDefinition(color);
    return {
      hex: cd.hex,
      rgb: cd.rgb,
      hsl: cd.hsl,
    };
  },

  //------------------------------------------------
  //             PUBLIC API
  //------------------------------------------------

  /**
   * Create a ColorDefinition from a hex *or* any recognized string (hex/rgb/hsl).
   */
  createColorDefinition(color: string): ColorDefinition {
    // If color is hex, just parse directly
    const normalized = ColorUtils.normalizeColor(color);
    const { r, g, b } = ColorUtils._getRgbComponentsFromHex(normalized);
    const hsl = ColorUtils._hslFromRgb(r, g, b);

    return {
      hex: normalized,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: ColorUtils.toHSL(hsl),
    };
  },

  /**
   * Adjust a color"s HSL by given offsets (hue, saturation, lightness, alpha).
   */
  adjustColor(
    color: ColorDefinition,
    adjustments: ColorAdjustments,
  ): ColorDefinition {
    try {
      const parsed = ColorUtils.parseHSL(color.hsl);
      const newH = (((parsed.h + (adjustments.hue ?? 0)) % 360) + 360) % 360;
      const newHSL: HSLColor = {
        h: newH,
        s: Math.max(0, Math.min(100, parsed.s + (adjustments.saturation ?? 0))),
        l: Math.max(0, Math.min(100, parsed.l + (adjustments.lightness ?? 0))),
      };
      const newHSLString = ColorUtils.toHSL(newHSL, adjustments.alpha);
      return {
        hex: ColorUtils.hslToHex(newHSL), // Using the new overload
        rgb: ColorUtils.hslToRgb(newHSLString) as string,
        hsl: newHSLString,
        alpha: adjustments.alpha ?? color.alpha,
      };
    } catch (error) {
      throw new ColorError(
        `Failed to adjust color: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  /**
   * Lighten a color by a given amount (0-100).
   */
  lighten(color: ColorDefinition, amount: number): ColorDefinition {
    return ColorUtils.adjustColor(color, { lightness: amount });
  },

  /**
   * Darken a color by a given amount (0-100).
   */
  darken(color: ColorDefinition, amount: number): ColorDefinition {
    return ColorUtils.adjustColor(color, { lightness: -amount });
  },

  /**
   * Mix two HSL(A) color strings with a given weight.
   */
  mix(color1: string, color2: string, weight: number = 0.5): string {
    try {
      const c1 = ColorUtils.parseHSL(color1);
      const c2 = ColorUtils.parseHSL(color2);
      const mixed: HSLColor = {
        h: Math.round(c1.h * (1 - weight) + c2.h * weight),
        s: Math.round(c1.s * (1 - weight) + c2.s * weight),
        l: Math.round(c1.l * (1 - weight) + c2.l * weight),
      };
      return ColorUtils.toHSL(mixed);
    } catch (error) {
      throw new ColorError(
        `Failed to mix colors: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  /**
   * Generate a palette of ColorDefinition objects from a base hex color.
   */
  createPalette(baseHex: string, steps: number = 9): ColorDefinition[] {
    try {
      const baseHsl = ColorUtils.hexToHsl(baseHex);
      return Array.from({ length: steps }, (_next, i): ColorDefinition => {
        // Lightness from 0 to 100
        const lightness = (100 / (steps - 1)) * i;
        const hslObj: HSLColor = { h: baseHsl.h, s: baseHsl.s, l: lightness };
        const hslString = ColorUtils.toHSL(hslObj);
        return {
          hex: ColorUtils.hslToHex(hslObj), // Using the new overload
          rgb: ColorUtils.hslToRgb(hslString) as string,
          hsl: hslString,
        };
      });
    } catch (error) {
      throw new ColorError(
        `Failed to create palette from "${baseHex}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  /**
   * Convert an HSLColor to an HSL/HSLA string.
   */
  toHSL(color: HSLColor, alpha?: number): string {
    const { h, s, l } = color;
    return alpha !== undefined
      ? `hsla(${h}, ${s}%, ${l}%, ${alpha})`
      : `hsl(${h}, ${s}%, ${l}%)`;
  },

  /**
   * Parse an HSL/HSLA string, rounding hue and clamping s/l.
   * For example: "hsl(221.3, 77.4%, -5%)" => hue=221, s=77.4 clamped to e.g. 77.4, l=0
   */
  parseHSL(color: string): HSLColor {
    const match = color.match(
      /hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/,
    );
    if (!match) {
      throw new ColorError(`Invalid HSL(A) color format: ${color}`);
    }

    // Convert to floats
    let hue = parseFloat(match[1]);
    let sat = parseFloat(match[2]);
    let lig = parseFloat(match[3]);

    // 1) Round hue
    hue = Math.round(hue);
    // 2) s, l => decimal but clamp to [0..100]
    sat = Math.min(100, Math.max(0, sat));
    lig = Math.min(100, Math.max(0, lig));
    // if you want 2 decimals for s/l => sat = +sat.toFixed(2); etc.

    return { h: hue, s: sat, l: lig };
  },

  /**
   * Convert a hex color string or object to RGB.
   * @param hex - Hex color as string or object with hex property
   * @param format - Output format, either "string" or "object"
   * @returns RGB color as string or object based on format parameter
   */
  hexToRgb(
    hex: string | { hex: string },
    format: "string" | "object" = "string",
  ): string | { r: number; g: number; b: number } {
    let hexValue: string;

    if (typeof hex === "string") {
      hexValue = hex;
    } else {
      // It's an object with a hex property
      hexValue = hex.hex;
    }

    const rgbComponents = ColorUtils._getRgbComponentsFromHex(hexValue);

    if (format === "object") {
      return rgbComponents;
    }

    const { r, g, b } = rgbComponents;
    return `rgb(${r}, ${g}, ${b})`;
  },

  /**
   * Convert a hex color to an HSLColor object.
   */
  hexToHsl(hex: string): HSLColor {
    const { r, g, b } = ColorUtils._getRgbComponentsFromHex(hex);
    return ColorUtils._hslFromRgb(r, g, b);
  },

  /**
   * Convert an HSL string or HSLColor object to RGB.
   * @param hsl - HSL color as string or object
   * @param format - Output format, either "string" or "object"
   * @returns RGB color as string or object based on format parameter
   */
  hslToRgb(
    hsl: string | HSLColor,
    format: "string" | "object" = "string",
  ): string | RGBColor {
    let h: number, s: number, l: number;

    if (typeof hsl === "string") {
      const parsed = ColorUtils.parseHSL(hsl);
      h = parsed.h;
      s = parsed.s;
      l = parsed.l;
    } else {
      // It's an HSLColor object
      h = hsl.h;
      s = hsl.s;
      l = hsl.l;
    }

    const rgbComponents = ColorUtils._hslToRgb(h, s, l);

    if (format === "object") {
      return rgbComponents; // Returns { r, g, b } object
    }

    const { r, g, b } = rgbComponents;
    return `rgb(${r}, ${g}, ${b})`;
  },

  /**
   * Convert an HSL string or HSLColor object to a hex color.
   * Overloaded to accept either an HSL string or an HSLColor object.
   */
  hslToHex(hsl: string | HSLColor): string {
    if (typeof hsl === "string") {
      const { h, s, l } = ColorUtils.parseHSL(hsl);
      const { r, g, b } = ColorUtils._hslToRgb(h, s, l);
      return ColorUtils._rgbToHex(r, g, b);
    } else {
      // It"s an HSLColor object
      const { h, s, l } = hsl;
      const { r, g, b } = ColorUtils._hslToRgb(h, s, l);
      return ColorUtils._rgbToHex(r, g, b);
    }
  },

  /**
   * Convert an RGB string or RGBColor object to hex format (e.g., "#rrggbb").
   */
  rgbToHex(rgb: string | RGBColor): string {
    let r: number, g: number, b: number;

    if (typeof rgb === "string") {
      const match = rgb.match(/\d+/g);
      if (!match) throw new ColorError(`Invalid RGB color: ${rgb}`);
      [r, g, b] = match.map(Number);
    } else {
      // It"s an RGBColor object
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }

    return ColorUtils._rgbToHex(r, g, b);
  },

  /**
   * Convert an RGB string or RGBColor object to an HSL string.
   */
  rgbToHsl(rgb: string | RGBColor): string {
    let ri: number, gi: number, bi: number;

    if (typeof rgb === "string") {
      const match = rgb.match(/\d+/g);
      if (!match) throw new ColorError(`Invalid RGB color: ${rgb}`);
      [ri, gi, bi] = match.map((n): number => parseInt(n, 10));
    } else {
      // It"s an RGBColor object
      ri = rgb.r;
      gi = rgb.g;
      bi = rgb.b;
    }

    // Normalize to [0..1]
    ri /= 255;
    gi /= 255;
    bi /= 255;

    const max = Math.max(ri, gi, bi);
    const min = Math.min(ri, gi, bi);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case ri:
          h = (gi - bi) / d + (gi < bi ? 6 : 0);
          break;
        case gi:
          h = (bi - ri) / d + 2;
          break;
        case bi:
          h = (ri - gi) / d + 4;
          break;
      }
      h /= 6;
    }

    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);
    return `hsl(${hDeg}, ${sPct}%, ${lPct}%)`;
  },

  /**
   * Normalize a color string to a 6-digit hex (e.g., "#rrggbb").
   */
  normalizeColor(color: string): string {
    color = color.trim().toLowerCase();
    const rgbMatch = color.match(RGB_REGEX);
    if (rgbMatch) {
      const [_, r, g, b] = rgbMatch;
      return ColorUtils._rgbToHex(Number(r), Number(g), Number(b));
    }
    if (color.match(/^#[0-9a-f]{3}$/)) {
      // Expand #rgb => #rrggbb
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    if (color.match(HEX_FULL_REGEX)) {
      return color;
    }
    throw new ColorError(`Invalid color format: ${color}`);
  },

  /**
   * Check if a color string is valid by attempting to normalize it.
   */
  isValidColor(color: string): boolean {
    try {
      ColorUtils.normalizeColor(color);
      return true;
    } catch {
      return false;
    }
  },

  ensureRgbString(rgb: string | { r: number; g: number; b: number }): string {
    if (typeof rgb === "string") {
      return rgb;
    }
    const { r, g, b } = rgb;
    return `rgb(${r}, ${g}, ${b})`;
  },

  /**
   * Ensure a partial ColorDefinition has hex/rgb/hsl.
   */
  ensureColorDefinition(color: Partial<ColorDefinition>): ColorDefinition {
    // If we already have all 3, done
    if (ColorUtils.isCompleteColorDefinition(color)) {
      return color as ColorDefinition;
    }

    const result: Partial<ColorDefinition> = { ...color };
    if (!result.hex && !result.rgb && !result.hsl) {
      throw new ColorError(
        "Color definition must have at least hex, rgb, or hsl",
      );
    }

    try {
      // Priority: hex > rgb > hsl
      if (result.hex) {
        if (!result.rgb) {
          result.rgb = ColorUtils.hexToRgb(result.hex) as string;
        }
        if (!result.hsl && result.rgb) {
          result.hsl = ColorUtils.rgbToHsl(result.rgb);
        }
      } else if (result.rgb) {
        if (!result.hex) {
          result.hex = ColorUtils.rgbToHex(result.rgb);
        }
        if (!result.hsl) {
          result.hsl = ColorUtils.rgbToHsl(result.rgb);
        }
      } else if (result.hsl) {
        // Derive from HSL
        const rgb = ColorUtils.hslToRgb(result.hsl);
        if (!rgb) {
          throw new ColorError("Failed to convert HSL to RGB");
        }
        result.rgb = rgb as string;
        result.hex = ColorUtils.rgbToHex(rgb);
      }

      if (color.alpha !== undefined) {
        result.alpha = color.alpha;
      }
    } catch (error: unknown) {
      let errorMessage: string;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        errorMessage = String(error);
      }

      throw new ColorError(
        `Failed to ensure color definition: ${errorMessage}`,
      );
    }

    // Final validation
    if (!ColorUtils.isCompleteColorDefinition(result)) {
      throw new ColorError("Failed to generate complete color definition");
    }

    return result as ColorDefinition;
  },

  /**
   * Check if a partial color definition has hex+rgb+hsl.
   */
  isCompleteColorDefinition(color: Partial<ColorDefinition>): boolean {
    return !!(color.hex && color.rgb && color.hsl);
  },

  /**
   * Determine the contrast ratio (WCAG) between two ColorDefinitions (background vs. foreground).
   */
  getContrastRatio(
    background: ColorDefinition,
    foreground: ColorDefinition,
  ): number {
    const getLuminance = (c: ColorDefinition): number => {
      const { r, g, b } = ColorUtils.getRgbComponents(c.hex);
      const srgb = [r, g, b].map((val): number => val / 255);
      const linear = srgb.map((ch): number =>
        ch <= 0.03928 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4),
      );
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };

    const lumBg = getLuminance(background);
    const lumFg = getLuminance(foreground);
    const lighter = Math.max(lumBg, lumFg);
    const darker = Math.min(lumBg, lumFg);
    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Return numeric (r,g,b) from a hex color.
   */
  getRgbComponents(color: string): { r: number; g: number; b: number } {
    const normalized = ColorUtils.normalizeColor(color);
    return ColorUtils._getRgbComponentsFromHex(normalized);
  },

  /**
   * Classify a color as "dark" (needs light contrast text) by linearizing RGB
   * channels, calculating relative luminance, and choosing the text color with
   * better contrast ratio.
   */
  isColorDark(color: string, _threshold?: number): boolean {
    const { r, g, b } = ColorUtils.getRgbComponents(color);

    // Linearize the RGB channels
    const srgb = [r, g, b].map((val): number => val / 255);
    const linear = srgb.map((ch): number =>
      ch <= 0.03928 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4),
    );

    // Calculate relative luminance
    const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];

    // Calculate contrast ratios with white and black
    const contrastWithWhite = (1.05) / (luminance + 0.05);
    const contrastWithBlack = (luminance + 0.05) / (0.05);

    // Choose white text if it has better contrast (meaning the color is dark)
    return contrastWithWhite > contrastWithBlack;
  },

  /**
   * [Optional debug] Print color details.
   */
  debugColor(color: string): void {
    console.group("Color Debugger");
    console.log("Input:", color);
    try {
      const normalized = ColorUtils.normalizeColor(color);
      console.log("Normalized hex:", normalized);

      const comps = ColorUtils.getRgbComponents(normalized);
      console.log("RGB components:", comps);

      const colorDef = ColorUtils.createColorDefinition(normalized);
      console.log("Full color definition:", colorDef);
    } catch (err) {
      console.error("Failed to debug color:", err);
    }
    console.groupEnd();
  },

  //------------------------------------------------
  //   Basic Validation / Checking (Optional)
  //------------------------------------------------

  /**
   * Validate a ColorDefinition object thoroughly (hex, rgb, hsl).
   * Returns a ValidationResult with any errors.
   */
  validateColorDefinition(
    color: ColorDefinition,
    path: string,
  ): ValidationResult {
    console.group(`Validating color definition at ${path}`);
    try {
      const errors = ColorUtils._collectValidationErrors(color, path);
      if (errors.length > 0) {
        console.warn("Validation failed:", errors[0]);
        console.groupEnd();
        // Return isValid=false with the full array of errors
        return {
          isValid: false,
          path,
          value: color,
          errors,
        };
      }
      console.log("Validation passed");
      console.groupEnd();
      // Return isValid=true with no errors
      return {
        isValid: true,
        path,
        value: color,
      };
    } catch (error) {
      console.error("Validation error:", error);
      console.groupEnd();
      // Return isValid=false with a single unexpected error
      return {
        isValid: false,
        path,
        value: color,
        errors: [
          {
            code: "UNEXPECTED_ERROR",
            message: "Unexpected error during color validation",
            path,
            details: { error: String(error) },
          },
        ],
      };
    }
  },

  /**
   * Returns true if color definition passes validation, otherwise false.
   */
  isValidColorDefinition(color: unknown, path: string = "color"): boolean {
    if (!color || typeof color !== "object") return false;
    const cd = color as ColorDefinition;
    const errors = ColorUtils._collectValidationErrors(cd, path);
    return errors.length === 0;
  },

  /**
   * Generate a palette of colors using an exponential distribution for lightness.
   * This creates more variation in the middle tones while compressing the extremes.
   *
   * @param baseHex - Base color in hex format
   * @param steps - Number of shades to generate
   * @param intensity - Controls the exponential curve (1.0 = linear, higher = more contrast)
   * @returns Array of ColorDefinition objects
   */
  createExponentialPalette(
    baseHex: string,
    steps: number = 9,
    intensity: number = 2.0,
  ): ColorDefinition[] {
    try {
      const baseHsl = ColorUtils.hexToHsl(baseHex);

      return Array.from({ length: steps }, (_next, i): ColorDefinition => {
        // Calculate position in the range [0, 1]
        const position = i / (steps - 1);

        // Apply exponential function to create non-linear distribution
        // For intensity > 1, this will create more contrast
        // For intensity < 1, this will reduce contrast
        let lightness: number;

        if (position <= 0.5) {
          // For darker half: exponential curve starting from 0
          lightness = 50 * Math.pow(position * 2, intensity);
        } else {
          // For lighter half: exponential curve from 50 to 100
          lightness = 100 - 50 * Math.pow((1 - position) * 2, intensity);
        }

        // Ensure lightness is within bounds
        lightness = Math.min(100, Math.max(0, lightness));

        const hslObj: HSLColor = {
          h: baseHsl.h,
          s: baseHsl.s,
          l: lightness,
        };

        const hslString = ColorUtils.toHSL(hslObj);

        return {
          hex: ColorUtils.hslToHex(hslObj),
          rgb: ColorUtils.hslToRgb(hslString) as string,
          hsl: hslString,
        };
      });
    } catch (error) {
      throw new ColorError(
        `Failed to create exponential palette from "${baseHex}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  /**
   * Generate a palette of colors using perceptual adjustments to create
   * visually uniform steps according to human perception.
   *
   * Uses a cubic easing function to better match human perception of lightness.
   *
   * @param baseHex - Base color in hex format
   * @param steps - Number of shades to generate
   * @returns Array of ColorDefinition objects
   */
  createPerceptualPalette(
    baseHex: string,
    steps: number = 9,
  ): ColorDefinition[] {
    try {
      const baseHsl = ColorUtils.hexToHsl(baseHex);

      // Perceptual adjustment function (cubic easing)
      const perceptualAdjust = (x: number): number => {
        // Cubic easing function: creates more visually uniform steps
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      };

      return Array.from({ length: steps }, (_next, i): ColorDefinition => {
        // Calculate position in the range [0, 1]
        const position = i / (steps - 1);

        // Apply perceptual adjustment
        const adjustedPosition = perceptualAdjust(position);

        // Calculate lightness based on adjusted position
        const lightness = adjustedPosition * 100;

        // For more vibrant colors in midtones, optionally adjust saturation
        // Saturation peaks at around 50% lightness
        const saturationAdjustment = 1 - (Math.abs(lightness - 50) / 50) * 0.2;
        const adjustedSaturation = baseHsl.s * saturationAdjustment;

        const hslObj: HSLColor = {
          h: baseHsl.h,
          s: adjustedSaturation, // Optional: adjust saturation for more vibrant midtones
          l: lightness,
        };

        const hslString = ColorUtils.toHSL(hslObj);

        return {
          hex: ColorUtils.hslToHex(hslObj),
          rgb: ColorUtils.hslToRgb(hslString) as string,
          hsl: hslString,
        };
      });
    } catch (error) {
      throw new ColorError(
        `Failed to create perceptual palette from "${baseHex}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  createColorShades(baseColor: string, contrastThreshold: number = 0.5): ColorShades {
    // Generate a palette with 10 colors (for 50, 100, 200, ... 900)
    const palette = this.createPalette(baseColor, 10);

    // Create a ColorShades object with the required numeric properties
    return {
      50: palette[0],
      100: palette[1],
      200: palette[2],
      300: palette[3],
      400: palette[4],
      500: palette[5],
      600: palette[6],
      700: palette[7],
      800: palette[8],
      900: palette[9],
      base: baseColor,
      contrast: palette.map((shade) =>
        this.isColorDark(shade.hex, contrastThreshold) ? "#FFFFFF" : "#000000",
      ),
    };
  },

  /**
   * [Private] Gather potential validation errors for a ColorDefinition.
   */
  _collectValidationErrors(
    color: ColorDefinition,
    path: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1) Hex check
    if (!color.hex || !HEX_FULL_REGEX.test(color.hex)) {
      errors.push({
        code: "COLOR_INVALID_HEX",
        message: "Invalid or missing hex format (#RGB or #RRGGBB)",
        path: `${path}.hex`,
        details: { received: color.hex },
      });
    }

    // 2) RGB check
    if (!color.rgb || !RGB_REGEX.test(color.rgb)) {
      errors.push({
        code: "COLOR_INVALID_RGB",
        message: "Invalid or missing RGB format (rgb(r,g,b))",
        path: `${path}.rgb`,
        details: { received: color.rgb },
      });
    }

    // 3) HSL check
    if (!color.hsl || !HSL_REGEX.test(color.hsl)) {
      errors.push({
        code: "COLOR_INVALID_HSL",
        message: "Invalid or missing HSL format (hsl(h,s%,l%))",
        path: `${path}.hsl`,
        details: { received: color.hsl },
      });
    }

    // [Optional] cross-check hex/rgb for consistency
    // ...
    return errors;
  },
};

export default ColorUtils;
