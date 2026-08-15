// constants/tokens/typography.ts

import { TypographyPreset } from "../../mappings/typography-mappings";

export const fontFamilies = {
  sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, `Segoe UI`, Roboto, `Helvetica Neue`, Arial, sans-serif",
  serif: "ui-serif, Georgia, Cambria, `Times New Roman`, Times, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, `Liberation Mono`, `Courier New`, monospace",
} as const;

export const fontSizes = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px
  lg: "1.125rem", // 18px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem", // 36px
  "5xl": "3rem", // 48px
  "6xl": "3.75rem", // 60px
} as const;

export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const letterSpacings = {
  tighter: "-0.05em",
  tight: "-0.025em",
  normal: "0",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
} as const;

export const typography = {
  heading: {
    h1: {
      fontSize: fontSizes["5xl"],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
    },
    h2: {
      fontSize: fontSizes["4xl"],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
    },
    h3: {
      fontSize: fontSizes["3xl"],
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
    },
    h4: {
      fontSize: fontSizes["2xl"],
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
    },
    h5: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
    },
    h6: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
    },
  },
  body: {
    large: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
    },
    default: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
    },
    small: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
    },
    caption: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
    },
  },
  button: {
    large: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.medium,
    },
    default: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.medium,
    },
    small: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.medium,
    },
  },
} as const;

/**
 * The single default TypographyPreset, derived entirely from the static token
 * tables above. This is the real data behind TypographyManager's default
 * registry (see theme/registry/typography-registry.ts) — every field traces
 * back to a token here rather than being duplicated or invented ad hoc.
 */
export const defaultTypographyPreset: TypographyPreset = {
  name: "default",
  h1: { ...typography.heading.h1, fontFamily: fontFamilies.sans },
  h2: { ...typography.heading.h2, fontFamily: fontFamilies.sans },
  h3: { ...typography.heading.h3, fontFamily: fontFamilies.sans },
  h4: { ...typography.heading.h4, fontFamily: fontFamilies.sans },
  h5: { ...typography.heading.h5, fontFamily: fontFamilies.sans },
  h6: { ...typography.heading.h6, fontFamily: fontFamilies.sans },
  body1: {
    ...typography.body.default,
    letterSpacing: letterSpacings.normal,
    fontFamily: fontFamilies.sans,
  },
  body2: {
    ...typography.body.small,
    letterSpacing: letterSpacings.normal,
    fontFamily: fontFamilies.sans,
  },
  subtitle1: {
    ...typography.body.large,
    letterSpacing: letterSpacings.normal,
    fontFamily: fontFamilies.sans,
  },
  subtitle2: {
    ...typography.body.small,
    letterSpacing: letterSpacings.normal,
    fontFamily: fontFamilies.sans,
  },
  caption: {
    ...typography.body.caption,
    letterSpacing: letterSpacings.normal,
    fontFamily: fontFamilies.sans,
  },
  overline: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.widest,
    fontFamily: fontFamilies.sans,
    textTransform: "uppercase",
  },
  button: {
    ...typography.button.default,
    letterSpacing: letterSpacings.normal,
    fontFamily: fontFamilies.sans,
  },
  code: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacings.normal,
    fontFamily: fontFamilies.mono,
  },
};
