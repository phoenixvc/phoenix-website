// component-mapping.ts
import { ColorDefinition } from "../types/core/colors";
import { ColorMapping } from "./color-mappings";
import {
  ButtonVariant,
  InputVariant,
  ComponentVariants,
} from "../types/mappings/component-variants";

export class ComponentMapping {
  private colorMapping: ColorMapping;

  constructor(colorMapping: ColorMapping) {
    this.colorMapping = colorMapping;
  }

  private getColor(path: string): ColorDefinition {
    const color = this.colorMapping.getColor(path);
    if (!color) {
      throw new Error(`Color not found for path: ${path}`);
    }
    return color;
  }

  private createTransparentColor(): ColorDefinition {
    return {
      hex: "transparent",
      rgb: "rgba(0, 0, 0, 0)",
      hsl: "hsla(0, 0%, 0%, 0)",
      alpha: 0,
    };
  }

  // Button Variants
  private generateSecondaryButton(): ButtonVariant {
    const secondary = this.getColor("semantic.secondary.base");
    const contrast = this.getColor("semantic.secondary.contrast");
    const transparent = this.createTransparentColor();

    return {
      background: secondary,
      foreground: contrast,
      border: transparent,
      hover: {
        background: this.getColor("semantic.secondary.dark"),
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.90"),
      },
      active: {
        background: this.getColor("semantic.secondary.dark"),
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.80"),
      },
      focus: {
        background: secondary,
        foreground: contrast,
        border: transparent,
        shadow: this.getColor("semantic.secondary.light"),
      },
      disabled: {
        background: secondary,
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.50"),
      },
    };
  }

  private generateTertiaryButton(): ButtonVariant {
    const tertiary = this.getColor("semantic.tertiary.base");
    const transparent = this.createTransparentColor();

    return {
      background: transparent,
      foreground: tertiary,
      border: tertiary,
      hover: {
        background: this.getColor("semantic.tertiary.light"),
        foreground: tertiary,
        border: tertiary,
        opacity: this.getColor("opacity.10"),
      },
      active: {
        background: this.getColor("semantic.tertiary.light"),
        foreground: tertiary,
        border: tertiary,
        opacity: this.getColor("opacity.20"),
      },
      focus: {
        background: transparent,
        foreground: tertiary,
        border: tertiary,
        shadow: this.getColor("semantic.tertiary.light"),
      },
      disabled: {
        background: transparent,
        foreground: tertiary,
        border: tertiary,
        opacity: this.getColor("opacity.50"),
      },
    };
  }

  private generateDefaultInput(): InputVariant {
    const text = this.getColor("text.primary");
    const border = this.getColor("border.default");
    const background = this.getColor("background.input");
    const transparent = this.createTransparentColor();

    return {
      // Base ComponentState properties (from InteractiveState)
      background: background,
      foreground: text,
      border: border,

      // InteractiveState properties
      hover: {
        background: background,
        foreground: text,
        border: this.getColor("border.hover"),
      },
      active: {
        background: background,
        foreground: text,
        border: this.getColor("border.active"),
      },
      focus: {
        background: background,
        foreground: text,
        border: border,
        shadow: this.getColor("semantic.primary.light"),
      },
      disabled: {
        background: background,
        foreground: text,
        border: border,
        opacity: this.getColor("opacity.50"),
      },

      // InputVariant specific properties
      readonly: {
        background: this.getColor("background.disabled"),
        foreground: text,
        border: border,
      },
      error: {
        background: background,
        foreground: this.getColor("semantic.danger.base"),
        border: this.getColor("semantic.danger.base"),
        message: this.getColor("semantic.danger.base"),
      },
      success: {
        background: background,
        foreground: this.getColor("semantic.success.base"),
        border: this.getColor("semantic.success.base"),
        message: this.getColor("semantic.success.base"),
      },
      prefix: {
        background: this.getColor("background.subtle"),
        foreground: text,
        border: transparent,
      },
      suffix: {
        background: this.getColor("background.subtle"),
        foreground: text,
        border: transparent,
      },
      placeholder: this.getColor("text.subtle"),
      label: text,
      // Includes base state props (background/foreground/border/hover/…) beyond
      // the InputVariant contract; assert to satisfy the return type unchanged.
    } as InputVariant;
  }
  private generatePrimaryButton(): ButtonVariant {
    const primary = this.getColor("semantic.primary.base");
    const contrast = this.getColor("semantic.primary.contrast");
    const transparent = this.createTransparentColor();

    return {
      background: primary,
      foreground: contrast,
      border: transparent,
      hover: {
        background: this.getColor("semantic.primary.dark"),
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.90"),
      },
      active: {
        background: this.getColor("semantic.primary.dark"),
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.80"),
      },
      focus: {
        background: primary,
        foreground: contrast,
        border: transparent,
        shadow: this.getColor("semantic.primary.light"),
      },
      disabled: {
        background: primary,
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.50"),
      },
    };
  }

  private generateDangerButton(): ButtonVariant {
    const danger = this.getColor("semantic.danger.base");
    const contrast = this.getColor("semantic.danger.contrast");
    const transparent = this.createTransparentColor();

    return {
      background: danger,
      foreground: contrast,
      border: transparent,
      hover: {
        background: this.getColor("semantic.danger.dark"),
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.90"),
      },
      active: {
        background: this.getColor("semantic.danger.dark"),
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.80"),
      },
      focus: {
        background: danger,
        foreground: contrast,
        border: transparent,
        shadow: this.getColor("semantic.danger.light"),
      },
      disabled: {
        background: danger,
        foreground: contrast,
        border: transparent,
        opacity: this.getColor("opacity.50"),
      },
    };
  }

  // Method to generate all variants
  public generateAllVariants(): ComponentVariants {
    return {
      button: {
        primary: this.generatePrimaryButton(),
        secondary: this.generateSecondaryButton(),
        tertiary: this.generateTertiaryButton(),
        danger: this.generateDangerButton(),
      },
      //TODO: input: this.generateDefaultInput()
    };
  }
}

export default ComponentMapping;
