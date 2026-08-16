// theme/registry/component-registry-manager.ts
import type { CSSProperties } from "react";
import {
  CardVariant,
  ComponentVariants,
  ComponentVariantType,
} from "../types/mappings/component-variants";
import { VariantResolver, VariantResolverConfig } from "./variant-resolver";
import { VariantResolutionStrategy } from "./variant-resolution/variant-resolution-strategy";
import {
  ComponentThemeRegistry,
  createComponentRegistry,
} from "./component-theme-registry";
import { ColorDefinition } from "../types/core/colors";
import ColorUtils from "../utils/color-utils";
import {
  BaseStyles,
  ComponentState,
  Theme,
  ThemeName,
  ThemePropertyStyles,
} from "../types";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";

export interface ComponentRegistryManagerConfig {
  variantResolver?: VariantResolver;
  variantResolverConfig?: VariantResolverConfig;
}

export class ComponentRegistryManager {
  private registry: Map<string, Map<string, ComponentVariantType>> = new Map();
  private variantResolver: VariantResolver;

  constructor(
    initialRegistry?: Partial<ComponentThemeRegistry>,
    config?: ComponentRegistryManagerConfig,
  ) {
    // Initialize variant resolver
    this.variantResolver =
      config?.variantResolver ||
      new VariantResolver(config?.variantResolverConfig);

    // Initialize with default registry if provided
    const baseRegistry = createComponentRegistry(initialRegistry);

    // Hydrate colors before initializing the registry
    const hydratedRegistry = this.hydrateRegistryColors(baseRegistry);
    this.initializeFromObject(hydratedRegistry);
  }

  /**
   * Initialize registry from a ComponentThemeRegistry object
   */
  private initializeFromObject(
    registry: Partial<ComponentThemeRegistry>,
  ): void {
    Object.entries(registry).forEach(([componentName, variants]) => {
      if (!variants) return;

      const componentMap = new Map<string, ComponentVariantType>();
      this.registry.set(componentName, componentMap);

      Object.entries(variants).forEach(([variantName, variantConfig]) => {
        componentMap.set(variantName, variantConfig as ComponentVariantType);
      });
    });
  }

  /**
   * Recursively hydrate all color definitions in the registry
   */
  private hydrateRegistryColors<T extends object>(obj: T): T {
    if (!obj) return obj;

    const result = { ...obj } as T;

    // Process each property
    for (const key in result) {
      const value = result[key];

      if (value && typeof value === "object") {
        if (
          "hex" in value &&
          typeof (value as { hex: unknown }).hex === "string"
        ) {
          // This looks like a ColorDefinition, hydrate it
          const colorDef = ColorUtils.ensureColorDefinition(
            value as Partial<ColorDefinition>,
          );
          (result as Record<string, unknown>)[key] = colorDef;
        } else {
          // Recursively process nested objects
          (result as Record<string, unknown>)[key] = this.hydrateRegistryColors(
            value as object,
          );
        }
      }
    }

    return result;
  }

  /**
   * Register a theme"s component variants
   */
  registerTheme(theme: Theme | { components: ComponentVariants }): void {
    // Extract components from the theme
    const { components } = theme;

    if (!components) return;

    // Hydrate colors in the theme components before registering
    const hydratedComponents = this.hydrateRegistryColors(components);

    // Register each component and its variants
    Object.entries(hydratedComponents).forEach(([componentName, variants]) => {
      if (!variants) return;

      // Create component entry if it doesn"t exist
      if (!this.registry.has(componentName)) {
        this.registry.set(componentName, new Map());
      }

      const componentMap = this.registry.get(componentName)!;

      // Register each variant
      Object.entries(variants).forEach(([variantName, variantConfig]) => {
        componentMap.set(variantName, variantConfig as ComponentVariantType);
      });
    });
  }

  /**
   * Get a component variant with improved typing
   * This overload allows for strongly-typed component names when available
   */
  getVariant<
    T extends keyof ComponentThemeRegistry,
    V extends keyof ComponentThemeRegistry[T],
  >(component: T, variant: V): ComponentThemeRegistry[T][V];

  getVariant<T extends keyof ComponentThemeRegistry>(
    component: T,
    variant: string,
  ): ComponentVariantType | undefined;

  // Then provide a single implementation that handles all cases
  getVariant<T extends keyof ComponentThemeRegistry>(
    component: T,
    variant: string,
  ): ComponentVariantType | undefined {
    const componentVariants = this.getComponentVariants(component);
    if (!componentVariants) return undefined;
    return componentVariants[variant] as ComponentVariantType;
  }

  getComponentVariants<T extends keyof ComponentThemeRegistry>(
    component: T,
  ): ComponentThemeRegistry[T] | undefined;

  getComponentVariants(
    component: string,
  ): Record<string, ComponentVariantType> | undefined;

  // Single implementation for both overloads
  getComponentVariants(
    component: string,
  ): Record<string, ComponentVariantType> | undefined {
    const registry = this.getRegistry();
    return registry[component];
  }

  /**
   * Set a component variant
   */
  setVariant<T extends ComponentVariantType>(
    component: string,
    variant: string,
    value: T,
  ): void {
    // Create component entry if it doesn"t exist
    if (!this.registry.has(component)) {
      this.registry.set(component, new Map());
    }

    // Hydrate colors in the variant before setting
    const hydratedValue = this.hydrateRegistryColors(value);

    const componentMap = this.registry.get(component)!;
    componentMap.set(variant, hydratedValue);
  }

  /**
   * Check if a component variant exists
   */
  hasVariant(component: string, variant: string = "default"): boolean {
    const componentMap = this.registry.get(component);
    return componentMap ? componentMap.has(variant) : false;
  }

  /**
   * Get the entire registry as a ComponentThemeRegistry object
   */
  getRegistry(): ComponentThemeRegistry {
    // Start with required components
    const registry = {
      button: {},
      input: {},
    } as ComponentThemeRegistry;

    this.registry.forEach((variantMap, componentName) => {
      const variants: Record<string, ComponentVariantType> = {};
      variantMap.forEach((value, key) => {
        variants[key] = value;
      });

      // Now TypeScript knows that registry can have string keys
      registry[componentName] = variants;
    });

    return registry;
  }

  /**
   * Get all component variants from the registry
   * @param filter Optional filter to include only specific components
   * @returns Filtered copy of the component registry
   */
  getAllComponentVariants(
    filter?: Array<keyof ComponentThemeRegistry>,
  ): Partial<ComponentThemeRegistry> {
    const registry = this.getRegistry();

    if (!filter || filter.length === 0) {
      return { ...registry };
    }

    const filteredRegistry: Partial<ComponentThemeRegistry> = {};

    for (const component of filter) {
      if (registry[component]) {
        filteredRegistry[component] = { ...registry[component] };
      }
    }

    return filteredRegistry;
  }

  /**
   * Clear the registry
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Reset the registry to default values
   */
  resetToDefaults(defaultRegistry: Partial<ComponentThemeRegistry>): void {
    this.clear();
    const hydratedRegistry = this.hydrateRegistryColors(defaultRegistry);
    this.initializeFromObject(hydratedRegistry);
  }

  /**
   * Remove a component from the registry
   */
  removeComponent(component: string): boolean {
    return this.registry.delete(component);
  }

  /**
   * Remove a specific variant from a component
   */
  removeVariant(component: string, variant: string): boolean {
    const componentMap = this.registry.get(component);
    if (!componentMap) return false;

    return componentMap.delete(variant);
  }

  /**
   * Get all component names in the registry
   */
  getComponentNames(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all variant names for a component
   */
  getVariantNames(component: string): string[] {
    const componentMap = this.registry.get(component);
    if (!componentMap) return [];

    return Array.from(componentMap.keys());
  }

  /**
   * Gets a component variant with fallback support for dynamic variants
   * @param component The component type to get variants for
   * @param variant The variant name or dynamic pattern (e.g. "${variant}-active")
   * @param actualVariant Optional actual variant to use when resolving dynamic patterns
   * @returns The resolved component variant or undefined if not found
   */
  getVariantWithFallback<T extends keyof ComponentThemeRegistry>(
    component: T,
    variant: string = "default",
    actualVariant?: string,
  ): ComponentVariantType | undefined {
    const componentVariants = this.getComponentVariants(component);
    if (!componentVariants) {
      return undefined;
    }

    try {
      return this.variantResolver.resolveVariant(
        componentVariants,
        variant,
        actualVariant,
      );
    } catch (error) {
      console.warn(`Error resolving variant ${component}.${variant}: ${error}`);
      return componentVariants.default as ComponentVariantType;
    }
  }

  /**
   * Register a custom variant resolution strategy
   * @param strategy The strategy to register
   */
  registerVariantResolutionStrategy(strategy: VariantResolutionStrategy): void {
    this.variantResolver.registerStrategy(strategy);
  }

  /**
   * Extract the resolvable base ComponentState from a variant config: either
   * its `default` sub-state, or the variant itself when it's already a plain
   * background/foreground/border state.
   */
  private extractBaseState(
    variantConfig: ComponentVariantType,
  ): ComponentState | undefined {
    if ("default" in variantConfig && variantConfig.default) {
      return variantConfig.default as ComponentState;
    }

    if (
      "background" in variantConfig &&
      "foreground" in variantConfig &&
      "border" in variantConfig
    ) {
      return variantConfig as unknown as ComponentState;
    }

    return undefined;
  }

  /**
   * Generate CSS variables for a single component variant, read live from the registry
   */
  generateComponentVariables(
    component: string,
    variant: string = "default",
  ): Record<string, string> {
    const parentVariant = this.getVariant(component, variant);
    if (!parentVariant) return {};

    const componentState = this.extractBaseState(parentVariant);
    if (!componentState) return {};

    const prefix = `theme-${component}-${variant}`;
    const variables: Record<string, string> = {};

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

    if ("interactive" in parentVariant && parentVariant.interactive) {
      const { hover, active } = parentVariant.interactive;
      if (hover?.background?.hex) {
        variables[`${prefix}-hover-bg`] = hover.background.hex;
      }
      if (hover?.foreground?.hex) {
        variables[`${prefix}-hover-fg`] = hover.foreground.hex;
      }
      if (hover?.border?.hex) {
        variables[`${prefix}-hover-border`] = hover.border.hex;
      }
      if (active?.background?.hex) {
        variables[`${prefix}-active-bg`] = active.background.hex;
      }
      if (active?.foreground?.hex) {
        variables[`${prefix}-active-fg`] = active.foreground.hex;
      }
      if (active?.border?.hex) {
        variables[`${prefix}-active-border`] = active.border.hex;
      }
    }

    if ("header" in parentVariant && parentVariant.header) {
      const header = parentVariant.header as ComponentState;
      if (header.background?.hex) {
        variables[`${prefix}-header-bg`] = header.background.hex;
      }
      if (header.foreground?.hex) {
        variables[`${prefix}-header-fg`] = header.foreground.hex;
      }
    }

    if ("footer" in parentVariant && parentVariant.footer) {
      const footer = parentVariant.footer as ComponentState;
      if (footer.background?.hex) {
        variables[`${prefix}-footer-bg`] = footer.background.hex;
      }
      if (footer.foreground?.hex) {
        variables[`${prefix}-footer-fg`] = footer.foreground.hex;
      }
    }

    if ("style" in parentVariant && parentVariant.style) {
      Object.entries(parentVariant.style).forEach(([key, value]) => {
        variables[`${prefix}-${key}`] = String(value);
      });
    }

    return variables;
  }

  /**
   * Generate CSS variables for every registered component variant
   */
  generateAllVariables(): Record<string, string> {
    const variables: Record<string, string> = {};

    Object.entries(this.getRegistry()).forEach(([componentName, variants]) => {
      if (!variants) return;

      Object.keys(variants).forEach((variantName) => {
        Object.assign(
          variables,
          this.generateComponentVariables(componentName, variantName),
        );
      });
    });

    return variables;
  }

  /**
   * Generate CSS classes for a single component variant
   */
  generateComponentClasses(
    component: string,
    variant: string = "default",
    scheme: ThemeName = DEFAULT_THEME_NAME,
  ): Record<string, string> {
    const parentVariant = this.getVariant(component, variant);
    if (!parentVariant) return {};

    const componentState = this.extractBaseState(parentVariant);
    if (!componentState) return {};

    const prefix = `theme-${scheme}-${component}-${variant}`;
    const classes: Record<string, string> = {};

    classes[prefix] = `
      background-color: var(--theme-${component}-${variant}-bg);
      color: var(--theme-${component}-${variant}-fg);
      border-color: var(--theme-${component}-${variant}-border);
    `.trim();

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

  /**
   * Generate CSS classes for every registered component variant
   */
  generateAllClasses(
    scheme: ThemeName = DEFAULT_THEME_NAME,
  ): Record<string, string> {
    const classes: Record<string, string> = {};

    Object.entries(this.getRegistry()).forEach(([componentName, variants]) => {
      if (!variants) return;

      Object.keys(variants).forEach((variantName) => {
        Object.assign(
          classes,
          this.generateComponentClasses(componentName, variantName, scheme),
        );
      });
    });

    return classes;
  }

  /**
   * Resolve a component variant directly to a React style object for the given state
   */
  getComponentStyleFromVariant(
    variant: unknown,
    state: string = "default",
  ): CSSProperties {
    if (!variant || typeof variant !== "object") {
      return {};
    }

    const variantObj = variant as Record<string, unknown>;

    if ("default" in variantObj && variantObj.default) {
      const stateStyles = this.extractStateStyles(variantObj, state);
      return this.convertToCSSProperties(stateStyles);
    }

    if (
      "background" in variantObj &&
      "foreground" in variantObj &&
      "border" in variantObj
    ) {
      return this.convertToCSSProperties(variantObj);
    }

    return {};
  }

  /**
   * Get a direct React style object for a component/variant/state
   */
  getComponentStyle(
    component: string,
    variant: string = "default",
    state: string = "default",
  ): CSSProperties {
    const componentVariant = this.getVariant(component, variant);
    if (!componentVariant) return {};

    return this.getComponentStyleFromVariant(componentVariant, state);
  }

  // Extract state-specific styles from a variant
  private extractStateStyles(
    variant: unknown,
    state: string,
  ): Record<string, unknown> {
    if (!variant || typeof variant !== "object") {
      return {};
    }

    // For card variants which have the structure we're looking for
    if (this.isCardVariant(variant)) {
      const cardVariant = variant as CardVariant;

      const baseStyles = cardVariant.default
        ? this.ensureObject(cardVariant.default)
        : {};

      // Merge CardVariant.style with the selected component state
      const variantStyles = cardVariant.style
        ? this.ensureObject(cardVariant.style)
        : {};

      if (cardVariant.interactive) {
        if (state === "hover" && cardVariant.interactive.hover) {
          return {
            ...baseStyles,
            ...variantStyles,
            ...this.ensureObject(cardVariant.interactive.hover),
          };
        }

        if (state === "active" && cardVariant.interactive.active) {
          return {
            ...baseStyles,
            ...variantStyles,
            ...this.ensureObject(cardVariant.interactive.active),
          };
        }
      }

      if (state === "header" && cardVariant.header) {
        return {
          ...baseStyles,
          ...variantStyles,
          ...this.ensureObject(cardVariant.header),
        };
      }

      if (state === "footer" && cardVariant.footer) {
        return {
          ...baseStyles,
          ...variantStyles,
          ...this.ensureObject(cardVariant.footer),
        };
      }

      return { ...baseStyles, ...variantStyles };
    }

    return {};
  }

  // Helper method to ensure we have an object that can be spread
  private ensureObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object") {
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

    return "default" in potentialCardVariant;
  }

  // Convert theme properties to CSS properties
  private convertToCSSProperties(styles: unknown): BaseStyles {
    const cssProps: BaseStyles = {};

    if (styles && typeof styles === "object") {
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

      // Copy registered style properties from the merged styles
      const styleEntries = Object.entries(styles);
      for (const [key, value] of styleEntries) {
        // Skip known theme property keys that are already handled
        if (
          key !== "background" &&
          key !== "foreground" &&
          key !== "border" &&
          key !== "shadow" &&
          key !== "opacity"
        ) {
          // Validate and copy style properties
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "undefined"
          ) {
            (cssProps as Record<string, unknown>)[key] = value;
          }
        }
      }
    }

    return cssProps;
  }
}
