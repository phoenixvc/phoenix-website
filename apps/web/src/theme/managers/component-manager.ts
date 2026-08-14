// theme/managers/component-manager.ts
import { ThemeName } from "../types/core/base";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";
import {
  BaseStyles,
  CardVariant,
  ComponentState,
  InteractiveState,
  ThemePropertyStyles,
} from "../types";
import { ComponentThemeRegistry } from "../registry/component-theme-registry";

export class ComponentManager {
  private registry: ComponentThemeRegistry;
  //TODO private colorMapping: ColorMapping; //TODO ThemeMode,

  constructor(registry: ComponentThemeRegistry) {
    this.registry = registry;
  }

  // Get component state by type, variant, and mode
  getComponentState(
    component: string,
    variant: string = "default",
  ): ComponentState | undefined {
    const componentRegistry = this.registry[component];
    if (!componentRegistry) return undefined;

    const componentVariant = componentRegistry[variant];
    if (!componentVariant) return undefined;

    // Handle complex variants with a default property
    if ("default" in componentVariant && componentVariant.default) {
      return componentVariant.default;
    }

    // Handle simple variants that are directly ComponentState
    if (
      "background" in componentVariant &&
      "foreground" in componentVariant &&
      "border" in componentVariant
    ) {
      return componentVariant as ComponentState;
    }

    return undefined;
  }

  // Get interactive state for a component
  getInteractiveState(
    component: string,
    variant: string = "default",
    state: "default" | "hover" | "active" | "focus" | "disabled" = "default",
  ): ComponentState | undefined {
    const componentVariant = this.getComponentState(component, variant);
    if (!componentVariant) return undefined;

    // Get the parent variant object
    const parentVariant = this.registry[component]?.[variant];
    if (!parentVariant) return componentVariant;

    // Check if this is an interactive variant
    if ("interactive" in parentVariant && parentVariant.interactive) {
      switch (state) {
        case "hover":
          return parentVariant.interactive.hover
            ? { ...componentVariant, ...parentVariant.interactive.hover }
            : componentVariant;
        case "active":
          return parentVariant.interactive.active
            ? { ...componentVariant, ...parentVariant.interactive.active }
            : componentVariant;
        default:
          return componentVariant;
      }
    }

    // Handle legacy interactive state format
    const interactiveState = componentVariant as InteractiveState;
    if (interactiveState[state as keyof InteractiveState]) {
      return {
        ...componentVariant,
        ...interactiveState[state as keyof InteractiveState],
      };
    }

    return componentVariant;
  }

  // Generate CSS variables for all components
  generateAllVariables(
    registry: ComponentThemeRegistry = this.registry,
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    // Process each component in the registry
    Object.entries(registry).forEach(([componentName, variants]) => {
      if (!variants) return;

      // Process each variant
      Object.entries(variants).forEach(([variantName, variantConfig]) => {
        // Generate variables for this component variant
        const componentVars = this.generateComponentVariables(
          componentName,
          variantName,
        );

        // Add to the result
        Object.assign(variables, componentVars);

        // Also generate recursive variables with more flexibility
        const prefix = `--theme-${componentName}-${variantName}`;
        const recursiveVars = this.generateVariablesForVariant(
          prefix,
          variantConfig,
        );

        // Add recursive variables to the result
        Object.assign(variables, recursiveVars);
      });
    });

    return variables;
  }

  // Generate CSS variables for a component (specific approach)
  generateComponentVariables(
    component: string,
    variant: string = "default",
  ): Record<string, string> {
    const componentState = this.getComponentState(component, variant);
    if (!componentState) return {};

    const prefix = `--theme-${component}-${variant}`;
    const variables: Record<string, string> = {};

    // Base state
    if (componentState.background?.hex) {
      variables[`${prefix}-bg`] = componentState.background.hex;
    }

    if (componentState.foreground?.hex) {
      variables[`${prefix}-fg`] = componentState.foreground.hex;
    }

    if (componentState.border?.hex) {
      variables[`${prefix}-border`] = componentState.border.hex;
    }

    if (componentState.shadow?.hex) {
      variables[`${prefix}-shadow`] = componentState.shadow.hex;
    }

    // Get parent variant for additional states
    const parentVariant = this.registry[component]?.[variant];
    if (!parentVariant) return variables;

    // Handle interactive states
    if ("interactive" in parentVariant && parentVariant.interactive) {
      if (parentVariant.interactive.hover?.background?.hex) {
        variables[`${prefix}-hover-bg`] =
          parentVariant.interactive.hover.background.hex;
      }

      if (parentVariant.interactive.hover?.foreground?.hex) {
        variables[`${prefix}-hover-fg`] =
          parentVariant.interactive.hover.foreground.hex;
      }

      if (parentVariant.interactive.active?.background?.hex) {
        variables[`${prefix}-active-bg`] =
          parentVariant.interactive.active.background.hex;
      }

      if (parentVariant.interactive.active?.foreground?.hex) {
        variables[`${prefix}-active-fg`] =
          parentVariant.interactive.active.foreground.hex;
      }
    }

    // // Handle header and footer for card variants
    // if ("header" in parentVariant && parentVariant.header) {
    //   if (parentVariant.header.background?.hex) {
    //     variables[`${prefix}-header-bg`] = parentVariant.header.background.hex;
    //   }

    //   if (parentVariant.header.foreground?.hex) {
    //     variables[`${prefix}-header-fg`] = parentVariant.header.foreground.hex;
    //   }
    // }

    // if ("footer" in parentVariant && parentVariant.footer) {
    //   if (parentVariant.footer.background?.hex) {
    //     variables[`${prefix}-footer-bg`] = parentVariant.footer.background.hex;
    //   }

    //   if (parentVariant.footer.foreground?.hex) {
    //     variables[`${prefix}-footer-fg`] = parentVariant.footer.foreground.hex;
    //   }
    // }

    // Handle custom styles
    if ("style" in parentVariant && parentVariant.style) {
      Object.entries(parentVariant.style).forEach(([key, value]) => {
        variables[`${prefix}-${key}`] = String(value);
      });
    }

    return variables;
  }

  // Generate CSS variables for a specific variant (recursive approach)
  private generateVariablesForVariant(
    prefix: string,
    variant: unknown,
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    // Process each property in the variant
    this.processVariantObject(prefix, variant, variables);

    return variables;
  }

  // Recursively process variant object properties
  private processVariantObject(
    prefix: string,
    obj: unknown,
    result: Record<string, string>,
  ): void {
    if (!obj || typeof obj !== "object") return;

    Object.entries(obj).forEach(([key, value]) => {
      const newPrefix = `${prefix}-${key}`;

      if (typeof value === "object" && value !== null) {
        // Special handling for color objects with hex property
        if (value.hex && typeof value.hex === "string") {
          result[newPrefix] = value.hex;
        } else {
          // Recursive call for nested objects
          this.processVariantObject(newPrefix, value, result);
        }
      } else if (value !== undefined && value !== null) {
        // Add leaf value to result
        result[newPrefix] = String(value);
      }
    });
  }

  // Generate CSS classes for a component
  generateComponentClasses(
    component: string,
    variant: string = "default",
    scheme: ThemeName = DEFAULT_THEME_NAME,
  ): Record<string, string> {
    const componentState = this.getComponentState(component, variant);
    if (!componentState) return {};

    const prefix = `theme-${scheme}-${component}-${variant}`;
    const classes: Record<string, string> = {};

    // Base class
    classes[prefix] = `
      background-color: var(--theme-${component}-${variant}-bg);
      color: var(--theme-${component}-${variant}-fg);
      border-color: var(--theme-${component}-${variant}-border);
    `.trim();

    // Get parent variant for additional states
    const parentVariant = this.registry[component]?.[variant];
    if (!parentVariant) return classes;

    // Handle interactive states
    if ("interactive" in parentVariant && parentVariant.interactive) {
      classes[`${prefix}:hover`] = `
        background-color: var(--theme-${component}-${variant}-hover-bg);
        color: var(--theme-${component}-${variant}-hover-fg);
      `.trim();

      classes[`${prefix}:active`] = `
        background-color: var(--theme-${component}-${variant}-active-bg);
        color: var(--theme-${component}-${variant}-active-fg);
      `.trim();
    }

    // Handle header and footer for card variants
    if ("header" in parentVariant && parentVariant.header) {
      classes[`${prefix}-header`] = `
        background-color: var(--theme-${component}-${variant}-header-bg);
        color: var(--theme-${component}-${variant}-header-fg);
      `.trim();
    }

    if ("footer" in parentVariant && parentVariant.footer) {
      classes[`${prefix}-footer`] = `
        background-color: var(--theme-${component}-${variant}-footer-bg);
        color: var(--theme-${component}-${variant}-footer-fg);
      `.trim();
    }

    return classes;
  }

  // Generate classes for all components
  generateAllClasses(
    scheme: ThemeName = DEFAULT_THEME_NAME,
    registry: ComponentThemeRegistry = this.registry,
  ): Record<string, string> {
    const classes: Record<string, string> = {};

    // Process each component in the registry
    Object.entries(registry).forEach(([componentName, variants]) => {
      if (!variants) return;

      // Process each variant
      Object.entries(variants).forEach(([variantName]) => {
        // Generate classes for this component variant
        const componentClasses = this.generateComponentClasses(
          componentName,
          variantName,
          scheme,
        );

        // Add to the result
        Object.assign(classes, componentClasses);
      });
    });

    return classes;
  }

  // Get component style from variant (for direct React usage)
  getComponentStyleFromVariant(
    variant: unknown,
    state: string = "default",
  ): React.CSSProperties {
    // First, check if variant is an object
    if (!variant || typeof variant !== "object" || variant === null) {
      return {};
    }

    // Now TypeScript knows variant is an object
    const variantObj = variant as Record<string, unknown>;

    // Handle complex variants with a default property
    if ("default" in variantObj && variantObj.default) {
      // Extract the right state from the variant
      const stateStyles = this.extractStateStyles(variantObj, state);
      // Convert to CSS properties
      return this.convertToCSSProperties(stateStyles);
    }

    // Handle simple variants that are directly ComponentState
    if (
      "background" in variantObj &&
      "foreground" in variantObj &&
      "border" in variantObj
    ) {
      return this.convertToCSSProperties(variantObj);
    }

    return {};
  }

  // Get component style by component and variant names
  getComponentStyle(
    component: string,
    variant: string = "default",
    state: string = "default",
  ): React.CSSProperties {
    const componentVariant = this.registry[component]?.[variant];
    if (!componentVariant) return {};

    return this.getComponentStyleFromVariant(componentVariant, state);
  }

  // Extract state-specific styles from a variant
  private extractStateStyles(
    variant: unknown,
    state: string,
  ): Record<string, unknown> {
    // Type guard to ensure variant is an object
    if (!variant || typeof variant !== "object") {
      return {};
    }

    // For card variants which have the structure we"re looking for
    if (this.isCardVariant(variant)) {
      const cardVariant = variant as CardVariant;

      // Handle different component types and their states
      // Ensure baseStyles is always a Record<string, unknown>
      const baseStyles = cardVariant.default
        ? this.ensureObject(this.getBaseStyles(cardVariant.default))
        : {};

      // Handle interactive states
      if (cardVariant.interactive) {
        if (state === "hover" && cardVariant.interactive.hover) {
          // Ensure we"re spreading an object
          const hoverStyles = this.ensureObject(cardVariant.interactive.hover);
          return { ...baseStyles, ...hoverStyles };
        }

        if (state === "active" && cardVariant.interactive.active) {
          // Ensure we"re spreading an object
          const activeStyles = this.ensureObject(
            cardVariant.interactive.active,
          );
          return { ...baseStyles, ...activeStyles };
        }
      }

      // Handle special sections
      if (state === "header" && cardVariant.header) {
        // Ensure we"re spreading an object
        const headerStyles = this.ensureObject(cardVariant.header);
        return { ...baseStyles, ...headerStyles };
      }

      if (state === "footer" && cardVariant.footer) {
        // Ensure we"re spreading an object
        const footerStyles = this.ensureObject(cardVariant.footer);
        return { ...baseStyles, ...footerStyles };
      }

      // Default state
      return baseStyles as Record<string, unknown>;
    }

    // Handle other variant types or return empty object
    return {};
  }

  // Update getBaseStyles to explicitly return Record<string, unknown>
  private getBaseStyles(defaultStyle: unknown): Record<string, unknown> {
    return this.ensureObject(defaultStyle);
  }

  // Helper method to ensure we have an object that can be spread
  private ensureObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && value !== null) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  // Type guard to check if the variant is a CardVariant
  private isCardVariant(variant: unknown): boolean {
    if (!variant || typeof variant !== "object") {
      return false;
    }

    const potentialCardVariant = variant as Partial<CardVariant>;

    return (
      "default" in potentialCardVariant &&
      ("interactive" in potentialCardVariant ||
        "header" in potentialCardVariant ||
        "footer" in potentialCardVariant)
    );
  }

  // Convert theme properties to CSS properties
  private convertToCSSProperties(styles: unknown): BaseStyles {
    const cssProps: BaseStyles = {};

    if (styles && typeof styles === "object") {
      // Use type assertion with the specific interface
      const themeProps = styles as ThemePropertyStyles;

      if (themeProps.background?.hex) {
        cssProps.backgroundColor = themeProps.background.hex;
      }

      if (themeProps.foreground?.hex) {
        cssProps.color = themeProps.foreground.hex;
      }

      if (themeProps.border?.hex) {
        cssProps.borderColor = themeProps.border.hex;
      }

      if (themeProps.shadow?.hex) {
        cssProps.boxShadow = themeProps.shadow.hex;
      }

      if (themeProps.opacity?.value !== undefined) {
        cssProps.opacity = themeProps.opacity.value.toString();
      }
    }

    return cssProps;
  }

  // Get all component variants from the registry
  getAllComponentVariants(): ComponentThemeRegistry {
    return { ...this.registry };
  }

  // Get component variants for a specific component
  getComponentVariants(component: string): Record<string, unknown> | undefined {
    return this.registry[component]
      ? { ...this.registry[component] }
      : undefined;
  }
}
