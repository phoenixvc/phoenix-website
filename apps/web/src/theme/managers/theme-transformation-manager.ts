// theme/core/theme-transformation-manager.ts

import {
  ThemeScheme,
  ThemeSchemeInitial,
  ThemeColors,
  ColorDefinition,
  ColorShades,
  ThemeName,
  ThemeMode,
  ProcessedBaseColors,
  InitialBaseColors,
  TransformedColorObject,
  ShadeLevel,
  REQUIRED_SEMANTIC_COLORS,
  SemanticColors,
  TransformationConfig,
  TransformOptions,
  DarkModeOptions,
  LightModeOptions,
} from "../types";
import { ColorUtils } from "../utils/color-utils";
import { ThemeRegistry } from "../registry/theme-registry";
import { themeValidationManager } from "./theme-validation-manager";
import { DEFAULT_THEME } from "../constants/tokens";

/**
 * ThemeTransformationManager
 *
 * Responsible for transforming theme data from initial definitions to fully processed themes.
 * Handles the conversion of color definitions to color shades and ensures theme data is
 * properly structured for use in the theme system.
 */
export class ThemeTransformationManager {
  private config: TransformationConfig;
  private registry: ThemeRegistry | null = null;

  constructor(
    config?: Partial<TransformationConfig>,
    registry?: ThemeRegistry,
  ) {
    // Default configuration with sensible defaults
    this.config = {
      defaultMode: config?.defaultMode || "dark",
      shadeCount: config?.shadeCount || 9,
      shadeIntensity: config?.shadeIntensity || 0.1,
      contrastThreshold: config?.contrastThreshold || 0.5,
      algorithm: config?.algorithm || "linear",
      preserveMetadata:
        config?.preserveMetadata !== undefined ? config.preserveMetadata : true,
      transformOptions: config?.transformOptions || {
        darkMode: {
          darkenBackground: 15,
          lightenText: 15,
          adjustSaturation: -10,
        },
        lightMode: {
          lightenBackground: 15,
          darkenText: 15,
          adjustSaturation: 10,
        },
      },
    };

    if (registry) {
      this.registry = registry;
    }
  }

  /**
   * Set the theme registry
   */
  setRegistry(registry: ThemeRegistry): void {
    this.registry = registry;
  }

  /**
   * Transform a complete theme from initial to processed format
   *
   * @param input The initial theme data or single scheme
   * @param name Optional name for the theme if input is a single scheme
   * @param options Optional transformation options
   * @returns Fully processed theme colors
   */
  transform(
    input: ThemeSchemeInitial | ThemeScheme | ThemeColors,
    name?: ThemeName,
    options?: TransformOptions,
  ): ThemeColors {
    console.group("[ThemeTransformationManager] Transforming theme");

    try {
      // Merge options with defaults
      const transformOptions = options ||
        this.config.transformOptions || {
          darkMode: {
            darkenBackground: 15,
            lightenText: 15,
            adjustSaturation: -10,
          },
          lightMode: {
            lightenBackground: 15,
            darkenText: 15,
            adjustSaturation: 10,
          },
        };

      // If it"s a single scheme (either initial or processed)
      if (this.isThemeSchemeInitial(input)) {
        const schemeName = name || DEFAULT_THEME;
        console.log(
          `[ThemeTransformationManager] Processing initial scheme as "${schemeName}"`,
        );

        // Extract metadata if available
        let _metadata = undefined;
        if (this.config.preserveMetadata && "metadata" in input) {
          _metadata = input.metadata;
        }

        // Apply custom transform config if provided
        const transformConfig =
          "transformConfig" in input ? input.transformConfig : undefined;
        if (transformConfig) {
          // Use temporary config for this transformation
          const tempConfig = { ...this.config };

          if (transformConfig.shadeCount !== undefined)
            tempConfig.shadeCount = transformConfig.shadeCount;
          if (transformConfig.shadeIntensity !== undefined)
            tempConfig.shadeIntensity = transformConfig.shadeIntensity;
          if (transformConfig.contrastThreshold !== undefined)
            tempConfig.contrastThreshold = transformConfig.contrastThreshold;
          if (transformConfig.algorithm !== undefined)
            tempConfig.algorithm = transformConfig.algorithm;

          const originalConfig = this.config;
          this.config = tempConfig;

          // Transform with custom config
          const result = this.transformSchemeWithOptions(
            input,
            transformOptions,
          );

          // Restore original config
          this.config = originalConfig;

          const semantic: SemanticColors | undefined =
            "semantic" in input
              ? (input.semantic as SemanticColors)
              : undefined;

          return {
            schemes: {
              [schemeName]: result,
            },
            semantic,
          };
        } else {
          // Transform with default config
          const semantic: SemanticColors | undefined =
            "semantic" in input
              ? (input.semantic as SemanticColors)
              : undefined;

          return {
            schemes: {
              [schemeName]: this.transformSchemeWithOptions(
                input,
                transformOptions,
              ),
            },
            semantic,
          };
        }
      } else if (this.isThemeScheme(input)) {
        const schemeName = name || DEFAULT_THEME;
        console.log(
          `[ThemeTransformationManager] Processing processed scheme as "${schemeName}"`,
        );

        return {
          schemes: {
            [schemeName]: this.ensureFullyProcessed(input),
          },
          semantic: undefined,
        };
      } else {
        // Otherwise, transform each scheme in the theme colors
        console.log(
          `[ThemeTransformationManager] Processing theme with ${Object.keys(input.schemes).length} schemes`,
        );

        const processedSchemes: Record<string, ThemeScheme> = {};

        Object.entries(input.schemes).forEach(([schemeName, scheme]) => {
          // Handle both ThemeScheme and ThemeSchemeInitial in the input
          if (this.isThemeSchemeInitial(scheme)) {
            processedSchemes[schemeName] = this.transformSchemeWithOptions(
              scheme,
              transformOptions,
            );
          } else {
            // If it"s already a ThemeScheme, ensure it"s fully processed
            processedSchemes[schemeName] = this.ensureFullyProcessed(scheme);
          }
        });

        return {
          schemes: processedSchemes,
          semantic: input.semantic,
        };
      }
    } catch (error) {
      console.error(
        "[ThemeTransformationManager] Error transforming theme:",
        error,
      );
      throw new Error(
        `Theme transformation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Transform a single theme scheme with specific options
   */
  transformSchemeWithOptions(
    initial: ThemeSchemeInitial,
    options: TransformOptions,
  ): ThemeScheme {
    console.log(
      "[ThemeTransformationManager] Transforming scheme with options",
    );

    // Extract options
    const lightModeOptions = options.lightMode || {
      lightenBackground: 0,
      darkenText: 0,
      adjustSaturation: 0,
    };

    const darkModeOptions = options.darkMode || {
      darkenBackground: 0,
      lightenText: 0,
      adjustSaturation: 0,
    };

    // Log transformation options
    this.logTransformationOptions("light", lightModeOptions);
    this.logTransformationOptions("dark", darkModeOptions);

    // Clone the initial scheme to avoid mutations
    const clonedScheme = JSON.parse(JSON.stringify(initial));

    try {
      // Process base colors
      if (clonedScheme.base) {
        console.group("Processing base colors");

        // Access the original theme"s base colors
        const originalBase = clonedScheme.base;

        // Create a new base object with the correct structure
        const processedBase: ProcessedBaseColors = {} as ProcessedBaseColors;

        // Process each base color
        Object.entries(originalBase).forEach(([colorKey, colorDef]) => {
          console.group(`Processing base color: ${colorKey}`);

          // Get the base hex value
          const baseHex =
            typeof colorDef === "string"
              ? colorDef
              : "hex" in (colorDef as Record<string, unknown>)
                ? (colorDef as { hex: string }).hex
                : "";

          if (!baseHex) {
            throw new Error(
              `Invalid color definition for ${colorKey}: No hex value found`,
            );
          }

          // Generate a palette based on the algorithm
          let paletteArray;
          switch (this.config.algorithm) {
            case "exponential":
              paletteArray = ColorUtils.createExponentialPalette(
                baseHex,
                10,
                this.config.shadeIntensity,
              );
              break;
            case "perceptual":
              paletteArray = ColorUtils.createPerceptualPalette(baseHex, 10);
              break;
            case "linear":
            default:
              paletteArray = ColorUtils.createPalette(baseHex, 10);
              break;
          }

          console.log("Generated palette array:", paletteArray);

          // Create shades for each level
          const shadeLevels: ShadeLevel[] = [
            50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
          ];
          const colorShades: ColorShades = {} as ColorShades;

          // Base color is the middle of the palette (500)
          colorShades.base = baseHex;

          // Generate shades for both light and dark modes
          paletteArray.forEach((colorDef, index) => {
            const shade = shadeLevels[index];

            // Store the original shade without transformation
            colorShades[shade] = {
              hex: colorDef.hex,
              rgb: colorDef.rgb,
              hsl: colorDef.hsl,
              alpha: colorDef.alpha ?? 1,
            };
          });

          // Generate contrast colors
          colorShades.contrast = this.generateContrastColors(colorShades);

          // Add to processed base colors
          processedBase[colorKey as keyof ProcessedBaseColors] = colorShades;

          console.groupEnd();
        });

        // Replace the base with our processed version
        clonedScheme.base = processedBase;

        console.groupEnd();
      } else {
        console.warn("No base colors found in scheme.");
      }

      // Process mode-specific colors for both light and dark
      (["light", "dark"] as ThemeMode[]).forEach((mode) => {
        console.group(`Transforming mode-specific colors for: ${mode}`);
        const modeColors = clonedScheme[mode];
        const currentModeOptions =
          mode === "dark" ? darkModeOptions : lightModeOptions;

        if (modeColors) {
          // Process each mode color - handle both direct colors and nested objects
          this.processColorObject(modeColors, mode, currentModeOptions);
        } else {
          console.warn(`No ${mode} mode-specific colors found.`);
        }

        console.groupEnd();
      });

      // Process semantic colors if available
      if (clonedScheme.semantic) {
        console.group("Transforming semantic colors");

        const semanticColors = clonedScheme.semantic;

        // Transform semantic colors for both modes
        (["light", "dark"] as ThemeMode[]).forEach((mode) => {
          console.group(`Transforming semantic colors for: ${mode}`);
          const currentModeOptions =
            mode === "dark" ? darkModeOptions : lightModeOptions;

          REQUIRED_SEMANTIC_COLORS.forEach((colorKey) => {
            const color = semanticColors[colorKey];
            if (color) {
              const ensured = ColorUtils.ensureColorDefinition(color);
              semanticColors[colorKey] = this.transformColor(
                ensured,
                mode,
                currentModeOptions,
              );
              console.log(
                `Transformed semantic color "${colorKey}" for mode "${mode}":`,
                semanticColors[colorKey],
              );
            } else {
              console.warn(`Missing semantic color for key: ${colorKey}`);
            }
          });

          console.groupEnd();
        });

        console.groupEnd();
      }

      return clonedScheme as ThemeScheme;
    } catch (error) {
      console.error("Error transforming scheme:", error);
      throw error;
    }
  }

  /**
   * Process a color object, handling both direct colors and nested objects
   */
  private processColorObject(
    colorObj: Record<string, unknown>,
    mode: ThemeMode,
    options: DarkModeOptions | LightModeOptions,
  ): void {
    // Process each property in the color object
    Object.keys(colorObj).forEach((key) => {
      const value = colorObj[key];

      // Skip null or undefined values
      if (value == null) {
        console.warn(`Skipping null/undefined color for key: ${key}`);
        return;
      }

      // Check if it's a nested object (like text: { primary, secondary })
      if (typeof value === "object" && !Array.isArray(value)) {
        // Check if it has color properties
        const maybeColorDef = value as Partial<ColorDefinition>;

        // If it doesn't have color definition properties, it's a nested object
        if (!maybeColorDef.hex && !maybeColorDef.rgb && !maybeColorDef.hsl) {
          // Recursively process nested color object
          console.group(`Processing nested color object: ${key}`);
          // Cast value to Record<string, unknown> for the recursive call
          this.processColorObject(
            value as Record<string, unknown>,
            mode,
            options,
          );
          console.groupEnd();
          return;
        }
      }

      // If we get here, it's a direct color value or something we'll try to convert
      try {
        const ensuredColor = ColorUtils.ensureColorDefinition(value);
        colorObj[key] = this.transformColor(ensuredColor, mode, options);
        console.log(`Transformed ${mode} color ${key}:`, colorObj[key]);
      } catch (error) {
        console.error(`Failed to process color for key "${key}":`, error);
        // Keep the original value to avoid breaking the theme
        console.warn(
          `Using original value for "${key}" to avoid breaking the theme`,
        );
      }
    });
  }

  /**
   * Transform a single theme scheme
   */
  transformScheme(initial: ThemeSchemeInitial): ThemeScheme {
    // Use default options if none provided
    return this.transformSchemeWithOptions(
      initial,
      this.config.transformOptions || {
        darkMode: {
          darkenBackground: 15,
          lightenText: 15,
          adjustSaturation: -10,
        },
        lightMode: {
          lightenBackground: 15,
          darkenText: 15,
          adjustSaturation: 10,
        },
      },
    );
  }

  /**
   * Transform a single color according to the given mode and options
   */
  private transformColor(
    color: ColorDefinition,
    mode: ThemeMode,
    options: DarkModeOptions | LightModeOptions,
  ): ColorDefinition {
    if (mode === "dark") {
      const darkOptions = options as DarkModeOptions;
      const {
        darkenBackground = 0,
        lightenText = 0,
        adjustSaturation = 0,
      } = darkOptions;
      return ColorUtils.adjustColor(color, {
        lightness: -darkenBackground + lightenText,
        saturation: adjustSaturation,
      });
    } else {
      const lightOptions = options as LightModeOptions;
      const {
        lightenBackground = 0,
        darkenText = 0,
        adjustSaturation = 0,
      } = lightOptions;
      return ColorUtils.adjustColor(color, {
        lightness: lightenBackground - darkenText,
        saturation: adjustSaturation,
      });
    }
  }

  /**
   * Log transformation options based on the mode
   */
  private logTransformationOptions(
    mode: ThemeMode,
    options: DarkModeOptions | LightModeOptions,
  ): void {
    console.group("Transformation Options");
    console.log("Mode:", mode);

    if (mode === "dark") {
      const darkOptions = options as DarkModeOptions;
      console.log("Dark Mode Options:", {
        darkenBackground: darkOptions.darkenBackground,
        lightenText: darkOptions.lightenText,
        adjustSaturation: darkOptions.adjustSaturation,
      });
    } else {
      const lightOptions = options as LightModeOptions;
      console.log("Light Mode Options:", {
        lightenBackground: lightOptions.lightenBackground,
        darkenText: lightOptions.darkenText,
        adjustSaturation: lightOptions.adjustSaturation,
      });
    }

    console.groupEnd();
  }

  private generateContrastColors(shades: ColorShades): string[] {
    const contrastColors: string[] = [];

    // For each shade, determine if it should have white or black text
    // Fix: Use numbers for ShadeLevel values, not strings
    const shadeKeys: (ShadeLevel | "base")[] = [
      50,
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      "base",
    ];

    for (const shade of shadeKeys) {
      // Type assertion is needed here because TypeScript can"t infer that
      // shade is a valid key of shades
      const shadeValue = shades[shade as keyof ColorShades];

      if (shadeValue) {
        let hexColor: string | undefined;

        if (typeof shadeValue === "string") {
          hexColor = shadeValue;
        } else if (typeof shadeValue === "object" && shadeValue !== null) {
          // Access the hex property if it exists
          hexColor = (shadeValue as { hex?: string }).hex;
        }

        if (typeof hexColor === "string") {
          // Use a method to determine if the color is dark or light
          const isDark = this.isColorDark(hexColor);
          contrastColors.push(isDark ? "#FFFFFF" : "#000000");
        }
      }
    }

    return contrastColors;
  }

  /**
   * Determine if a color is dark (needs white text) or light (needs black text)
   */
  private isColorDark(hexColor: string): boolean {
    return ColorUtils.isColorDark(hexColor, this.config.contrastThreshold);
  }

  /**
   * Check if an object is a ThemeScheme
   */
  private isThemeScheme(obj: unknown): obj is ThemeScheme {
    if (!obj || typeof obj !== "object") return false;

    const candidate = obj as Record<string, unknown>;

    // Check base structure
    if (!candidate.base || typeof candidate.base !== "object") return false;
    if (!candidate.light || typeof candidate.light !== "object") return false;
    if (!candidate.dark || typeof candidate.dark !== "object") return false;

    // Check base.primary
    const base = candidate.base as Record<string, unknown>;
    if (!base.primary || typeof base.primary !== "object") return false;

    // Check base.primary.shades exists and hex doesn"t
    const primary = base.primary as Record<string, unknown>;
    return !!primary.shades && !("hex" in primary);
  }

  /**
   * Type guard to check if input is a ThemeSchemeInitial
   */
  isThemeSchemeInitial(input: unknown): input is ThemeSchemeInitial {
    return (
      input !== null &&
      typeof input === "object" &&
      "base" in (input as Record<string, unknown>) &&
      !("schemes" in (input as Record<string, unknown>))
    );
  }

  /**
   * Ensure a theme scheme is fully processed
   */
  public ensureFullyProcessed(scheme: ThemeScheme): ThemeScheme {
    // Check if any base colors need processing
    let needsProcessing = false;

    // Use type-safe approach to check base colors
    const baseColors = scheme.base;
    const baseColorKeys = Object.keys(baseColors) as Array<
      keyof typeof baseColors
    >;

    for (const key of baseColorKeys) {
      const color = baseColors[key];
      // Check if color exists, has all required shade levels, and has contrast colors
      if (
        !color ||
        !this.hasAllShades(color) ||
        !this.hasContrastColors(color)
      ) {
        needsProcessing = true;
        break;
      }
    }

    // If already fully processed, return as is
    if (!needsProcessing) {
      return scheme;
    }

    // Convert to initial format and then transform
    const initial: ThemeSchemeInitial = {
      base: this.convertToInitialBaseColors(scheme.base),
      light: scheme.light,
      dark: scheme.dark,
    };

    return this.transformScheme(initial);
  }

  /**
   * Check if a color object has all required shade levels
   */
  private hasAllShades(color: TransformedColorObject): boolean {
    const requiredShades: ShadeLevel[] = [
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
    ];

    // Check all required shades exist
    return requiredShades.every((shade) => !!color[shade]);
  }

  /**
   * Check if a color object has contrast colors
   */
  private hasContrastColors(color: ColorShades): boolean {
    // Use type assertion only for the specific property we"re checking
    const maybeWithContrast = color as ColorShades & { contrast?: unknown };
    return (
      !!maybeWithContrast.contrast &&
      Array.isArray(maybeWithContrast.contrast) &&
      maybeWithContrast.contrast.length > 0
    );
  }

  /**
   * Convert processed base colors back to initial format for re-processing
   */
  private convertToInitialBaseColors(
    baseColors: ProcessedBaseColors,
  ): InitialBaseColors {
    // Create the result object with required properties
    const result: Partial<InitialBaseColors> = {};

    // Handle primary (required)
    if (baseColors.primary) {
      result.primary = baseColors.primary["500"];
    } else {
      throw new Error("Primary color is required");
    }

    // Handle secondary (required)
    if (baseColors.secondary) {
      result.secondary = baseColors.secondary["500"];
    } else {
      throw new Error("Secondary color is required");
    }

    // Handle accent (optional)
    if (baseColors.accent) {
      result.accent = baseColors.accent["500"];
    }

    // Handle any custom properties that exist in both types
    // This assumes InitialBaseColors has an index signature or similar structure
    const knownKeys = ["primary", "secondary", "accent"];
    const customKeys = Object.keys(baseColors).filter(
      (key) => !knownKeys.includes(key),
    );

    for (const key of customKeys) {
      const color = baseColors[key as keyof ProcessedBaseColors];
      if (color) {
        // Extract the string representation from ColorDefinition
        const colorValue = color["500"];
        (result as Record<string, unknown>)[key] = colorValue;
      }
    }

    return result as InitialBaseColors;
  }

  /**
   * Validate a processed theme
   */
  validateProcessedTheme(theme: ThemeColors): boolean {
    // Check that the theme has at least one scheme
    if (!theme.schemes || Object.keys(theme.schemes).length === 0) {
      throw new Error("Theme must have at least one color scheme");
    }

    // Check each scheme for required properties
    Object.entries(theme.schemes).forEach(([name, scheme]) => {
      // Check base colors
      if (!scheme.base || Object.keys(scheme.base).length === 0) {
        throw new Error(`Scheme "${name}" must have base colors`);
      }

      // Check that each base color has required properties
      const baseColors = scheme.base;
      const baseColorKeys = Object.keys(baseColors) as Array<
        keyof typeof baseColors
      >;

      for (const colorName of baseColorKeys) {
        const color = baseColors[colorName];

        // First check if color exists
        if (!color) {
          throw new Error(
            `Base color "${String(colorName)}" in scheme "${name}" is undefined`,
          );
        }

        // Check for required shade levels
        const requiredShades: ShadeLevel[] = [
          50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
        ];
        for (const shade of requiredShades) {
          if (!color[shade]) {
            throw new Error(
              `Base color "${String(colorName)}" in scheme "${name}" must have shade ${shade}`,
            );
          }
        }

        // Check for contrast colors
        if (!this.hasContrastColors(color)) {
          throw new Error(
            `Base color "${String(colorName)}" in scheme "${name}" must have contrast colors`,
          );
        }
      }
    });

    return true;
  }

  /**
   * Transform a theme from initial format to fully processed format
   *
   * @param input The initial theme data
   * @param mode The theme mode to use
   * @param semantic Optional semantic colors
   * @returns Fully processed theme colors
   */
  transformTheme(
    input: ThemeSchemeInitial,
    mode: ThemeMode,
    semantic?: SemanticColors,
  ): ThemeColors {
    // Use the transform method with appropriate options
    const transformOptions: TransformOptions = {
      darkMode: {
        darkenBackground: 15,
        lightenText: 15,
        adjustSaturation: -10,
      },
      lightMode: {
        lightenBackground: 15,
        darkenText: 15,
        adjustSaturation: 10,
      },
    };

    // Transform the scheme first
    const transformedTheme = this.transform(input, undefined, transformOptions);

    // Then add semantic colors if provided
    if (semantic) {
      return {
        ...transformedTheme,
        semantic,
      };
    }

    return transformedTheme;
  }

  /**
   * Transform ThemeColors that need additional processing
   *
   * @param input Partially processed theme colors
   * @param mode The theme mode to use
   * @param semantic Optional semantic colors to apply
   * @returns Fully processed theme colors
   */
  transformThemeColors(
    input: ThemeColors,
    mode: ThemeMode,
    semantic?: SemanticColors,
  ): ThemeColors {
    // If the input is already fully transformed
    if (themeValidationManager.isFullyTransformed(input)) {
      // Just update semantic if needed
      if (semantic) {
        // Check if semantic colors are different by comparing required properties
        const needsSemanticUpdate =
          !input.semantic ||
          REQUIRED_SEMANTIC_COLORS.some(
            (key) =>
              !input.semantic?.[key] ||
              input.semantic[key].hex !== semantic[key].hex,
          );

        if (needsSemanticUpdate) {
          return {
            ...input,
            semantic,
          };
        }
      }
      return input;
    }

    // For partially transformed themes, we need to process each scheme
    const processedSchemes: Record<string, ThemeScheme> = {};

    // Process each scheme in the input
    Object.entries(input.schemes || {}).forEach(([schemeName, scheme]) => {
      // Ensure the scheme is fully processed
      processedSchemes[schemeName] = this.ensureFullyProcessed(scheme);
    });

    // Return the processed theme with updated semantic colors if provided
    return {
      schemes: processedSchemes,
      semantic: semantic || input.semantic,
    };
  }
}
