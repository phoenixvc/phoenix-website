import React, { useState } from "react";
import Layout from "@/features/layout/components/Layout";
import { CosmicNavigationState } from "@/features/layout/components/Starfield/types";
import styles from "@/styles/CosmicDemo.module.css";
// Type assertion to fix the 'styles is of type unknown' error
const typedStyles = styles as Record<string, string>;

const CosmicDemo: React.FC = () => {
  const [navigationState, _setNavigationState] =
    useState<CosmicNavigationState>({
      currentLevel: "universe",
      isTransitioning: false,
    });

  return (
    <Layout>
      <div className={typedStyles.cosmicDemoContainer}>
        <div className={typedStyles.cosmicInfo}>
          <h1>Cosmic Navigation System</h1>
          <p>
            Explore the Phoenix VC website through our cosmic navigation system.
            Click on galaxies, star systems, and special objects to navigate
            through the cosmic hierarchy.
          </p>

          <div className={typedStyles.navigationStatus}>
            <h2>Current Navigation State</h2>
            <div className={typedStyles.statusItem}>
              <span className={typedStyles.statusLabel}>Level:</span>
              <span className={typedStyles.statusValue}>
                {navigationState.currentLevel}
              </span>
            </div>

            {navigationState.currentGalaxyId && (
              <div className={typedStyles.statusItem}>
                <span className={typedStyles.statusLabel}>Galaxy:</span>
                <span className={typedStyles.statusValue}>
                  {navigationState.currentGalaxyId}
                </span>
              </div>
            )}

            {navigationState.currentSunId && (
              <div className={typedStyles.statusItem}>
                <span className={typedStyles.statusLabel}>Sun:</span>
                <span className={typedStyles.statusValue}>
                  {navigationState.currentSunId}
                </span>
              </div>
            )}

            {navigationState.currentSpecialObjectId && (
              <div className={typedStyles.statusItem}>
                <span className={typedStyles.statusLabel}>Special Object:</span>
                <span className={typedStyles.statusValue}>
                  {navigationState.currentSpecialObjectId}
                </span>
              </div>
            )}
          </div>

          <div className={typedStyles.instructions}>
            <h2>Instructions</h2>
            <ul>
              <li>Click on a galaxy to zoom in and see its star systems</li>
              <li>Click on a star system to zoom in and see its details</li>
              <li>Click on empty space to zoom out to the previous level</li>
              <li>Hover over objects to see their names</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CosmicDemo;
