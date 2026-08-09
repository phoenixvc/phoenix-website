import React, { useEffect, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./projectTooltip.module.css";
import { PortfolioProject } from "./types";

interface ProjectTooltipProps {
  project: PortfolioProject;
  x: number;
  y: number;
  isPinned?: boolean;
  isDocked?: boolean;
  isDarkMode?: boolean;
  onPin?: (project: PortfolioProject) => void;
  onUnpin?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const ProjectTooltip = forwardRef<HTMLDivElement, ProjectTooltipProps>(({
  project,
  x,
  y,
  isPinned = false,
  isDocked = false,
  isDarkMode = true,
  onPin,
  onUnpin,
  onMouseEnter,
  onMouseLeave,
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return (): void => clearTimeout(timer);
  }, []);

  // Calculate tooltip position to ensure it stays within viewport
  const adjustPosition = (): React.CSSProperties => {
    if (isDocked) {
      return {
        position: "relative",
        // No left/top needed, it flows in the container
        marginBottom: "10px",
        width: "100%", // Fit to dock
      };
    }

    const tooltipWidth = 280;
    const tooltipHeight = 250;
    const windowWidth =
      typeof window !== "undefined" ? window.innerWidth : 1200;
    const windowHeight =
      typeof window !== "undefined" ? window.innerHeight : 800;

    let tooltipX = x + 20;
    let tooltipY = y - tooltipHeight / 2;

    if (tooltipX + tooltipWidth > windowWidth - 20) {
      tooltipX = x - tooltipWidth - 20;
    }

    if (tooltipY < 20) {
      tooltipY = 20;
    } else if (tooltipY + tooltipHeight > windowHeight - 20) {
      tooltipY = windowHeight - tooltipHeight - 20;
    }

    return {
      left: tooltipX,
      top: tooltipY,
      position: "fixed",
    };
  };

  const styleProps = adjustPosition();

  // Format status for display
  const formatStatus = (status?: string): string => {
    const statusMap: Record<string, string> = {
      alpha: "Alpha",
      "private-preview": "Private Preview",
      "pre-alpha": "Pre-Alpha",
      seed: "Seed",
      "early-stage": "Early Stage",
      growth: "Growth Stage",
      active: "Active",
    };
    return statusMap[status || ""] || "Portfolio";
  };

  const projectStage = formatStatus(project.status);
  const focusAreaLabel =
    project.focusArea
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ||
    project.department ||
    "Technology";
  const badgeText = projectStage;
  const skillsList = Array.isArray(project.skills)
    ? project.skills.slice(0, 3).join(", ")
    : project.expertise || "Innovation";

  // Event handlers
  const handleTooltipClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!isPinned && onPin) {
      onPin(project);
    }
  };

  const handleCloseClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onUnpin) {
      onUnpin();
    }
  };

  // Get project color
  const projectColor = project.color || (isDarkMode ? "#9d4edd" : "#7b2cbf");

  return (
    <div
      ref={ref}
      className={`
        ${styles.tooltip}
        ${isVisible ? styles.visible : ""}
        ${isPinned ? styles.pinned : ""}
        ${isDocked ? styles.docked : ""}
        ${!isDarkMode ? styles.lightMode : ""}
      `}
      style={{
        ...styleProps,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(10px)",
      }}
      onClick={handleTooltipClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      // Touch support for mobile - touchstart acts like mouseenter to keep tooltip visible
      onTouchStart={onMouseEnter}
    >
      {isPinned && (
        <div className={styles.tooltipCloseButton} onClick={handleCloseClick}>
          ×
        </div>
      )}

      <div
        className={styles.tooltipGlowEffect}
        style={{
          background: `radial-gradient(circle at left center, ${isDarkMode ? "rgba(157, 78, 221, 0.12)" : "rgba(123, 44, 191, 0.08)"} 0%, rgba(0, 0, 0, 0) 70%)`,
        }}
      />

      <div className={styles.tooltipHeader}>
        <div
          className={styles.tooltipAvatar}
          style={{
            border: `3px solid ${projectColor}`,
            boxShadow: `0 0 10px ${isDarkMode ? "rgba(157, 78, 221, 0.2)" : "rgba(123, 44, 191, 0.12)"}`,
            backgroundColor: project.image ? "transparent" : projectColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {project.image ? (
            <img src={project.image} alt={project.name} />
          ) : (
            <span
              style={{
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              {project.initials || project.name?.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className={styles.tooltipTitle}>
          <h3>{project.fullName || project.name}</h3>
          <p>{project.position}</p>
        </div>
      </div>

      <div className={styles.tooltipContent}>
        {/* Status badge - moved to top for prominence */}
        <div className={styles.tooltipStatusRow}>
          <span
            className={styles.tooltipStatusBadge}
            style={{
              backgroundColor: `${projectColor}15`,
              color: projectColor,
              borderColor: `${projectColor}40`,
            }}
          >
            {badgeText}
          </span>
          <span className={styles.tooltipFocusArea}>{focusAreaLabel}</span>
        </div>

        {/* Technologies as tags */}
        {skillsList && (
          <div className={styles.tooltipTechSection}>
            <div className={styles.tooltipTechTags}>
              {(Array.isArray(project.skills)
                ? project.skills.slice(0, 4)
                : [project.expertise || "Innovation"]
              ).map((skill, idx) => (
                <span
                  key={idx}
                  className={styles.tooltipTechTag}
                  style={{
                    borderColor: `${projectColor}50`,
                    backgroundColor: `${projectColor}10`,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {project.bio && (
          <div className={styles.tooltipBio}>
            <p>{project.bio}</p>
          </div>
        )}

        <div className={styles.tooltipFooter}>
          <div className={styles.tooltipLinks}>
            {project.product && project.product.trim() !== "" && (
              <a
                href={project.product}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.tooltipLinkBtn}
                onClick={(e) => e.stopPropagation()}
                style={{ color: projectColor }}
              >
                Visit Project →
              </a>
            )}

            <button
              type="button"
              className={styles.tooltipLinkBtn}
              onClick={(e) => {
                e.stopPropagation();
                void navigate(`/portfolio/${project.id}`);
              }}
              style={{ color: projectColor }}
            >
              Learn More →
            </button>
          </div>

          {isPinned && (
            <div className={styles.tooltipPinnedIndicator}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4V2M12 20v2M4 12H2M22 12h-2M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M6.34 6.34L4.93 4.93"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>Pinned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ProjectTooltip.displayName = "ProjectTooltip";

// Export with both names for backward compatibility
export default ProjectTooltip;
export { ProjectTooltip };
// Legacy alias
export const EmployeeTooltip = ProjectTooltip;
