// features/theme-designer/index.tsx
import { FC } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/theme";
import { Palette, Wrench, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";
import styles from "./ThemeDesigner.module.css";

interface ThemeDesignerProps {
  isDarkMode?: boolean;
}

export const ThemeDesigner: FC<ThemeDesignerProps> = ({
  isDarkMode: propDarkMode,
}) => {
  const { themeMode } = useTheme();
  const isDarkMode = propDarkMode ?? themeMode === "dark";

  return (
    <>
      <SEO
        title="Theme Designer"
        description="Customize your Phoenix VC experience with our upcoming theme designer tool."
        noIndex={true}
      />
      <section
        className={`${styles.container} ${isDarkMode ? styles.dark : styles.light}`}
      >
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <Palette size={64} className={styles.mainIcon} />
            <Wrench size={32} className={styles.toolIcon} />
          </div>

          <h1 className={styles.title}>Theme Designer</h1>

          <div className={styles.badge}>
            <Clock size={16} />
            <span>In Development</span>
          </div>

          <p className={styles.description}>
            We're building a powerful theme customization tool that will let you
            personalize your Phoenix VC experience. Create custom color schemes,
            adjust visual elements, and save your preferences.
          </p>

          <div className={styles.features}>
            <h2 className={styles.featuresTitle}>Coming Features</h2>
            <ul className={styles.featuresList}>
              <li>Custom color palette creation</li>
              <li>Light and dark mode variants</li>
              <li>Starfield visual customization</li>
              <li>Typography adjustments</li>
              <li>Export and share themes</li>
            </ul>
          </div>

          <Link to="/" className={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </section>
    </>
  );
};

export default ThemeDesigner;
