// features/about/components/About/About.tsx
import React, { FC, memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import styles from "./About.module.css";
import { useSectionObserver } from "@/hooks/useSectionObserver";
import { ArrowRight, Award, Globe, Shield, Zap } from "lucide-react";
import { logger } from "@/utils/logger";
import { useTheme } from "@/theme";

// Note: Empty interface kept for future extensibility
interface AboutProps {
  // Reserved for future props like isDarkMode or className
}

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

// Core values data
const coreValues = [
  {
    icon: <Shield size={24} />,
    title: "Integrity",
    description:
      "We uphold the highest ethical standards in all our dealings and decisions.",
  },
  {
    icon: <Globe size={24} />,
    title: "Collaboration",
    description:
      "We believe in the power of partnership and collective intelligence.",
  },
  {
    icon: <Zap size={24} />,
    title: "Visionary Thinking",
    description:
      "We look beyond the horizon to identify tomorrow's opportunities.",
  },
  {
    icon: <Award size={24} />,
    title: "Sustainability",
    description:
      "We invest with purpose, considering long-term impact beyond financial returns.",
  },
];

const About: FC<AboutProps> = memo((): React.ReactElement => {
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === "dark";
  const [_activeSection, _setActiveSection] = useState(0);
  const sectionRef = useSectionObserver("about", (id) => {
    logger.debug(`[About] Section "${id}" is now visible`);
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const paragraphs = [
    "At Phoenix VC, our mission is to empower innovation, fuel growth, and shape the future through strategic investments and partnerships. We are committed to identifying and nurturing exceptional entrepreneurs, startups, and businesses that have the potential to revolutionize industries and create lasting positive impact.",
    "Our core values of integrity, collaboration, and visionary thinking drive our investment decisions and guide our interactions with founders, investors, and stakeholders. Through diligent research, rigorous due diligence, and a forward-thinking approach, we strive to identify transformative opportunities in the technology sector.",
    "Furthermore, we are committed to responsible investing practices that align with environmental, social, and governance (ESG) principles. By integrating sustainability considerations into our investment strategies, we strive to create a positive ripple effect that goes beyond financial gains and contributes to a more equitable and sustainable future.",
    "Phoenix VC is driven by a passion for unlocking untapped potential, driving disruptive change, and fostering a culture of entrepreneurship. We aim to be a trusted partner for founders and investors, a catalyst for innovation, and a driving force behind the success stories of tomorrow. Together, we will soar to new heights, igniting possibilities and shaping a brighter future for generations to come.",
  ];

  useEffect(() => {
    const video = videoRef.current;
    // Store handler reference for proper cleanup
    const handleLoadedData = (): void => setVideoLoaded(true);

    if (video) {
      // Add event listeners to track video loading
      video.addEventListener("loadeddata", handleLoadedData);

      // Set the correct source based on theme
      const source = video.querySelector("source");
      if (source) {
        source.src = isDarkMode
          ? "/PhoenixVC_to_Phoenix.mp4"
          : "/Phoenix_to_PhoenixVC.mp4";
        video.load(); // Important: reload the video with new source
      }
    }

    return (): void => {
      if (video) {
        video.removeEventListener("loadeddata", handleLoadedData);
      }
    };
  }, [isDarkMode]);

  useEffect(() => {
    logger.debug(
      "Video source updated for theme:",
      isDarkMode ? "dark" : "light",
    );

    // Check if video files exist with a properly structured async function
    (async (): Promise<void> => {
      const checkVideoExists = async (url: string): Promise<void> => {
        try {
          const response = await fetch(url, { method: "HEAD" });
          logger.debug(`Video at ${url} exists:`, response.ok);
        } catch (error) {
          logger.error(`Error checking video at ${url}:`, error);
        }
      };

      await checkVideoExists("/PhoenixVC_to_Phoenix.mp4");
      await checkVideoExists("/Phoenix_to_PhoenixVC.mp4");
    })().catch((error) => {
      logger.error("Error in video check process:", error);
    });
  }, [isDarkMode]);

  return (
    <section
      id="about"
      ref={sectionRef}
      className={`${styles.section} ${isDarkMode ? styles.darkMode : styles.lightMode}`}
      aria-label="About Phoenix VC"
    >
      <div className={styles.container}>
        <motion.div
          className={styles.content}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={aboutAnimations.container}
        >
          <motion.h2
            className={`${styles.title} ${isDarkMode ? styles.darkTitle : styles.lightTitle}`}
            variants={aboutAnimations.item}
          >
            About Us
          </motion.h2>

          <motion.div
            className={styles.divider}
            variants={aboutAnimations.item}
          />

          {/* Featured statement */}
          <motion.div
            className={styles.featuredStatement}
            variants={aboutAnimations.item}
          >
            <span className={styles.quote}>"</span>
            <p>Empowering visionaries to build the future</p>
            <span className={styles.quote}>"</span>
          </motion.div>

          {/* Two-column layout for larger screens */}
          <div className={styles.twoColumnLayout}>
            {/* Left column: Image or graphic */}
            <motion.div
              className={styles.imageColumn}
              variants={aboutAnimations.item}
            >
              <div
                className={styles.imageContainer}
                onMouseEnter={() => {
                  const video = videoRef.current;
                  if (video && videoLoaded) {
                    video.style.opacity = "1";
                    // Use the promise API but handle it properly
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                      playPromise.catch((error) => {
                        logger.error("Error playing video:", error);
                      });
                    }
                  }
                }}
                onMouseLeave={() => {
                  const video = videoRef.current;
                  if (video) {
                    video.style.opacity = "0";
                    video.pause();
                    video.currentTime = 0;
                  }
                }}
              >
                <div className={styles.imageOverlay} />

                {/* Logo Image with opacity transition */}
                <img
                  src={
                    isDarkMode
                      ? "/LOGO_V3_Primary_darkbg.png"
                      : "/LOGO_V3_Primary_lightbg.png"
                  }
                  alt="Phoenix VC Logo"
                  className={styles.logoImage}
                  width={400}
                  height={400}
                  loading="lazy"
                  style={{
                    opacity: videoLoaded ? 0.9 : 1,
                    transition: "opacity 0.3s ease",
                  }}
                />

                {/* Video that shows on hover */}
                <div className={styles.videoContainer}>
                  <video
                    ref={videoRef}
                    className={styles.phoenixVideo}
                    muted
                    playsInline
                    preload="metadata"
                  >
                    <source
                      src={
                        isDarkMode
                          ? "/PhoenixVC_to_Phoenix.mp4"
                          : "/Phoenix_to_PhoenixVC.mp4"
                      }
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </motion.div>

            {/* Right column: Text content */}
            <div className={styles.textColumn}>
              <div className={styles.paragraphContainer}>
                {paragraphs.map((paragraph, index) => (
                  <motion.p
                    key={index}
                    className={styles.paragraph}
                    variants={aboutAnimations.item}
                  >
                    {paragraph}
                  </motion.p>
                ))}
              </div>
            </div>
          </div>

          {/* Core values section */}
          <motion.div
            className={styles.valuesSection}
            variants={aboutAnimations.item}
          >
            <h3 className={styles.valuesSectionTitle}>Our Core Values</h3>

            <div className={styles.valuesGrid}>
              {coreValues.map((value, index) => (
                <motion.div
                  key={index}
                  className={styles.valueCard}
                  variants={aboutAnimations.valueCard}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className={styles.valueIconContainer}>{value.icon}</div>
                  <h4 className={styles.valueTitle}>{value.title}</h4>
                  <p className={styles.valueDescription}>{value.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Call to action */}
          <motion.div
            className={styles.ctaSection}
            variants={aboutAnimations.item}
          >
            <p className={styles.ctaText}>
              Ready to partner with us on your journey?
            </p>
            <motion.a
              href="#contact"
              className={styles.ctaButton}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Get in Touch <ArrowRight size={16} className={styles.ctaIcon} />
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
});

About.displayName = "About";
export default About;
