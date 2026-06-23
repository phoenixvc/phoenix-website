// components/Layout/Sidebar/Sidebar.tsx
import React, { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import styles from "../styles/sidebar.module.css";
import { SidebarProps } from "../types";
import { DEFAULT_SIDEBAR_GROUPS } from "../constants/sidebar.constants";

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  isDarkMode = true,
  isMobile = false,
  collapsed = false,
  onToggle: _onToggle,
  onCollapse,
  mode: _mode = "dark",
}): React.ReactElement | null => {
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    const updateCurrentPath = (): void => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      // For homepage with hash
      if (pathname === "/" && hash) {
        setCurrentPath(pathname + hash);
      }
      // For homepage without hash
      else if (pathname === "/" && !hash) {
        setCurrentPath(pathname);
      }
      // For other pages
      else {
        setCurrentPath(pathname);
      }
    };

    updateCurrentPath();
    window.addEventListener("popstate", updateCurrentPath);
    window.addEventListener("hashchange", updateCurrentPath);

    return (): void => {
      window.removeEventListener("popstate", updateCurrentPath);
      window.removeEventListener("hashchange", updateCurrentPath);
    };
  }, []);

  // Don't render if closed on mobile
  if (isMobile && !isOpen) return null;

  const sidebarClasses = [
    styles.sidebar,
    collapsed ? styles.sidebarCollapsed : "",
    isDarkMode ? styles.darkMode : styles.lightMode,
    isMobile ? styles.mobileSidebar : "",
    isMobile && isOpen ? styles.sidebarExpanded : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Function to check if a link is active
  const isLinkActive = (href: string): boolean => {
    if (href === "/") {
      return currentPath === "/";
    }
    // For hash links on homepage
    if (href.startsWith("/#")) {
      return currentPath === href;
    }
    // For other pages
    return currentPath.startsWith(href) && !currentPath.includes("#");
  };

  return (
    <aside className={sidebarClasses}>
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarLogo}>Phoenix VC</span>
        {onCollapse && !isMobile && (
          <button
            className={styles.sidebarToggle}
            onClick={onCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={20}
              className={collapsed ? styles.rotateIcon : ""}
            />
          </button>
        )}
        {isMobile && onClose && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            &times;
          </button>
        )}
      </div>

      <div className={styles.sidebarContent}>
        {DEFAULT_SIDEBAR_GROUPS.map((group) => (
          <div
            key={group.title || "primary"}
            className={styles.sidebarSection}
          >
            {group.title && (
              <h3 className={styles.sidebarSectionTitle}>{group.title}</h3>
            )}
            <nav className={styles.sidebarNav}>
              {group.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`${styles.sidebarLink} ${
                    isLinkActive(item.href) ? styles.sidebarLinkActive : ""
                  }`}
                >
                  <span className={styles.sidebarIcon}>{item.icon}</span>
                  <span className={styles.sidebarLabel}>{item.label}</span>
                </a>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};
