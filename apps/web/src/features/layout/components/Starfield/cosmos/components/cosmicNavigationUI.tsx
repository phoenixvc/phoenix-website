// apps/web/src/features/layout/components/Starfield/cosmos/components/CosmicNavigationUI.tsx
import React from "react";
import styles from "../../starfield.module.css";
import { getObjectById } from "../cosmicHierarchy";
import { CosmicNavigationState } from "../types";

interface CosmicNavigationUIProps {
  state: CosmicNavigationState;
  setState: React.Dispatch<React.SetStateAction<CosmicNavigationState>>;
  className?: string;
}

const CosmicNavigationUI: React.FC<CosmicNavigationUIProps> = ({
  state,
  setState,
  className,
}) => {
  const {
    currentLevel,
    currentGalaxyId,
    currentSunId,
    currentPlanetId,
  } = state;

  const handleBack = (): void => {
    switch (currentLevel) {
      case "galaxy":
        setState({
          currentLevel: "universe",
          isTransitioning: true,
        });
        break;
      case "sun":
        setState({
          currentLevel: "galaxy",
          currentGalaxyId,
          currentSunId: undefined,
          currentPlanetId: undefined,
          isTransitioning: true,
        });
        break;
      case "planet":
        setState({
          currentLevel: "sun",
          currentGalaxyId,
          currentSunId,
          currentPlanetId: undefined,
          isTransitioning: true,
        });
        break;
      default:
        break;
    }
  };

  // Only show navigation UI if not at universe level
  if (currentLevel === "universe") return null;

  // Get current location name
  let locationName = "Unknown";
  if (currentPlanetId) {
    const planet = getObjectById(currentPlanetId);
    locationName = planet?.name || "Unknown Planet";
  } else if (currentSunId) {
    const sun = getObjectById(currentSunId);
    locationName = sun?.name || "Unknown Sun";
  } else if (currentGalaxyId) {
    const galaxy = getObjectById(currentGalaxyId);
    locationName = galaxy?.name || "Unknown Galaxy";
  }

  return (
    <div className={`${styles.cosmicNavigation} ${className || ""}`}>
      <button className={styles.backButton} onClick={handleBack}>
        ← Back
      </button>
      <div className={styles.locationName}>{locationName}</div>
    </div>
  );
};

export default CosmicNavigationUI;
