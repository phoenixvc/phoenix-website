// components/Layout/MobileMenu/MobileMenu.tsx
import React, { FC, memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { twMerge } from "tailwind-merge";
import styles from "./MobileMenu.module.css";
import { MobileMenuProps } from "@/features/layout/types";

const menuVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -5 },
  visible: { opacity: 1, x: 0 },
};

/**
 * Mobile navigation menu component that matches Phoenix VC theme
 */
const MobileMenu: FC<MobileMenuProps> = memo(
  ({
    isOpen,
    onClose,
    navItems,
    className,
    isDarkMode,
  }): React.ReactElement => {
    const navigate = useNavigate();
    const [activeItem, setActiveItem] = useState<string | null>(null);

    const handleNavigation = (path: string, label: string): void => {
      setActiveItem(label);

      setTimeout(() => {
        onClose();

        setTimeout(() => {
          if (path.startsWith("#")) {
            const element = document.querySelector(path);
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            }
          } else {
            void navigate(path);
          }

          setActiveItem(null);
        }, 100);
      }, 150);
    };

    return (
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.backdrop}
              onClick={onClose}
            />

            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={twMerge(
                styles.menuContainer,
                isDarkMode ? styles.darkMode : styles.lightMode,
                className,
              )}
            >
              <nav className={styles.menuNav}>
                {navItems &&
                  navItems.map((item, index) => (
                    <motion.div
                      key={item.path}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.05 }}
                      className={styles.menuItem}
                    >
                      <button
                        onClick={() => handleNavigation(item.path, item.label)}
                        className={twMerge(
                          styles.navLink,
                          item.style === "primary" && styles.primaryButton,
                          item.style === "secondary" && styles.secondaryButton,
                          activeItem === item.label && styles.activeItem,
                        )}
                      >
                        {item.label}
                      </button>
                    </motion.div>
                  ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  },
);

MobileMenu.displayName = "MobileMenu";
export default MobileMenu;
