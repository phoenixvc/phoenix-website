// /features/portfolio/index.tsx
import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/theme";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Github,
  Cpu,
  FileText,
  Eye,
  EyeOff,
  ArrowRight,
  Filter,
  X,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import {
  PORTFOLIO_PROJECTS,
  STATUS_CONFIG,
  FOCUS_AREA_CONFIG,
  type PortfolioProject,
  type ProjectStatus,
  type FocusAreaId,
} from "@/constants/portfolioData";
import { getProjectIcon } from "./projectIcons";
import styles from "./Portfolio.module.css";

// View model for a listing card. Derived from the single source of truth
// (PORTFOLIO_PROJECTS) so the listing can no longer drift from the starfield
// and detail page — that drift previously broke the Rooivalk → Nexamesh link.
interface Project {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  image?: string;
  website?: string;
  github?: string;
  docs?: string;
  status: ProjectStatus;
  tags: string[];
  focusArea: FocusAreaId;
}

// Map a canonical PortfolioProject onto the listing card shape. Links are
// derived from the single `product` field (GitHub vs. website) exactly like
// the project detail page does, so the two views always agree.
const toCardProject = (p: PortfolioProject): Project => {
  const product = p.product?.trim() ?? "";
  const isGithub = product.includes("github");
  const tags = Array.isArray(p.skills) ? p.skills : p.skills ? [p.skills] : [];
  return {
    id: p.id,
    name: p.name,
    description: p.tagline ?? p.position ?? "",
    longDescription: p.bio ?? "",
    image: p.image,
    website: product && !isGithub ? product : undefined,
    github: product && isGithub ? product : undefined,
    status: p.status,
    tags,
    focusArea: p.focusArea,
  };
};

const projects: Project[] = PORTFOLIO_PROJECTS.filter(
  (p) => p.listed !== false,
).map(toCardProject);

const animations = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  },
  card: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  },
};

export const Portfolio = (): React.ReactElement => {
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === "dark";
  const [showComingSoon, setShowComingSoon] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | "all">(
    "all",
  );
  const [selectedFocusArea, setSelectedFocusArea] = useState<
    FocusAreaId | "all"
  >("all");
  const navigate = useNavigate();

  // Determine if a project is "coming soon" (no public links available)
  const isComingSoon = (project: Project): boolean =>
    !project.website && !project.github && !project.docs;

  // Handle card click - navigate to project detail page
  const handleCardClick = (projectId: string): void => {
    void navigate(`/portfolio/${projectId}`);
  };

  // Get unique statuses and focus areas from projects
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(projects.map((p) => p.status));
    return Array.from(statuses);
  }, []);

  const uniqueFocusAreas = useMemo(() => {
    const areas = new Set(projects.map((p) => p.focusArea));
    return Array.from(areas);
  }, []);

  // Filter projects based on all filters
  const visibleProjects = useMemo(() => {
    return projects.filter((project) => {
      // Coming soon filter
      if (!showComingSoon && isComingSoon(project)) return false;
      // Status filter
      if (selectedStatus !== "all" && project.status !== selectedStatus)
        return false;
      // Focus area filter
      if (
        selectedFocusArea !== "all" &&
        project.focusArea !== selectedFocusArea
      )
        return false;
      return true;
    });
  }, [showComingSoon, selectedStatus, selectedFocusArea]);

  const comingSoonCount = projects.filter(isComingSoon).length;
  const hasActiveFilters =
    selectedStatus !== "all" || selectedFocusArea !== "all";

  const clearFilters = (): void => {
    setSelectedStatus("all");
    setSelectedFocusArea("all");
  };

  return (
    <>
      <SEO
        title="Investment Portfolio"
        description="Explore Phoenix VC's portfolio of innovative technology companies across AI, fintech, blockchain, and emerging technologies."
        keywords="venture capital portfolio, tech investments, startup portfolio, AI companies, fintech investments"
      />
      <section
        className={`${styles.portfolioSection} ${isDarkMode ? styles.dark : styles.light}`}
      >
        {/* Close button - fixed top right like a modal */}
        <button
          onClick={() => void navigate("/")}
          className={styles.closeButton}
          aria-label="Close and return to home"
        >
          <X size={24} />
        </button>

        <div className={styles.container}>
          <motion.div
            className={styles.content}
            initial="hidden"
            animate="visible"
            variants={animations.container}
          >
            {/* Header */}
            <motion.div className={styles.header} variants={animations.item}>
              <div className={styles.headerIcon}>
                <Cpu size={48} />
              </div>
              <h1 className={styles.sectionHeading}>Our Portfolio</h1>
              <div className={styles.divider}></div>
              <p className={styles.subtitle}>
                Pioneering the future through innovative projects and
                cutting-edge technology initiatives.
              </p>
            </motion.div>

            {/* Filter Section */}
            <motion.div
              className={styles.filterSection}
              variants={animations.item}
            >
              <div className={styles.filterHeader}>
                <div className={styles.filterLabel}>
                  <Filter size={18} />
                  <span>Filter by</span>
                </div>
                {hasActiveFilters && (
                  <button
                    className={styles.clearFilters}
                    onClick={clearFilters}
                  >
                    <X size={14} />
                    Clear filters
                  </button>
                )}
              </div>

              {/* Focus Area Pills */}
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>Focus Area</span>
                <div className={styles.pillGroup}>
                  <button
                    className={`${styles.pill} ${selectedFocusArea === "all" ? styles.pillActive : ""}`}
                    onClick={() => setSelectedFocusArea("all")}
                  >
                    All Areas
                  </button>
                  {uniqueFocusAreas.map((area) => (
                    <button
                      key={area}
                      className={`${styles.pill} ${selectedFocusArea === area ? styles.pillActive : ""}`}
                      onClick={() => setSelectedFocusArea(area)}
                      style={{
                        ...(selectedFocusArea === area && {
                          backgroundColor: `${FOCUS_AREA_CONFIG[area].color}20`,
                          borderColor: FOCUS_AREA_CONFIG[area].color,
                          color: FOCUS_AREA_CONFIG[area].color,
                        }),
                      }}
                    >
                      <span
                        className={styles.pillDot}
                        style={{
                          backgroundColor: FOCUS_AREA_CONFIG[area].color,
                        }}
                      />
                      {FOCUS_AREA_CONFIG[area].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Pills */}
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>Stage</span>
                <div className={styles.pillGroup}>
                  <button
                    className={`${styles.pill} ${selectedStatus === "all" ? styles.pillActive : ""}`}
                    onClick={() => setSelectedStatus("all")}
                  >
                    All Stages
                  </button>
                  {uniqueStatuses.map((status) => (
                    <button
                      key={status}
                      className={`${styles.pill} ${selectedStatus === status ? styles.pillActive : ""}`}
                      onClick={() => setSelectedStatus(status)}
                      style={{
                        ...(selectedStatus === status && {
                          backgroundColor: STATUS_CONFIG[status].bg,
                          borderColor: STATUS_CONFIG[status].text,
                          color: STATUS_CONFIG[status].text,
                        }),
                      }}
                    >
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show/Hide Coming Soon Toggle */}
              {comingSoonCount > 0 && (
                <div className={styles.filterGroup}>
                  <button
                    className={styles.toggleButton}
                    onClick={() => setShowComingSoon(!showComingSoon)}
                    aria-label={
                      showComingSoon
                        ? "Hide coming soon projects"
                        : "Show coming soon projects"
                    }
                  >
                    {showComingSoon ? <EyeOff size={18} /> : <Eye size={18} />}
                    <span>
                      {showComingSoon
                        ? `Hide Coming Soon (${comingSoonCount})`
                        : `Show Coming Soon (${comingSoonCount})`}
                    </span>
                  </button>
                </div>
              )}

              {/* Results Count */}
              <div className={styles.resultsCount}>
                Showing {visibleProjects.length} of {projects.length} projects
              </div>
            </motion.div>

            {/* Projects Grid */}
            <motion.div
              className={styles.projectsGrid}
              variants={animations.item}
            >
              {visibleProjects.map((project) => (
                <motion.div
                  key={project.id}
                  className={`${styles.projectCard} ${styles.clickableCard}`}
                  variants={animations.card}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  onClick={() => handleCardClick(project.id)}
                  role="article"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCardClick(project.id);
                    }
                  }}
                  aria-label={`View details for ${project.name}`}
                >
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <div
                        className={styles.projectIcon}
                        style={
                          project.image
                            ? { background: "transparent" }
                            : undefined
                        }
                      >
                        {project.image ? (
                          <img
                            src={project.image}
                            alt=""
                            className={styles.projectIconImage}
                          />
                        ) : (
                          getProjectIcon(project.id, 32)
                        )}
                      </div>
                      <div
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: STATUS_CONFIG[project.status].bg,
                          color: STATUS_CONFIG[project.status].text,
                        }}
                      >
                        {STATUS_CONFIG[project.status].label}
                      </div>
                    </div>

                    <h2 className={styles.projectName}>{project.name}</h2>
                    <p className={styles.projectDescription}>
                      {project.description}
                    </p>
                    <p className={styles.projectLongDescription}>
                      {project.longDescription}
                    </p>

                    <div className={styles.tags}>
                      {project.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <Link
                      to={`/portfolio/${project.id}`}
                      className={`${styles.actionButton} ${styles.detailsButton}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowRight size={18} />
                      View Details
                    </Link>
                    {project.website && (
                      <a
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionButton}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={18} />
                        Website
                      </a>
                    )}
                    {project.docs && (
                      <a
                        href={project.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.actionButton} ${styles.docsButton}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText size={18} />
                        Docs
                      </a>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.actionButton} ${styles.githubButton}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Github size={18} />
                        GitHub
                      </a>
                    )}
                    {isComingSoon(project) && (
                      <div className={styles.comingSoonBadge}>Coming Soon</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Section */}
            <motion.div
              className={styles.ctaSection}
              variants={animations.item}
            >
              <h3 className={styles.ctaTitle}>Interested in Collaboration?</h3>
              <p className={styles.ctaText}>
                We're always looking for innovative partners and contributors to
                help shape the future of technology.
              </p>
              <motion.a
                href="/#contact"
                className={styles.ctaButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Get in Touch
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Portfolio;
