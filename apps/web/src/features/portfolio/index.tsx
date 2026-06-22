// /features/portfolio/index.tsx
import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/theme";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Github,
  Cpu,
  Network,
  BookOpen,
  Shield,
  FileText,
  Key,
  Car,
  Users,
  Vault,
  Eye,
  EyeOff,
  ArrowRight,
  Bot,
  Filter,
  X,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import styles from "./Portfolio.module.css";

interface Project {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  website?: string;
  github?: string;
  docs?: string;
  status:
    | "live"
    | "development"
    | "beta"
    | "alpha"
    | "pre-alpha"
    | "seed"
    | "early-stage"
    | "growth";
  tags: string[];
  focusArea:
    | "ai-ml"
    | "fintech-blockchain"
    | "defense-security"
    | "mobility-transportation"
    | "infrastructure";
}

const projects: Project[] = [
  {
    id: "mystira",
    name: "Mystira",
    description:
      "Interactive storytelling adventures for children and families",
    longDescription:
      "Mystira brings the wonder of storytelling to life for children, parents, and group leaders alike. It transforms shared playtime into immersive, interactive adventures filled with imagination, cooperation, and creativity. Each Mystira story is grounded in child development research, fostering emotional growth, problem-solving skills, and meaningful connections.",
    icon: <BookOpen size={32} />,
    website: "https://mystira.app",
    status: "alpha",
    tags: ["Storytelling", "Children", "Interactive", "Education"],
    focusArea: "ai-ml",
  },
  {
    id: "autopr",
    name: "CodeFlow AI",
    description: "AI-powered GitHub PR automation and issue management",
    longDescription:
      "CodeFlow AI is a comprehensive AI-powered automation platform that transforms GitHub pull request workflows through intelligent analysis, issue creation, and multi-agent collaboration. Features CodeRabbit, GitHub Copilot integration, platform detection for 25+ development platforms, and supports Linear, Slack, and other integrations.",
    icon: <Bot size={32} />,
    website: "https://autopr.io",
    github: "https://github.com/JustAGhosT/autopr-engine",
    status: "pre-alpha",
    tags: ["AI", "Automation", "GitHub", "DevOps", "Python"],
    focusArea: "ai-ml",
  },
  {
    id: "nexamesh",
    name: "Nexamesh",
    description: "AI-powered counter-UAS defense platform",
    longDescription:
      "Nexamesh (formerly Phoenix Rooivalk) is a sophisticated counter-UAS defense platform that leverages advanced AI and machine learning for real-time drone detection, classification, and neutralization, providing comprehensive airspace protection with automated threat assessment and response capabilities.",
    icon: <Shield size={32} />,
    github: "https://github.com/Nexamesh/nexamesh-core",
    status: "pre-alpha",
    tags: ["Counter-UAS", "AI", "Defense", "Security"],
    focusArea: "defense-security",
  },
  {
    id: "cognitivemesh",
    name: "Cognitive Mesh",
    description: "Enterprise-grade AI transformation framework",
    longDescription:
      "Cognitive Mesh is an enterprise-grade AI transformation framework designed to orchestrate multi-agent cognitive systems with institutional-grade security and compliance controls. It features a five-layer hexagonal architecture enabling organizations to build, deploy, and manage advanced AI capabilities with comprehensive governance, NIST AI Risk Management Framework compliance, and Zero-Trust security architecture.",
    icon: <Network size={32} />,
    github: "https://github.com/justaghost/cognitive-mesh",
    status: "pre-alpha",
    tags: [
      "Multi-Agent",
      "Enterprise",
      "Security",
      "Governance",
      "Azure",
      ".NET",
    ],
    focusArea: "ai-ml",
  },
  {
    id: "airkey",
    name: "Airkey",
    description: "Digital access management solutions",
    longDescription:
      "Airkey Ltd provides innovative digital access management solutions that enable secure, keyless entry systems for various real-world assets. Using advanced cryptography and mobile technology, Airkey transforms how organizations manage physical access control.",
    icon: <Key size={32} />,
    status: "seed",
    tags: ["Access Control", "Security", "IoT", "Mobile"],
    focusArea: "defense-security",
  },
  {
    id: "hop",
    name: "Hop",
    description: "Innovative connectivity technology",
    longDescription:
      "Hop (Pty) Ltd is revolutionizing urban mobility with innovative connectivity solutions. Their cutting edge platform and hardware connects commuters with high-speed internet.",
    icon: <Car size={32} />,
    status: "seed",
    tags: ["Connectivity", "Mobility", "Hardware", "Internet"],
    focusArea: "mobility-transportation",
  },
  {
    id: "chaufher",
    name: "Chaufher",
    description: "Women-focused ridehail service",
    longDescription:
      "Chaufher (Pty) Ltd is a women-focused ridehail service designed to provide safe, reliable rides for women, by women. The platform prioritizes passenger safety with vetted drivers and specialized features tailored to women's transportation needs.",
    icon: <Users size={32} />,
    status: "seed",
    tags: ["Transportation", "Safety", "Women-Focused", "Ride-Sharing"],
    focusArea: "mobility-transportation",
  },
  {
    id: "veritasvault",
    name: "VeritasVault",
    description: "DeFi staking and treasury-backed rewards platform",
    longDescription:
      "VeritasVault is a decentralized finance platform offering transparent, treasury-backed staking rewards with auto-compounding yields. The platform enables users to earn real yield through depositing, staking, and voting mechanisms with no lock-ups and instant withdrawals.",
    icon: <Vault size={32} />,
    website: "https://veritasvault.net",
    github: "https://github.com/justAGhosT/vv",
    status: "pre-alpha",
    tags: ["DeFi", "Blockchain", "Staking", "Crypto", "Web3"],
    focusArea: "fintech-blockchain",
  },
];

const statusColors: Record<
  Project["status"],
  { bg: string; text: string; label: string }
> = {
  live: { bg: "rgba(76, 175, 80, 0.2)", text: "#4caf50", label: "Live" },
  beta: { bg: "rgba(255, 152, 0, 0.2)", text: "#ff9800", label: "Beta" },
  alpha: {
    bg: "rgba(156, 39, 176, 0.2)",
    text: "#9c27b0",
    label: "Alpha / Pre-Seed",
  },
  "pre-alpha": {
    bg: "rgba(121, 85, 72, 0.2)",
    text: "#795548",
    label: "Angel / Pre-Seed",
  },
  seed: { bg: "rgba(46, 204, 113, 0.2)", text: "#27ae60", label: "Seed" },
  "early-stage": {
    bg: "rgba(230, 126, 34, 0.2)",
    text: "#e67e22",
    label: "Early Stage",
  },
  growth: {
    bg: "rgba(231, 76, 60, 0.2)",
    text: "#e74c3c",
    label: "Growth Stage",
  },
  development: {
    bg: "rgba(33, 150, 243, 0.2)",
    text: "#2196f3",
    label: "In Development",
  },
};

const focusAreaConfig: Record<
  Project["focusArea"],
  { label: string; color: string }
> = {
  "ai-ml": { label: "AI & ML", color: "#3498db" },
  "fintech-blockchain": { label: "Fintech", color: "#f39c12" },
  "defense-security": { label: "Defense", color: "#e74c3c" },
  "mobility-transportation": { label: "Mobility", color: "#2ecc71" },
  infrastructure: { label: "Infrastructure", color: "#6b7280" },
};

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
  const [selectedStatus, setSelectedStatus] = useState<
    Project["status"] | "all"
  >("all");
  const [selectedFocusArea, setSelectedFocusArea] = useState<
    Project["focusArea"] | "all"
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
                          backgroundColor: `${focusAreaConfig[area].color}20`,
                          borderColor: focusAreaConfig[area].color,
                          color: focusAreaConfig[area].color,
                        }),
                      }}
                    >
                      <span
                        className={styles.pillDot}
                        style={{ backgroundColor: focusAreaConfig[area].color }}
                      />
                      {focusAreaConfig[area].label}
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
                          backgroundColor: statusColors[status].bg,
                          borderColor: statusColors[status].text,
                          color: statusColors[status].text,
                        }),
                      }}
                    >
                      {statusColors[status].label}
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
                      <div className={styles.projectIcon}>{project.icon}</div>
                      <div
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: statusColors[project.status].bg,
                          color: statusColors[project.status].text,
                        }}
                      >
                        {statusColors[project.status].label}
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
