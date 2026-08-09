import { forwardRef, useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks";
import type { StarfieldRef } from "../Starfield/Starfield";
import CosmicFrontierEnvironment from "./CosmicFrontierEnvironment";
import { COSMIC_FRONTIER_ENVIRONMENT, THEME_ENVIRONMENTS } from "./registry";
import type { ThemeEnvironmentProps } from "./types";

const ThemeEnvironment = forwardRef<StarfieldRef, ThemeEnvironmentProps>(
  ({ themeName, fixture, ...runtimeProps }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const [pageVisible, setPageVisible] = useState(
      () => typeof document === "undefined" || !document.hidden,
    );

    useEffect(() => {
      const handleVisibilityChange = (): void => {
        setPageVisible(!document.hidden);
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return (): void =>
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
    }, []);

    const definition =
      THEME_ENVIRONMENTS[themeName as keyof typeof THEME_ENVIRONMENTS] ??
      COSMIC_FRONTIER_ENVIRONMENT;
    const motionMode =
      fixture?.motionMode ?? (prefersReducedMotion ? "reduced" : "full");
    const paused = fixture?.paused ?? (!pageVisible || prefersReducedMotion);

    return (
      <div
        data-theme-environment={definition.rendererId}
        data-theme-environment-owner={definition.themeName}
        data-theme-environment-fallback={
          definition.themeName === themeName ? "false" : "true"
        }
        data-motion={motionMode}
        data-lifecycle={paused ? "paused" : "running"}
      >
        <CosmicFrontierEnvironment
          {...runtimeProps}
          ref={ref}
          motionMode={motionMode}
          paused={paused}
          qualityTier={fixture?.qualityTier}
          randomSeed={fixture?.seed}
          fixedTimestamp={fixture?.timeMs}
        />
      </div>
    );
  },
);

ThemeEnvironment.displayName = "ThemeEnvironment";

export default ThemeEnvironment;
