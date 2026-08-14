// components/Layout/Layout.tsx
import { Sidebar } from "@/features/sidebar/components/Sidebar";
import React, { useEffect, useRef, useState } from "react";
import { Footer } from "./Footer/Footer";
import Header from "./Header/Header";
import styles from "./layout.module.css";
import { type StarfieldRef } from "./Starfield/Starfield";
import { ThemeEnvironment, type EnvironmentFixture } from "./ThemeEnvironment";
import { CosmicNavigationState, Star } from "./Starfield/types";
import { logger } from "@/utils/logger";
import Disclaimer from "@/components/ui/Disclaimer";
import { useTheme } from "@/theme";

interface LayoutProps {
  children: React.ReactNode;
}

// Load debug mode from localStorage to persist setting across reloads
const loadDebugModeFromStorage = (): boolean => {
  try {
    const saved = localStorage.getItem("starfieldDebugSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.isDebugMode ?? false;
    }
  } catch {
    // Silent fail
  }
  return false;
};

const Layout = ({ children }: LayoutProps): React.ReactElement => {
  // Use theme context for dark mode - defaults to dark, only light if user explicitly chose it
  const { themeName, themeMode, toggleMode } = useTheme();
  const isDarkMode = themeMode === "dark";

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [gameMode, setGameMode] = useState(false);
  // Load debug mode from localStorage to persist setting
  const [debugMode, setDebugMode] = useState(loadDebugModeFromStorage);
  // Disclaimer states
  const [showGameModeDisclaimer, setShowGameModeDisclaimer] = useState(false);
  const [showMobileDisclaimer, setShowMobileDisclaimer] = useState(false);
  const [hasShownMobileDisclaimer, setHasShownMobileDisclaimer] =
    useState(false);
  // Cosmic navigation state
  const [_cosmicNavigation, setCosmicNavigation] =
    useState<CosmicNavigationState>({
      currentLevel: "universe",
      isTransitioning: false,
    });

  // Create a ref to the starfield component
  const starfieldRef = useRef<StarfieldRef>(null);
  const environmentFixture: EnvironmentFixture | undefined =
    import.meta.env.DEV &&
    (new URLSearchParams(window.location.search).get("cosmic-fixture") ===
      "static" ||
      new URLSearchParams(window.location.search).get("phoenix-fixture") ===
        "static")
      ? {
          seed: 20260814,
          timeMs: 12000,
          qualityTier: "low",
          motionMode: "reduced",
          paused: true,
        }
      : undefined;

  // Check if we're on mobile on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = (): void => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Show mobile disclaimer once per session when on mobile
      if (mobile && !hasShownMobileDisclaimer) {
        setShowMobileDisclaimer(true);
        setHasShownMobileDisclaimer(true);
      }

      // Auto-close sidebar on mobile, keep open on desktop
      if (mobile) {
        setIsSidebarOpen(false);
        setIsCollapsed(false); // Ensure not collapsed on mobile
        setSidebarWidth(0); // No sidebar on mobile when closed
      } else {
        setIsSidebarOpen(true);
        setSidebarWidth(isCollapsed ? 60 : 220); // Set width based on collapsed state
      }
    };

    // Initial check
    checkIfMobile();

    // Add event listener
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return (): void => window.removeEventListener("resize", checkIfMobile);
  }, [hasShownMobileDisclaimer, isCollapsed]);

  // Update sidebar width when collapse state changes
  useEffect(() => {
    if (!isMobile) {
      setSidebarWidth(isCollapsed ? 60 : 220);
    }
  }, [isCollapsed, isMobile]);

  // Dark mode is now controlled by the theme context (useTheme hook)
  // No need for system preference check - theme context handles it

  const toggleSidebar = (): void => {
    if (isMobile) {
      // On mobile, toggle open/closed
      setIsSidebarOpen((prev: boolean) => !prev);
      setSidebarWidth((prev: number) => (prev === 0 ? 220 : 0));
    } else {
      // On desktop, toggle between collapsed and full
      setIsCollapsed((prev: boolean): boolean => !prev);
      setSidebarWidth(isCollapsed ? 220 : 60);
    }
  };

  // Separate function for sidebar collapse (used by sidebar component)
  const toggleCollapse = (): void => {
    setIsCollapsed((prev: boolean): boolean => !prev);
  };

  // Toggle game mode
  const toggleGameMode = (): void => {
    setGameMode((prev: boolean): boolean => {
      const newValue = !prev;
      // Show disclaimer when enabling game mode
      if (newValue) {
        setShowGameModeDisclaimer(true);
      }
      return newValue;
    });
  };

  // Toggle debug mode
  const toggleDebugMode = (): void => {
    logger.debug(
      "Debug mode toggle clicked in Layout, current value:",
      debugMode,
    );
    const newDebugMode = !debugMode;

    // Update local state
    setDebugMode(newDebugMode);

    // Update the starfield component's debug mode
    if (starfieldRef.current) {
      logger.debug("Updating starfield debug mode to:", newDebugMode);
      starfieldRef.current.updateDebugSetting("isDebugMode", newDebugMode);
    } else {
      logger.warn("Starfield ref is not available");
    }
  };

  // Handle cosmic navigation
  const _handleCosmicNavigation = (state: CosmicNavigationState): void => {
    setCosmicNavigation(state);
    logger.debug("Navigation updated:", state);
  };

  const customDebugInfo = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mousePosition: { x: number; y: number; isOnScreen?: boolean } | null,
    stars: Star[],
    mouseEffectRadius: number,
    _timestamp?: number,
  ): void => {
    // Custom debug visualization
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, 10, 200, 120);

    ctx.font = "14px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("Custom Debug Info", 20, 30);
    ctx.fillText(`Stars: ${stars.length}`, 20, 50);

    // Handle null mousePosition
    if (mousePosition) {
      ctx.fillText(
        `Mouse: ${Math.round(mousePosition.x)}, ${Math.round(mousePosition.y)}`,
        20,
        70,
      );

      // Draw mouse effect radius
      if (mousePosition.isOnScreen) {
        ctx.beginPath();
        ctx.arc(
          mousePosition.x,
          mousePosition.y,
          mouseEffectRadius,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = "rgba(138, 43, 226, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      ctx.fillText("Mouse: Not available", 20, 70);
    }

    ctx.fillText(`Dark Mode: ${isDarkMode ? "On" : "Off"}`, 20, 90);
    ctx.fillText(`Game Mode: ${gameMode ? "On" : "Off"}`, 20, 110);
  };

  return (
    <div
      className={`${styles.layoutWrapper} ${
        isDarkMode ? styles.darkMode : styles.lightMode
      } ${styles.starfieldContainer}`}
    >
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className={styles.skipToContent}>
        Skip to main content
      </a>

      <ThemeEnvironment
        key={`environment-${themeName}-${isDarkMode}-${sidebarWidth}-${gameMode}`}
        ref={starfieldRef}
        themeName={themeName}
        sidebarWidth={sidebarWidth}
        isDarkMode={isDarkMode}
        gameMode={gameMode}
        debugMode={debugMode}
        drawDebugInfo={customDebugInfo}
        fixture={environmentFixture}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => isMobile && setIsSidebarOpen(false)}
        isDarkMode={isDarkMode}
        isMobile={isMobile}
        collapsed={isCollapsed}
        onToggle={toggleSidebar}
        onCollapse={toggleCollapse}
        mode={isDarkMode ? "dark" : "light"}
      />

      {isMobile && isSidebarOpen && (
        <div
          className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.visible : ""}`}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={styles.contentWrapper}
        style={{
          marginLeft: isMobile
            ? 0
            : isSidebarOpen
              ? isCollapsed
                ? "60px"
                : "220px"
              : 0,
        }}
      >
        <Header
          onMenuClick={toggleSidebar}
          isDarkMode={isDarkMode}
          onThemeToggle={toggleMode}
          isSidebarCollapsed={isCollapsed}
          isSidebarOpen={isSidebarOpen}
          sidebarWidth={sidebarWidth}
          isMobile={isMobile}
          gameMode={gameMode}
          onGameModeToggle={toggleGameMode}
          debugMode={debugMode}
          onDebugModeToggle={toggleDebugMode}
        />

        <main
          id="main-content"
          className={`${styles.mainContent} ${isDarkMode ? styles.darkMain : styles.lightMain}`}
          role="main"
        >
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(
                  child as React.ReactElement<{
                    isDarkMode: boolean;
                    sidebarWidth: number;
                  }>,
                  {
                    isDarkMode,
                    sidebarWidth,
                  },
                )
              : child,
          )}
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>

      {/* Game Mode Disclaimer */}
      {showGameModeDisclaimer && (
        <Disclaimer
          type="warning"
          title="Experimental Feature"
          message="Game mode adds interactive elements and may affect site performance. Recommended for desktop browsers. You can disable this at any time."
          onDismiss={() => setShowGameModeDisclaimer(false)}
        />
      )}

      {/* Mobile Optimization Disclaimer */}
      {showMobileDisclaimer && (
        <Disclaimer
          type="coming-soon"
          title="Mobile Optimization"
          message="For the best experience on mobile devices, some interactive features are simplified. Full comet interactions coming soon! Visit us on desktop for the complete interactive experience."
          onDismiss={() => setShowMobileDisclaimer(false)}
        />
      )}
    </div>
  );
};

export default Layout;
