// features/about-page/index.tsx
import { FC, memo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/theme";
import {
  ArrowRight,
  Award,
  Globe,
  Shield,
  Zap,
  Target,
  Users,
  Leaf,
  Linkedin,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import styles from "./AboutPage.module.css";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image?: string;
  linkedin?: string;
  expertise: string[];
}

const teamMembers: TeamMember[] = [
  {
    name: "Eben Maré",
    role: "CEO",
    bio: "Eben is a quantitative finance and technology leader with over 15 years of experience in trading, investment banking, and venture building. As CEO, he combines deep analytical skills with strategic leadership to guide Phoenix VC's growth.",
    image: "/523257836-0f0a4942-5834-442f-9cf2-410b0f7c7b15.png",
    linkedin: "https://www.linkedin.com/in/ebenmare/",
    expertise: [
      "Business Strategy",
      "Finance",
      "Technology",
      "Venture Capital",
    ],
  },
  {
    name: "Jurie Smit",
    role: "Software Architect",
    bio: "Jurie is a software architect with 18 years of experience building scalable and maintainable systems. He enjoys working with the latest technologies and mentoring developers to build exceptional products.",
    image: "/themes/Jor.png",
    linkedin: "https://www.linkedin.com/in/juriesmit/",
    expertise: ["System Design", "Cloud Architecture", "DevOps", "Mentoring"],
  },
];

const aboutAnimations = {
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
        ease: "easeOut" as const,
      },
    },
  },
  valueCard: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  },
};

const coreValues = [
  {
    icon: <Shield size={28} />,
    title: "Integrity",
    description:
      "We uphold the highest ethical standards in all our dealings and decisions.",
  },
  {
    icon: <Globe size={28} />,
    title: "Collaboration",
    description:
      "We believe in the power of partnership and collective intelligence.",
  },
  {
    icon: <Zap size={28} />,
    title: "Visionary Thinking",
    description:
      "We look beyond the horizon to identify tomorrow's opportunities.",
  },
  {
    icon: <Award size={28} />,
    title: "Sustainability",
    description:
      "We invest with purpose, considering long-term impact beyond financial returns.",
  },
];

const AboutPage: FC = memo(() => {
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === "dark";

  return (
    <>
      <SEO
        title="About Us"
        description="Learn about Phoenix VC, our mission, values, and the team behind our venture capital investments in transformative technology."
        keywords="about phoenix vc, venture capital team, investment philosophy, technology investors"
      />
      <section
        className={`${styles.section} ${isDarkMode ? styles.darkMode : styles.lightMode}`}
      >
        <div className={styles.container}>
          <motion.div
            className={styles.content}
            initial="hidden"
            animate="visible"
            variants={aboutAnimations.container}
          >
            {/* Header */}
            <motion.div
              className={styles.header}
              variants={aboutAnimations.item}
            >
              <h1 className={styles.title}>About Us</h1>
              <div className={styles.divider} />
              <p className={styles.subtitle}>
                Empowering visionaries to build the future
              </p>
            </motion.div>

            {/* Mission Section */}
            <motion.div
              className={styles.missionSection}
              variants={aboutAnimations.item}
            >
              <div className={styles.missionIcon}>
                <Target size={48} />
              </div>
              <h2 className={styles.sectionTitle}>Our Mission</h2>
              <p className={styles.missionText}>
                At Phoenix VC, our mission is to empower innovation, fuel
                growth, and shape the future through strategic investments and
                partnerships. We are committed to identifying and nurturing
                exceptional entrepreneurs, startups, and businesses that have
                the potential to revolutionize industries and create lasting
                positive impact.
              </p>
            </motion.div>

            {/* Core Values Section */}
            <motion.div
              className={styles.valuesSection}
              variants={aboutAnimations.item}
            >
              <div className={styles.valuesSectionHeader}>
                <Users size={36} />
                <h2 className={styles.sectionTitle}>Our Core Values</h2>
              </div>
              <p className={styles.valuesIntro}>
                Our core values of integrity, collaboration, and visionary
                thinking drive our investment decisions and guide our
                interactions with founders, investors, and stakeholders.
              </p>
              <div className={styles.valuesGrid}>
                {coreValues.map((value, index) => (
                  <motion.div
                    key={index}
                    className={styles.valueCard}
                    variants={aboutAnimations.valueCard}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <div className={styles.valueIconContainer}>
                      {value.icon}
                    </div>
                    <h3 className={styles.valueTitle}>{value.title}</h3>
                    <p className={styles.valueDescription}>
                      {value.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Approach Section */}
            <motion.div
              className={styles.approachSection}
              variants={aboutAnimations.item}
            >
              <h2 className={styles.sectionTitle}>Our Approach</h2>
              <p className={styles.approachText}>
                Through diligent research, rigorous due diligence, and a
                forward-thinking approach, we strive to identify transformative
                opportunities in the technology sector.
              </p>
            </motion.div>

            {/* ESG Section */}
            <motion.div
              className={styles.esgSection}
              variants={aboutAnimations.item}
            >
              <div className={styles.esgIcon}>
                <Leaf size={48} />
              </div>
              <h2 className={styles.sectionTitle}>Responsible Investing</h2>
              <p className={styles.esgText}>
                Furthermore, we are committed to responsible investing practices
                that align with environmental, social, and governance (ESG)
                principles. By integrating sustainability considerations into
                our investment strategies, we strive to create a positive ripple
                effect that goes beyond financial gains and contributes to a
                more equitable and sustainable future.
              </p>
            </motion.div>

            {/* Team Section */}
            <motion.div
              className={styles.teamSection}
              variants={aboutAnimations.item}
            >
              <div className={styles.teamHeader}>
                <Users size={36} />
                <h2 className={styles.sectionTitle}>Our Team</h2>
              </div>
              <p className={styles.teamIntro}>
                Meet the people driving innovation and shaping the future at
                Phoenix VC.
              </p>
              <div className={styles.teamGrid}>
                {teamMembers.map((member, index) => (
                  <motion.div
                    key={index}
                    className={styles.teamCard}
                    variants={aboutAnimations.valueCard}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    {member.image && (
                      <div className={styles.teamImageContainer}>
                        <img
                          src={member.image}
                          alt={member.name}
                          className={styles.teamImage}
                          width={120}
                          height={120}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className={styles.teamName}>{member.name}</h3>
                    <p className={styles.teamRole}>{member.role}</p>
                    <p className={styles.teamBio}>{member.bio}</p>
                    <div className={styles.expertiseTags}>
                      {member.expertise.map((skill, skillIndex) => (
                        <span key={skillIndex} className={styles.expertiseTag}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkedinLink}
                      >
                        <Linkedin size={20} />
                        Connect on LinkedIn
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Vision Section */}
            <motion.div
              className={styles.visionSection}
              variants={aboutAnimations.item}
            >
              <h2 className={styles.sectionTitle}>Our Vision</h2>
              <p className={styles.visionText}>
                Phoenix VC is driven by a passion for unlocking untapped
                potential, driving disruptive change, and fostering a culture of
                entrepreneurship. We aim to be a trusted partner for founders
                and investors, a catalyst for innovation, and a driving force
                behind the success stories of tomorrow. Together, we will soar
                to new heights, igniting possibilities and shaping a brighter
                future for generations to come.
              </p>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              className={styles.ctaSection}
              variants={aboutAnimations.item}
            >
              <p className={styles.ctaText}>
                Ready to partner with us on your journey?
              </p>
              <motion.a
                href="/#contact"
                className={styles.ctaButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Get in Touch <ArrowRight size={18} className={styles.ctaIcon} />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
});

AboutPage.displayName = "AboutPage";
export { AboutPage };
export default AboutPage;
