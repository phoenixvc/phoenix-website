// features/sidebar/components/SidebarItem.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "@/theme";
import { cn } from "@/lib/utils";
import { SidebarItemProps } from "../types";
import styles from "../styles/sidebar.module.css";

const itemVariants = {
  active: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },
  inactive: {
    scale: 1,
    transition: { duration: 0.2 },
  },
};

const MotionLink = motion(Link);

const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  onClick,
  icon,
  style = {},
  className = "",
  variant = "default",
  active = false,
  href = "#",
  mode: _mode = "light",
  collapsed: _collapsed = false,
  type: _type = "link",
}): React.ReactElement => {
  const location = useLocation();
  const themeContext = useTheme() || {
    themeName: "default",
    getComponentStyle: (): Record<string, unknown> => ({}),
  };

  const isActive = React.useMemo((): boolean => {
    if (active) return true;
    if (!href) return false;

    const pathname = location.pathname;
    const hash = location.hash;

    if (href === "/") {
      return pathname === "/" && !hash;
    }

    if (href.startsWith("/#")) {
      return pathname === "/" && hash === href.substring(1);
    }

    return pathname.startsWith(href) && !pathname.includes("#");
  }, [active, href, location.hash, location.pathname]);

  // Get component style from theme
  const itemStyle =
    themeContext.getComponentStyle?.("sidebar.item", variant) || {};

  // Combine passed style with theme style
  const combinedStyle = {
    ...itemStyle,
    ...style,
  };

  // Use CSS module classes with improved active state detection
  const itemClasses = cn(
    styles.sidebarItem,
    isActive && styles.sidebarItemActive,
    _collapsed && styles.sidebarItemCollapsed,
    _mode === "dark" ? styles.darkItem : styles.lightItem,
    className,
  );

  // Determine if this is a link or button based on onClick
  const content = (
    <>
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      {!_collapsed && <span className={styles.itemLabel}>{label}</span>}
    </>
  );

  if (onClick) {
    return (
      <motion.button
        className={itemClasses}
        style={combinedStyle}
        onClick={onClick}
        variants={itemVariants}
        animate={isActive ? "active" : "inactive"}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.button>
    );
  } else {
    return (
      <MotionLink
        to={href}
        className={itemClasses}
        style={combinedStyle}
        variants={itemVariants}
        animate={isActive ? "active" : "inactive"}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </MotionLink>
    );
  }
};

export default SidebarItem;
