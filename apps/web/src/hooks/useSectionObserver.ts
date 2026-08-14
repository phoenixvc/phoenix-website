// src/hooks/useSectionObserver.ts
import { useEffect, useRef, type RefObject } from "react";

interface SectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
}

export const useSectionObserver = (
  sectionId: string,
  callback?: (id: string) => void,
  options: SectionObserverOptions = {
    threshold: 0.5,
    rootMargin: "0px 0px -10% 0px",
  },
): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) => {
    const currentRef = ref.current;
    if (!currentRef) return (): void => {};

    const observer = new IntersectionObserver((entries): void => {
      entries.forEach((entry): void => {
        if (entry.isIntersecting) {
          console.log(`[SectionObserver] Section visible: ${sectionId}`);
          callback?.(sectionId);

          const event = new CustomEvent("sectionVisible", {
            detail: { id: sectionId },
            bubbles: true,
          });
          window.dispatchEvent(event);
        }
      });
    }, options);

    observer.observe(currentRef);

    return (): void => observer.disconnect();
  }, [sectionId, callback, options]);

  return ref;
};
