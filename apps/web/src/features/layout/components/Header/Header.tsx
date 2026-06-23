// components/Layout/Header/Header.tsx
import React, { FC, useEffect, useState, useRef } from "react";
import styles from "./header.module.css";
import {
  Menu,
  Sun,
  Moon,
  Bug,
  Gamepad2,
  ChevronDown,
  User,
  Palette,
} from "lucide-react";
import { HeaderProps } from "./types";
import { navItems } from "@/constants/navigation";
import { useTheme, type ThemeName } from "@/theme";
import MobileMenu from "@/features/navigation/components/MobileMenu/MobileMenu";

const Header: FC<HeaderProps> = ({
  onMenuClick,
  isDarkMode,
  onThemeToggle,
  isSidebarCollapsed,
  isSidebarOpen = true,
  sidebarWidth = 0,
  isMobile = false,
  gameMode,
  onGameModeToggle,
  debugMode = false,
  onDebugModeToggle,
}): React.ReactElement => {
  // Calculate header left offset based on sidebar state (desktop only)
  const headerLeftOffset = isMobile ? 0 : isSidebarOpen ? sidebarWidth : 0;
  const [scrolled, setScrolled] = useState(false);
  const [activePath, setActivePath] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { themeName, setThemeName } = useTheme();
  const _currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  // Available themes with "coming soon" labels
  const availableThemes = [
    { id: "cosmic-frontier", name: "Cosmic Frontier", comingSoon: false },
    { id: "classic", name: "Classic", comingSoon: true },
    { id: "neon-city", name: "Neon City", comingSoon: true },
    { id: "forest-calm", name: "Forest Calm", comingSoon: true },
    { id: "ocean-depths", name: "Ocean Depths", comingSoon: true },
  ];

  // Handle scroll event to add transparency
  useEffect(() => {
    const handleScroll = (): void => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    // Set active path based on current location
    const updateActivePath = (): void => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      // For homepage with hash
      if (pathname === "/" && hash) {
        setActivePath(pathname + hash);
      }
      // For homepage without hash
      else if (pathname === "/" && !hash) {
        setActivePath(pathname);
      }
      // For other pages
      else {
        setActivePath(pathname);
      }
    };

    updateActivePath();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("hashchange", updateActivePath);

    // Close profile menu when clicking outside
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return (): void => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", updateActivePath);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [scrolled, profileMenuRef]);

  // Function to determine if a nav item is active
  const isNavItemActive = (href: string): boolean => {
    if (href === "/") {
      return activePath === "/";
    }
    // For hash links on homepage
    if (href.startsWith("/#")) {
      return activePath === href;
    }
    // For other pages
    return activePath.startsWith(href) && !activePath.includes("#");
  };

  const handleThemeSelect = (themeId: string): void => {
    setThemeName(themeId as ThemeName);
    setThemeMenuOpen(false);
    setProfileMenuOpen(false);
  };

  // Handle mobile menu toggle
  const handleMobileMenuToggle = (): void => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const mobileMenuItems = navItems.map((item) => {
    type ButtonStyle = "default" | "primary" | "secondary";
    let buttonStyle: ButtonStyle = "default";

    if (item.label === "Get in Touch") {
      buttonStyle = "primary";
    } else if (item.label === "Our Focus Areas") {
      buttonStyle = "secondary";
    }

    return {
      path: item.href,
      label: item.label,
      style: buttonStyle,
    };
  });

  return (
    <>
      <header
        className={`${styles.header} ${
          scrolled ? styles.headerScrolled : ""
        } ${!isDarkMode ? styles.lightMode : ""}`}
        style={{
          left: `${headerLeftOffset}px`,
          width: `calc(100% - ${headerLeftOffset}px)`,
          transition: "left 0.3s ease, width 0.3s ease",
        }}
      >
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            {window.innerWidth < 768 ? (
              <button
                className={styles.menuButton}
                onClick={handleMobileMenuToggle}
                aria-label="Toggle mobile menu"
              >
                <Menu size={20} />
              </button>
            ) : (
              !isSidebarCollapsed && (
                <button
                  className={styles.menuButton}
                  onClick={onMenuClick}
                  aria-label="Toggle sidebar"
                >
                  <Menu size={20} />
                </button>
              )
            )}

            {(window.innerWidth < 768 || isSidebarCollapsed) && (
              <a href="/" className={styles.logoContainer}>
                <span className={styles.logoText}>Phoenix VC</span>
              </a>
            )}
          </div>

          <nav className={styles.nav}>
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.href} className={styles.navItem}>
                  <a
                    href={item.href}
                    className={`${styles.navLink} ${
                      isNavItemActive(item.href) ? styles.activeNavLink : ""
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.headerControls}>
            {import.meta.env.DEV && onGameModeToggle && (
              <button
                className={`${styles.controlButton} ${
                  gameMode ? styles.activeControl : ""
                }`}
                onClick={onGameModeToggle}
                aria-label="Toggle game mode"
                title={gameMode ? "Disable Game Mode" : "Enable Game Mode"}
              >
                <Gamepad2 size={18} />
              </button>
            )}

            {import.meta.env.DEV && onDebugModeToggle && (
              <button
                className={`${styles.controlButton} ${
                  debugMode ? styles.activeControl : ""
                }`}
                onClick={onDebugModeToggle}
                aria-label="Toggle debug mode"
                title={debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
              >
                <Bug size={18} />
              </button>
            )}

            <button
              className={styles.themeToggleButton}
              onClick={onThemeToggle}
              aria-label="Toggle theme"
              title={
                isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
              }
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Profile Button with Gradient Background and Icon */}
            <div className={styles.profileMenuContainer} ref={profileMenuRef}>
              <button
                className={`${styles.profileButton} ${profileMenuOpen ? styles.active : ""}`}
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-label="Profile menu"
              >
                <div className={styles.profileImageContainer}>
                  <div className={styles.profileImage}>
                    <User size={16} className={styles.profileUserIcon} />
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`${styles.dropdownIcon} ${profileMenuOpen ? styles.open : ""}`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className={styles.profileDropdown}>
                  <div className={styles.profileHeader}>
                    <div className={styles.profileImageLarge}>
                      <User size={24} className={styles.profileUserIconLarge} />
                    </div>
                    <div className={styles.profileInfo}>
                      <div className={styles.profileName}>Guest User</div>
                      <div className={styles.profileEmail}>
                        guest@example.com
                      </div>
                    </div>
                  </div>

                  <div className={styles.dropdownDivider}></div>

                  {/* Theme Selection Option */}
                  <div
                    className={styles.dropdownItem}
                    onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                  >
                    <Palette size={18} className={styles.dropdownItemIcon} />
                    <span>Theme Selection</span>
                    <ChevronDown
                      size={16}
                      className={`${styles.dropdownItemChevron} ${themeMenuOpen ? styles.open : ""}`}
                    />
                  </div>

                  {/* Theme Selection Submenu */}
                  {themeMenuOpen && (
                    <div className={styles.themeSubmenu}>
                      {availableThemes.map((theme) => (
                        <div
                          key={theme.id}
                          className={`${styles.themeOption} ${themeName === theme.id ? styles.activeTheme : ""}`}
                          onClick={() =>
                            !theme.comingSoon && handleThemeSelect(theme.id)
                          }
                        >
                          <div
                            className={styles.themeColorIndicator}
                            data-theme={theme.id}
                          ></div>
                          <span>{theme.name}</span>
                          {theme.comingSoon && (
                            <span className={styles.comingSoonBadge}>
                              Coming Soon
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={mobileMenuItems}
        isDarkMode={isDarkMode}
        className={isDarkMode ? styles.darkMobileMenu : styles.lightMobileMenu}
      />
    </>
  );
};

export default Header;
