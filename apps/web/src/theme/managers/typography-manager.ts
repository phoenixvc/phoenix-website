// theme/managers/typography-manager.ts

import { TypographyPreset, TypographyScale } from "../mappings";
import { ThemeMode } from "../types/core/base";
import {
  TypographyRegistry,
  createTypographyRegistry,
} from "../registry/typography-registry";

export class TypographyManager {
  private registry: TypographyRegistry;

  constructor(registry?: TypographyRegistry) {
    this.registry = registry || createTypographyRegistry();
  }

  // Get typography for a component
  getComponentTypography(
    component: string,
    variant: string = "default",
    mode: ThemeMode = "light",
  ): TypographyScale | undefined {
    // Check component-specific typography first
    const componentMap = this.registry.components.get(component);
    if (componentMap && componentMap[variant]) {
      return componentMap[variant];
    }

    // Fall back to general scales based on component type
    switch (component) {
      case "heading":
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = component === "heading" ? 1 : parseInt(component[1]);
        const preset = this.getActivePreset(mode);
        return preset
          ? (preset[`h${level}` as keyof TypographyPreset] as TypographyScale)
          : undefined;
      }

      case "body":
      case "paragraph":
        return this.getActivePreset(mode)?.body1;

      case "button":
        return this.getActivePreset(mode)?.button;

      case "caption":
        return this.getActivePreset(mode)?.caption;

      case "code":
        return this.getActivePreset(mode)?.code;

      default:
        // Default to body style
        return this.getActivePreset(mode)?.body1;
    }
  }

  // Get active typography preset
  getActivePreset(mode: ThemeMode = "light"): TypographyPreset | undefined {
    // First check for mode-specific preset
    const modePreset = this.registry.presets.get(mode);
    if (modePreset) return modePreset;

    // Fall back to default preset
    return this.registry.presets.get("default");
  }

  // Set component typography
  setComponentTypography(
    component: string,
    variant: string,
    typography: TypographyScale,
  ): void {
    let componentMap = this.registry.components.get(component);
    if (!componentMap) {
      componentMap = {};
      this.registry.components.set(component, componentMap);
    }
    componentMap[variant] = typography;
  }

  // Generate CSS variables for typography
  generateTypographyVariables(
    mode: ThemeMode = "light",
    prefix: string = "--typography",
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    // Add preset variables
    const preset = this.getActivePreset(mode);
    if (preset) {
      Object.entries(preset).forEach(([key, scale]) => {
        if (key !== "name") {
          // We know scale is a TypographyScale object
          Object.entries(scale as TypographyScale).forEach(([prop, value]) => {
            // Handle different value types appropriately
            variables[`${prefix}-${key}-${prop}`] =
              value !== undefined ? String(value) : "";
          });
        }
      });
    }

    // Add component-specific variables
    this.registry.components.forEach((variants, component) => {
      Object.entries(variants).forEach(([variant, scale]) => {
        // We know scale is a TypographyScale object
        Object.entries(scale as TypographyScale).forEach(([prop, value]) => {
          // Handle different value types appropriately
          variables[`${prefix}-component-${component}-${variant}-${prop}`] =
            value !== undefined ? String(value) : "";
        });
      });
    });

    return variables;
  }

  // Generate CSS classes for typography
  generateTypographyClasses(mode: ThemeMode = "light"): Record<string, string> {
    const classes: Record<string, string> = {};
    const preset = this.getActivePreset(mode);

    if (!preset) return classes;

    // Generate classes for each typography element
    Object.entries(preset).forEach(([key, scale]) => {
      if (key !== "name") {
        classes[`typography-${key}`] = this.scaleToCSS(scale);
      }
    });

    // Generate component-specific typography classes
    this.registry.components.forEach((variants, component) => {
      Object.entries(variants).forEach(([variant, scale]) => {
        classes[`typography-${component}-${variant}`] = this.scaleToCSS(scale);
      });
    });

    return classes;
  }

  // Helper to convert scale to CSS string
  private scaleToCSS(scale: TypographyScale): string {
    return `
      font-size: ${scale.fontSize};
      line-height: ${scale.lineHeight};
      letter-spacing: ${scale.letterSpacing};
      font-weight: ${scale.fontWeight};
      ${scale.fontFamily ? `font-family: ${scale.fontFamily};` : ""}
      ${scale.textTransform ? `text-transform: ${scale.textTransform};` : ""}
    `.trim();
  }
}
