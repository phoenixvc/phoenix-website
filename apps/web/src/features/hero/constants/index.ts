// features/hero/constants/index.ts
export const ANIMATION_CONFIG = {
  duration: {
    container: 0.8,
    item: 0.5,
  },
  stagger: 0.2,
  ease: "easeOut" as const,
} as const;

export const DEFAULT_HERO_CONTENT = {
  title: "Shaping Tomorrow's Technology",
  subtitle:
    "Strategic investments and partnerships empowering innovation across the globe",
  primaryCta: {
    text: "Our Focus Areas",
    href: "#focus-areas",
  },
  secondaryCta: {
    text: "Get in Touch",
    href: "#contact",
  },
} as const;

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;
