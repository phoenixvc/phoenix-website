import { forwardRef, useEffect, useState, type ComponentType } from "react";
import { useReducedMotion } from "@/hooks";
import type { StarfieldRef } from "../Starfield/Starfield";
import CosmicFrontierEnvironment from "./CosmicFrontierEnvironment";
import ForestEnvironment from "./ForestEnvironment";
import HighveldEnvironment from "./HighveldEnvironment";
import { PhoenixEnvironment } from "./PhoenixEnvironment";
import { OceanEnvironment } from "./OceanEnvironment";
import { CloudEnvironment } from "./CloudEnvironment";
import { LavenderEnvironment } from "./LavenderEnvironment";
import { ClassicEnvironment } from "./ClassicEnvironment";
import { COSMIC_FRONTIER_ENVIRONMENT, THEME_ENVIRONMENTS } from "./registry";
import type {
  EnvironmentMotionMode,
  EnvironmentQualityTier,
  ThemeEnvironmentDefinition,
  ThemeEnvironmentProps,
} from "./types";

/**
 * The prop shape every non-Cosmic theme renderer accepts. Cosmic Frontier
 * wraps the legacy Starfield subtree, takes a different prop shape
 * entirely (sidebarWidth/gameMode/debugMode/drawDebugInfo + a forwarded
 * ref), and is rendered as an explicit branch below instead of joining
 * this map — see ThemeEnvironment/README.md.
 */
interface NonCosmicEnvironmentProps {
  isDarkMode: boolean;
  motionMode: EnvironmentMotionMode;
  qualityTier?: EnvironmentQualityTier;
  paused: boolean;
  randomSeed?: number;
  fixedTimestamp?: number;
}

/**
 * Registry-driven renderer lookup: adding a theme means adding one entry
 * here (plus a registry.ts definition) instead of a hand-added branch.
 */
const NON_COSMIC_RENDERERS: Record<
  Exclude<ThemeEnvironmentDefinition["rendererId"], "cosmic-starfield">,
  ComponentType<NonCosmicEnvironmentProps>
> = {
  "forest-canopy": ForestEnvironment,
  "highveld-plateau": HighveldEnvironment,
  "phoenix-reign": PhoenixEnvironment,
  "ocean-abyss": OceanEnvironment,
  "cloud-strato": CloudEnvironment,
  "lavender-meadow": LavenderEnvironment,
  "classic-blueprint": ClassicEnvironment,
};

const ThemeEnvironment = forwardRef<StarfieldRef, ThemeEnvironmentProps>(
  ({ themeName, isDarkMode, fixture, ...runtimeProps }, ref) => {
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
    const NonCosmicEnvironment =
      definition.rendererId !== "cosmic-starfield"
        ? NON_COSMIC_RENDERERS[definition.rendererId]
        : null;

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
        {NonCosmicEnvironment && (
          <NonCosmicEnvironment
            isDarkMode={isDarkMode}
            motionMode={motionMode}
            qualityTier={fixture?.qualityTier}
            paused={paused}
            randomSeed={fixture?.seed}
            fixedTimestamp={fixture?.timeMs}
          />
        )}
        {definition.rendererId === "cosmic-starfield" && (
          <CosmicFrontierEnvironment
            {...runtimeProps}
            ref={ref}
            isDarkMode={isDarkMode}
            motionMode={motionMode}
            paused={paused}
            qualityTier={fixture?.qualityTier}
            randomSeed={fixture?.seed}
            fixedTimestamp={fixture?.timeMs}
          />
        )}
      </div>
    );
  },
);

ThemeEnvironment.displayName = "ThemeEnvironment";

export default ThemeEnvironment;
