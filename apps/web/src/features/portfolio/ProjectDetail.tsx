// /features/portfolio/ProjectDetail.tsx
import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTheme } from "@/theme";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Github,
  ArrowLeft,
  Calendar,
  Target,
  Layers,
  Users,
  Zap,
  BookOpen,
  Shield,
  Network,
  Key,
  Car,
  Vault,
  Code,
  Globe,
  ChevronRight,
  Home,
  Bot,
  X,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import {
  PORTFOLIO_PROJECTS,
  STATUS_CONFIG,
  FOCUS_AREA_CONFIG,
  getRelatedProjects,
  type PortfolioProject as _PortfolioProject,
  type FocusAreaId,
} from "@/constants/portfolioData";
import styles from "./ProjectDetail.module.css";

// Icon mapping for projects - includes all projects
const projectIcons: Record<string, React.ReactNode> = {
  mystira: <BookOpen size={48} />,
  phoenixrooivalk: <Shield size={48} />,
  cognitivemesh: <Network size={48} />,
  airkey: <Key size={48} />,
  hop: <Car size={48} />,
  chaufher: <Users size={48} />,
  veritasvault: <Vault size={48} />,
  autopr: <Bot size={48} />,
  "phoenixvc-website": <Globe size={48} />,
  "design-system": <Code size={48} />,
};

// Focus area icons (non-serializable, kept local)
const focusAreaIcons: Record<FocusAreaId, React.ReactNode> = {
  "ai-ml": <Zap size={20} />,
  "fintech-blockchain": <Vault size={20} />,
  "defense-security": <Shield size={20} />,
  "mobility-transportation": <Car size={20} />,
  infrastructure: <Code size={20} />,
};

const animations = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
  },
};

export const ProjectDetail = (): React.ReactElement => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === "dark";

  // Find the project by ID
  const project = PORTFOLIO_PROJECTS.find(
    (p) =>
      p.id === projectId ||
      p.name.toLowerCase().replace(/\s+/g, "-") === projectId,
  );

  // Get related projects using the helper function (auto-generates from same focus area)
  const relatedProjects = project ? getRelatedProjects(project.id, 3) : [];

  if (!project) {
    return (
      <section
        className={`${styles.projectDetail} ${isDarkMode ? styles.dark : styles.light}`}
      >
        <div className={styles.container}>
          <div className={styles.notFound}>
            <h1>Project Not Found</h1>
            <p>The project you're looking for doesn't exist.</p>
            <Link to="/portfolio" className={styles.backButton}>
              <ArrowLeft size={20} />
              Back to Portfolio
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
  const focusAreaConfig = FOCUS_AREA_CONFIG[project.focusArea];
  const focusAreaIcon = focusAreaIcons[project.focusArea];
  const icon = projectIcons[project.id] || <Layers size={48} />;
  const skills = Array.isArray(project.skills) ? project.skills : [];

  return (
    <>
      <SEO
        title={`${project.fullName || project.name}`}
        description={project.bio || project.title}
        keywords={skills.join(", ")}
        ogImage={project.image || undefined}
        ogType="article"
        canonicalUrl={`https://phoenixvc.tech/portfolio/${project.id}`}
      />
      <section
        className={`${styles.projectDetail} ${isDarkMode ? styles.dark : styles.light}`}
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
            {/* Breadcrumb Navigation */}
            <motion.div
              className={styles.breadcrumb}
              variants={animations.item}
            >
              <Link to="/" className={styles.breadcrumbLink}>
                <Home size={16} />
                Home
              </Link>
              <ChevronRight size={16} className={styles.breadcrumbSeparator} />
              <Link to="/portfolio" className={styles.breadcrumbLink}>
                Portfolio
              </Link>
              <ChevronRight size={16} className={styles.breadcrumbSeparator} />
              <span className={styles.breadcrumbCurrent}>{project.name}</span>
            </motion.div>

            {/* Back Button */}
            <motion.div variants={animations.item}>
              <button
                onClick={() => void navigate(-1)}
                className={styles.backButton}
              >
                <ArrowLeft size={20} />
                Back
              </button>
            </motion.div>

            {/* Hero Section */}
            <motion.div className={styles.hero} variants={animations.item}>
              <div className={styles.heroContent}>
                <div
                  className={styles.heroIcon}
                  style={{ backgroundColor: project.color || "#9333ea" }}
                >
                  {project.image ? (
                    <img
                      src={project.image}
                      alt={project.name}
                      className={styles.heroImage}
                    />
                  ) : (
                    icon
                  )}
                </div>
                <div className={styles.heroText}>
                  <div className={styles.heroMeta}>
                    <span
                      className={styles.statusBadge}
                      style={{ backgroundColor: status.bg, color: status.text }}
                    >
                      {status.label}
                    </span>
                    {focusAreaConfig && (
                      <span
                        className={styles.focusAreaBadge}
                        style={{
                          borderColor: focusAreaConfig.color,
                          color: focusAreaConfig.color,
                        }}
                      >
                        {focusAreaIcon}
                        {focusAreaConfig.label}
                      </span>
                    )}
                  </div>
                  <h1 className={styles.projectName}>
                    {project.fullName || project.name}
                  </h1>
                  <p className={styles.projectTagline}>{project.position}</p>
                </div>
              </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className={styles.mainGrid}>
              {/* Left Column - Description */}
              <motion.div
                className={styles.descriptionSection}
                variants={animations.item}
              >
                <h2 className={styles.sectionTitle}>
                  <Target size={24} />
                  About
                </h2>
                <p className={styles.description}>{project.bio}</p>

                {/* Technologies */}
                {skills.length > 0 && (
                  <div className={styles.technologiesSection}>
                    <h3 className={styles.subTitle}>Technologies & Skills</h3>
                    <div className={styles.skillTags}>
                      {skills.map((skill, index) => (
                        <span key={index} className={styles.skillTag}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Features/Highlights */}
                {project.projects && project.projects.length > 0 && (
                  <div className={styles.highlightsSection}>
                    <h3 className={styles.subTitle}>Key Features</h3>
                    <ul className={styles.featuresList}>
                      {project.projects.map((feature, index) => (
                        <li key={index} className={styles.featureItem}>
                          <Zap size={16} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>

              {/* Right Column - Sidebar */}
              <motion.div className={styles.sidebar} variants={animations.item}>
                {/* Actions Card */}
                <div className={styles.actionsCard}>
                  <h3 className={styles.cardTitle}>Links</h3>
                  <div className={styles.actionButtons}>
                    {project.product &&
                      project.product.trim() !== "" &&
                      !project.product.includes("github") && (
                        <a
                          href={project.product}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.primaryAction}
                        >
                          <ExternalLink size={20} />
                          Visit Website
                        </a>
                      )}
                    {project.product &&
                      project.product.trim() !== "" &&
                      project.product.includes("github") && (
                        <a
                          href={project.product}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.secondaryAction}
                        >
                          <Github size={20} />
                          View on GitHub
                        </a>
                      )}
                    {(!project.product || project.product.trim() === "") && (
                      <div className={styles.comingSoon}>
                        <Calendar size={20} />
                        Coming Soon
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Card */}
                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Project Info</h3>
                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Status</span>
                      <span
                        className={styles.infoValue}
                        style={{ color: status.text }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        Stage Description
                      </span>
                      <span className={styles.infoValueSmall}>
                        {status.description}
                      </span>
                    </div>
                    {project.department && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Sector</span>
                        <span className={styles.infoValue}>
                          {project.department}
                        </span>
                      </div>
                    )}
                    {focusAreaConfig && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Focus Area</span>
                        <span
                          className={styles.infoValue}
                          style={{ color: focusAreaConfig.color }}
                        >
                          {focusAreaConfig.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Related Projects */}
            {relatedProjects && relatedProjects.length > 0 && (
              <motion.div
                className={styles.relatedSection}
                variants={animations.item}
              >
                <h2 className={styles.sectionTitle}>
                  <Layers size={24} />
                  Related Projects
                </h2>
                <div className={styles.relatedGrid}>
                  {relatedProjects.map((related) => {
                    const relatedStatus =
                      STATUS_CONFIG[related.status] || STATUS_CONFIG.active;
                    const relatedIcon = projectIcons[related.id] || (
                      <Layers size={24} />
                    );
                    return (
                      <Link
                        key={related.id}
                        to={`/portfolio/${related.id}`}
                        className={styles.relatedCard}
                      >
                        <div
                          className={styles.relatedIcon}
                          style={{
                            backgroundColor: related.color || "#9333ea",
                          }}
                        >
                          {related.image ? (
                            <img src={related.image} alt={related.name} />
                          ) : (
                            relatedIcon
                          )}
                        </div>
                        <div className={styles.relatedInfo}>
                          <h4>{related.fullName || related.name}</h4>
                          <p>{related.position}</p>
                          <span
                            className={styles.relatedStatus}
                            style={{ color: relatedStatus.text }}
                          >
                            {relatedStatus.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* CTA Section */}
            <motion.div
              className={styles.ctaSection}
              variants={animations.item}
            >
              <h3>Interested in this project?</h3>
              <p>
                Get in touch to learn more about our investment and
                collaboration opportunities.
              </p>
              <button
                type="button"
                className={styles.ctaButton}
                onClick={() => {
                  void navigate("/");
                  // Use setTimeout to ensure navigation completes before scrolling
                  setTimeout(() => {
                    const contactSection = document.getElementById("contact");
                    if (contactSection) {
                      contactSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }, 100);
                }}
              >
                Contact Us
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default ProjectDetail;
