// features/contact/animations/index.ts
import { ANIMATION_DURATION } from "../constants";

export const contactAnimations = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.container,
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATION.item,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  },
};
