// features/hero/animations/index.ts
import { HeroAnimations } from "@/features/layout/components/Starfield/types";
import { ANIMATION_CONFIG } from "../constants";

export const heroAnimations: HeroAnimations = {
  container: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_CONFIG.duration.container,
        ease: ANIMATION_CONFIG.ease,
        staggerChildren: ANIMATION_CONFIG.stagger,
      },
    },
  },

  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_CONFIG.duration.item,
        ease: ANIMATION_CONFIG.ease,
      },
    },
  },
};
