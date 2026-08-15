// components/Layout/Sidebar/Sidebar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const currentPath = location.hash
    ? `${location.pathname}${location.hash}`
    : location.pathname;

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
            key={group.title || group.items[0]?.href || "empty-group"}
            className={styles.sidebarSection}
          >
            {group.title && (
              <h3 className={styles.sidebarSectionTitle}>{group.title}</h3>
            )}
            <nav className={styles.sidebarNav}>
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`${styles.sidebarLink} ${
                    isLinkActive(item.href) ? styles.sidebarLinkActive : ""
                  }`}
                >
                  <span className={styles.sidebarIcon}>{item.icon}</span>
                  <span className={styles.sidebarLabel}>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};
