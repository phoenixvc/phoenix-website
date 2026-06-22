// src/constants/portfolioData.ts
// Single source of truth for all portfolio-related data

// ==================== Types ====================

export type ProjectStatus =
  | "alpha"
  | "pre-alpha"
  | "seed"
  | "early-stage"
  | "growth"
  | "active";
export type FocusAreaId =
  | "ai-ml"
  | "fintech-blockchain"
  | "defense-security"
  | "mobility-transportation"
  | "infrastructure";

export interface StatusConfig {
  bg: string;
  text: string;
  label: string;
  description: string;
}

export interface FocusAreaConfig {
  id: FocusAreaId;
  label: string;
  color: string;
  description: string;
}

export interface PortfolioProject {
  id: string;
  name: string;
  fullName?: string;
  initials: string;
  color: string;
  position?: string;
  department?: string;
  mass?: number;
  speed?: number;
  image?: string;
  skills?: string[] | string;
  relatedIds?: string[];
  experience?: number;
  expertise?: string;
  projects?: string[];
  bio?: string;
  /** Short subtitle shown on the /portfolio listing card (falls back to position). */
  tagline?: string;
  /** Whether the project appears on the public /portfolio listing. Defaults to true. */
  listed?: boolean;
  title: string;
  status: ProjectStatus;
  relatedProjects: string[];
  product: string;
  focusArea: FocusAreaId;
}

// ==================== Status Configuration ====================

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  alpha: {
    bg: "rgba(156, 39, 176, 0.2)",
    text: "#9c27b0",
    label: "Alpha / Pre-Seed",
    description: "Active development with early users",
  },
  "pre-alpha": {
    bg: "rgba(121, 85, 72, 0.2)",
    text: "#795548",
    label: "Angel / Pre-Seed",
    description: "Early development and concept validation",
  },
  seed: {
    bg: "rgba(46, 204, 113, 0.2)",
    text: "#27ae60",
    label: "Seed",
    description: "Seed funding stage",
  },
  "early-stage": {
    bg: "rgba(230, 126, 34, 0.2)",
    text: "#e67e22",
    label: "Early Stage",
    description: "Initial investment and product development",
  },
  growth: {
    bg: "rgba(231, 76, 60, 0.2)",
    text: "#e74c3c",
    label: "Growth Stage",
    description: "Scaling operations and market expansion",
  },
  active: {
    bg: "rgba(76, 175, 80, 0.2)",
    text: "#4caf50",
    label: "Active",
    description: "Operational and maintained",
  },
};

// ==================== Focus Area Configuration ====================

export const FOCUS_AREA_CONFIG: Record<FocusAreaId, FocusAreaConfig> = {
  "ai-ml": {
    id: "ai-ml",
    label: "AI & Machine Learning",
    color: "#3498db",
    description: "Artificial intelligence and machine learning innovations",
  },
  "fintech-blockchain": {
    id: "fintech-blockchain",
    label: "Fintech & Blockchain",
    color: "#f39c12",
    description: "Financial technology and blockchain solutions",
  },
  "defense-security": {
    id: "defense-security",
    label: "Defense & Security",
    color: "#e74c3c",
    description: "Defense technology and security solutions",
  },
  "mobility-transportation": {
    id: "mobility-transportation",
    label: "Mobility & Transportation",
    color: "#2ecc71",
    description: "Transportation and mobility innovations",
  },
  infrastructure: {
    id: "infrastructure",
    label: "Infrastructure",
    color: "#6b7280",
    description: "Supporting infrastructure and internal tools",
  },
};

// ==================== Portfolio Projects ====================

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  // AI & Machine Learning Focus Area
  {
    id: "mystira",
    name: "Mystira",
    initials: "MY",
    position: "Interactive Storytelling",
    mass: 500,
    color: "#9b59b6", // Purple variant - AI & ML focus area (slightly different from pure blue)
    image: "/logos/mystira.svg",
    tagline: "Interactive storytelling adventures for children and families",
    fullName: "Mystira",
    speed: 0.000025,
    title: "Interactive Storytelling Platform (Alpha)",
    status: "alpha",
    bio: "Mystira brings the wonder of storytelling to life for children, parents, and group leaders alike. Each story is grounded in child development research, fostering emotional growth and meaningful connections.",
    department: "Education",
    experience: 0,
    expertise: "Storytelling, Child Development, Education",
    projects: ["Interactive Adventures", "Family Playtime", "Group Sessions"],
    skills: ["Storytelling", "Children", "Interactive", "Education"],
    relatedProjects: ["nexamesh", "cognitivemesh"],
    product: "https://mystira.app",
    focusArea: "ai-ml",
  },
  {
    id: "cognitivemesh",
    name: "Cognitive Mesh",
    initials: "CM",
    position: "AI Framework",
    mass: 150,
    color: "#3498db", // Blue - AI & ML focus area
    image: "/logos/cognitivemesh.svg",
    tagline: "Enterprise-grade AI transformation framework",
    fullName: "Cognitive Mesh",
    speed: 0.000022,
    title: "Enterprise AI Transformation Framework (Pre-Alpha)",
    status: "pre-alpha",
    bio: "Cognitive Mesh is an enterprise-grade AI transformation framework designed to orchestrate multi-agent cognitive systems with institutional-grade security and NIST compliance controls.",
    department: "Enterprise",
    experience: 0,
    expertise: "Multi-Agent AI, Enterprise Security, Governance",
    projects: [
      "AI Orchestration",
      "Security Compliance",
      "Zero-Trust Architecture",
    ],
    skills: ["Multi-Agent", "Enterprise", "Security", "Governance"],
    relatedProjects: ["mystira", "nexamesh"],
    product: "https://github.com/JustAGhosT/cognitive-mesh",
    focusArea: "ai-ml",
  },

  // Defense & Security Focus Area
  {
    id: "nexamesh",
    name: "Nexamesh",
    initials: "NX",
    position: "Counter-UAS Platform",
    mass: 200,
    color: "#c0392b", // Darker red variant - Defense & Security focus area
    image: "/logos/nexamesh.svg",
    tagline: "AI-powered counter-UAS defense platform",
    fullName: "Nexamesh",
    speed: 0.00002,
    title: "AI-Powered Counter-UAS Defense Platform (Pre-Alpha)",
    status: "pre-alpha",
    bio: "Nexamesh (formerly Phoenix Rooivalk) is a sophisticated counter-UAS defense platform leveraging advanced AI for real-time drone detection, classification, and neutralization.",
    department: "Defense",
    experience: 0,
    expertise: "AI, Machine Learning, Defense Systems",
    projects: ["Drone Detection", "Threat Assessment", "Airspace Protection"],
    skills: ["Counter-UAS", "AI", "Defense", "Security"],
    relatedProjects: ["mystira", "cognitivemesh"],
    product: "https://github.com/Nexamesh/nexamesh-core",
    focusArea: "defense-security",
  },
  {
    id: "airkey",
    name: "Airkey",
    initials: "AK",
    position: "Access Management",
    mass: 150,
    color: "#e74c3c", // Red - Defense & Security focus area
    image: "/logos/airkey.svg",
    tagline: "Digital access management solutions",
    fullName: "Airkey Ltd",
    speed: 0.000019,
    title: "Digital Access Management (Seed)",
    status: "seed",
    bio: "Airkey Ltd provides innovative digital access management solutions that enable secure, keyless entry systems for various real-world assets. Using advanced cryptography and mobile technology, Airkey transforms how organizations manage physical access control.",
    department: "Security",
    experience: 0,
    expertise: "Access Control, IoT, Mobile Security",
    projects: ["Keyless Entry", "Smart Access"],
    skills: ["Access Control", "Security", "IoT", "Mobile"],
    relatedProjects: ["nexamesh", "hop", "chaufher"],
    product: "",
    focusArea: "defense-security",
  },

  // Fintech & Blockchain Focus Area
  {
    id: "veritasvault",
    name: "VeritasVault",
    initials: "VV",
    position: "DeFi Platform",
    mass: 80,
    color: "#f39c12", // Orange - Fintech & Blockchain focus area
    image: "/logos/veritasvault.svg",
    tagline: "DeFi staking and treasury-backed rewards platform",
    fullName: "VeritasVault",
    speed: 0.00002,
    title: "DeFi Staking Platform (Pre-Alpha)",
    status: "pre-alpha",
    bio: "VeritasVault is a decentralized finance platform offering transparent, treasury-backed staking rewards with auto-compounding yields.",
    department: "Blockchain",
    experience: 0,
    expertise: "DeFi, Staking, Smart Contracts",
    projects: ["Staking Rewards", "Treasury Management"],
    skills: ["DeFi", "Blockchain", "Staking", "Crypto", "Web3"],
    relatedProjects: ["cognitivemesh", "airkey"],
    product: "https://veritasvault.net",
    focusArea: "fintech-blockchain",
  },

  // Mobility & Transportation Focus Area
  {
    id: "hop",
    name: "Hop",
    initials: "HP",
    position: "Connectivity Tech",
    mass: 150,
    color: "#27ae60", // Darker green variant - Mobility & Transportation focus area
    image: "/logos/hop.svg",
    tagline: "Innovative connectivity technology",
    fullName: "Hop Pty Ltd",
    speed: 0.000017,
    title: "Innovative Connectivity Technology (Seed)",
    status: "seed",
    bio: "Hop (Pty) Ltd is revolutionizing urban mobility with innovative connectivity solutions. Their cutting edge platform and hardware connects commuters with high-speed internet.",
    department: "Mobility",
    experience: 0,
    expertise: "Connectivity, Urban Mobility, Hardware",
    projects: ["Smart Mobility", "Connectivity Platform"],
    skills: ["Connectivity", "Mobility", "Hardware", "Internet"],
    relatedProjects: ["airkey", "chaufher"],
    product: "",
    focusArea: "mobility-transportation",
  },
  {
    id: "chaufher",
    name: "Chaufher",
    initials: "CH",
    position: "Women's Ridehail",
    mass: 180,
    color: "#2ecc71", // Green - Mobility & Transportation focus area
    image: "/logos/chaufher.svg",
    tagline: "Women-focused ridehail service",
    fullName: "Chaufher Pty Ltd",
    speed: 0.000016,
    title: "Women-Focused Ridehail Service (Seed)",
    status: "seed",
    bio: "Chaufher (Pty) Ltd is a women-focused ridehail service designed to provide safe, reliable rides for women, by women. The platform prioritizes passenger safety with vetted drivers and specialized features tailored to women's transportation needs.",
    department: "Mobility",
    experience: 0,
    expertise: "Transportation, Safety, Ride-Sharing",
    projects: ["Safe Rides", "Women's Transport"],
    skills: ["Transportation", "Safety", "Women-Focused", "Ride-Sharing"],
    relatedProjects: ["airkey", "hop"],
    product: "",
    focusArea: "mobility-transportation",
  },

  // AI & Machine Learning Focus Area - CodeFlow AI
  {
    id: "autopr",
    name: "CodeFlow AI",
    initials: "CF",
    position: "PR Automation",
    mass: 180,
    color: "#5dade2", // Lighter blue variant - AI & ML focus area
    image: "/logos/autopr.svg",
    tagline: "AI-powered GitHub PR automation and issue management",
    fullName: "CodeFlow AI",
    speed: 0.000021,
    title: "AI-Powered PR Automation Platform (Pre-Alpha)",
    status: "pre-alpha",
    bio: "CodeFlow AI is a comprehensive AI-powered automation platform that transforms GitHub pull request workflows through intelligent analysis, issue creation, and multi-agent collaboration. Features CodeRabbit, GitHub Copilot integration, and 25+ platform detection.",
    department: "Developer Tools",
    experience: 0,
    expertise: "AI, Automation, GitHub, DevOps",
    projects: ["PR Analysis", "Issue Management", "Multi-Agent Collaboration"],
    skills: ["AI", "Automation", "GitHub", "DevOps", "Python"],
    relatedProjects: ["cognitivemesh", "mystira", "sluice"],
    product: "https://github.com/phoenixvc/codeflow-engine",
    focusArea: "ai-ml",
  },
  {
    id: "sluice",
    name: "Sluice",
    initials: "SL",
    position: "AI Gateway",
    mass: 120,
    color: "#2980b9", // Darker blue variant - AI & ML focus area
    image: "/logos/sluice.svg",
    tagline: "OpenAI-compatible AI gateway",
    fullName: "Sluice",
    speed: 0.00002,
    title: "OpenAI-Compatible AI Gateway (Pre-Alpha)",
    status: "pre-alpha",
    bio: "Sluice is an OpenAI-compatible AI gateway running on Azure Container Apps. Built on LiteLLM, it gives teams a single endpoint with model routing, provider abstraction, and cost controls across multiple LLM backends.",
    department: "Developer Tools",
    experience: 0,
    expertise: "AI Infrastructure, LLM Routing, Azure",
    projects: ["Model Routing", "Cost Controls", "Provider Abstraction"],
    skills: ["AI", "Gateway", "LiteLLM", "Azure", "Infrastructure"],
    relatedProjects: ["docket", "autopr", "cognitivemesh"],
    product: "https://github.com/phoenixvc/sluice",
    focusArea: "ai-ml",
  },
  {
    id: "docket",
    name: "Docket",
    initials: "DK",
    position: "LLM Cost Ops",
    mass: 110,
    color: "#5499c7", // Blue variant - AI & ML focus area
    image: "/logos/docket.svg",
    tagline: "LLM cost-operations platform",
    fullName: "Docket",
    speed: 0.000019,
    title: "LLM Cost Operations Platform (Pre-Alpha)",
    status: "pre-alpha",
    bio: "Docket is an AI cost-operations platform that tracks LLM spend, usage analytics, and cost optimisation across teams and providers, turning opaque token bills into actionable, per-project insight.",
    department: "Developer Tools",
    experience: 0,
    expertise: "AI Cost Ops, Analytics, FinOps",
    projects: ["Spend Tracking", "Usage Analytics", "Cost Optimisation"],
    skills: ["AI", "Cost Ops", "Analytics", "FinOps"],
    relatedProjects: ["sluice", "autopr", "cognitivemesh"],
    product: "",
    focusArea: "ai-ml",
  },
  {
    id: "convolens",
    name: "ConvoLens",
    initials: "CL",
    position: "Conversation AI",
    mass: 120,
    color: "#6c5ce7", // Purple-blue variant - AI & ML focus area
    image: "/logos/convolens.svg",
    tagline: "AI conversation analyzer",
    fullName: "ConvoLens",
    speed: 0.000018,
    title: "AI Conversation Analyzer (Pre-Alpha)",
    status: "pre-alpha",
    bio: "ConvoLens is an AI-powered conversation analyzer for WhatsApp. Upload a chat export to get summaries, sentiment, and insight into group and one-on-one conversations.",
    department: "AI Products",
    experience: 0,
    expertise: "NLP, Conversation Analytics, Summarization",
    projects: ["Chat Summaries", "Sentiment Analysis", "Conversation Insight"],
    skills: ["AI", "NLP", "Analytics", "Summarization"],
    relatedProjects: ["mystira", "cognitivemesh"],
    product: "https://v0-whatsapp-conversation-summarizer.vercel.app",
    focusArea: "ai-ml",
  },

  // Infrastructure (Supporting Projects)
  {
    id: "omnipost",
    name: "OmniPost",
    initials: "OP",
    position: "Content Distribution",
    mass: 100,
    color: "#6b7280",
    image: "/logos/omnipost.svg",
    tagline: "Multi-channel content distribution",
    fullName: "OmniPost",
    speed: 0.000017,
    title: "Multi-Channel Content Distribution (Pre-Alpha)",
    status: "pre-alpha",
    bio: "OmniPost is a multi-channel content distribution tool for publishing and syndicating content across social and web channels from a single source.",
    department: "Infrastructure",
    experience: 0,
    expertise: "Content Distribution, Syndication, Automation",
    projects: ["Multi-Channel Publishing", "Content Syndication"],
    skills: ["Content", "Distribution", "Automation"],
    relatedProjects: ["phoenixvc-website", "design-system"],
    product: "https://github.com/neuralliquid/omnipost",
    focusArea: "infrastructure",
  },
  {
    id: "phoenixvc-website",
    name: "PhoenixVC Website",
    initials: "PW",
    position: "Corporate Website",
    mass: 100,
    color: "#6b7280",
    image: "/logos/phoenixvc-website.svg",
    listed: false,
    fullName: "PhoenixVC Website",
    speed: 0.000015,
    title: "Corporate Website",
    status: "active",
    bio: "The official Phoenix VC corporate website built with modern web technologies.",
    department: "Infrastructure",
    experience: 0,
    expertise: "React, TypeScript, Azure",
    projects: ["Web Development"],
    skills: ["React", "TypeScript", "Azure"],
    relatedProjects: ["mystira", "design-system"],
    product: "https://phoenixvc.tech",
    focusArea: "infrastructure",
  },
  {
    id: "design-system",
    name: "Design System",
    initials: "DS",
    position: "Component Library",
    mass: 80,
    color: "#6b7280",
    image: "/logos/design-system.svg",
    listed: false,
    fullName: "Phoenix Design System",
    speed: 0.000018,
    title: "Component Library",
    status: "active",
    bio: "Shared design system and component library for Phoenix projects.",
    department: "Infrastructure",
    experience: 0,
    expertise: "React Components, Design Tokens",
    projects: ["UI Components"],
    skills: ["Design", "Components", "Tokens"],
    relatedProjects: ["phoenixvc-website"],
    product: "",
    focusArea: "infrastructure",
  },
];

// ==================== Helper Functions ====================

/**
 * Get a project by ID
 */
export function getProjectById(id: string): PortfolioProject | undefined {
  return PORTFOLIO_PROJECTS.find((p) => p.id === id);
}

/**
 * Get projects by focus area
 */
export function getProjectsByFocusArea(
  focusArea: FocusAreaId,
): PortfolioProject[] {
  return PORTFOLIO_PROJECTS.filter((p) => p.focusArea === focusArea);
}

/**
 * Get projects by status
 */
export function getProjectsByStatus(status: ProjectStatus): PortfolioProject[] {
  return PORTFOLIO_PROJECTS.filter((p) => p.status === status);
}

/**
 * Get related projects for a given project
 * Combines manually specified relations with auto-generated ones from the same focus area
 */
export function getRelatedProjects(
  projectId: string,
  limit: number = 3,
): PortfolioProject[] {
  const project = getProjectById(projectId);
  if (!project) return [];

  // Start with manually specified related projects
  const relatedIds = new Set(project.relatedProjects);

  // Add projects from the same focus area
  const sameFocusArea = PORTFOLIO_PROJECTS.filter(
    (p) => p.focusArea === project.focusArea && p.id !== projectId,
  );
  sameFocusArea.forEach((p) => relatedIds.add(p.id));

  // Convert to project objects and limit
  return Array.from(relatedIds)
    .map((id) => getProjectById(id))
    .filter((p): p is PortfolioProject => p !== undefined && p.id !== projectId)
    .slice(0, limit);
}

/**
 * Get all focus areas that have projects
 */
export function getActiveFocusAreas(): FocusAreaConfig[] {
  const activeIds = new Set(PORTFOLIO_PROJECTS.map((p) => p.focusArea));
  return Object.values(FOCUS_AREA_CONFIG).filter((fa) => activeIds.has(fa.id));
}

/**
 * Get status config for a project
 */
export function getStatusConfig(status: ProjectStatus): StatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.active;
}

/**
 * Get focus area config by ID
 */
export function getFocusAreaConfig(focusAreaId: FocusAreaId): FocusAreaConfig {
  return FOCUS_AREA_CONFIG[focusAreaId] || FOCUS_AREA_CONFIG.infrastructure;
}

/**
 * Get color for a project based on its status
 */
export function getProjectStatusColor(project: PortfolioProject): string {
  return STATUS_CONFIG[project.status]?.text || project.color;
}

/**
 * Get color for a project based on its focus area
 */
export function getProjectFocusAreaColor(project: PortfolioProject): string {
  return FOCUS_AREA_CONFIG[project.focusArea]?.color || project.color;
}
