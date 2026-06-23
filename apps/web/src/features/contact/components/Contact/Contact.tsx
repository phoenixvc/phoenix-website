// features/contact/components/Contact/Contact.tsx
import { FC, memo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import ContactHeader from "../ContactHeader/ContactHeader";
import ContactForm from "../ContactForm/ContactForm";
import { contactAnimations } from "../../animations";
import { DEFAULT_CONTACT_CONTENT } from "../../constants";
import styles from "./Contact.module.css";
import type { ContactFormData, ContactState } from "../../types";
import { useSectionObserver } from "@/hooks/useSectionObserver";
import { logger } from "@/utils/logger";
import { useTheme } from "@/theme";

// Add isDarkMode to the component props
// Note: Empty interface kept for future extensibility
interface ContactProps {
  // Reserved for future props like isDarkMode or className
}

const Contact: FC<ContactProps> = memo(() => {
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === "dark";
  const [state, setState] = useState<ContactState>({
    isLoading: false,
    error: null,
    success: false,
  });

  const sectionRef = useSectionObserver("contact", (id) => {
    logger.debug(`[Contact] Section "${id}" is now visible`);
  });

  const handleSubmit = useCallback(async (data: ContactFormData) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      success: false,
    }));

    try {
      // Call your Azure Function - use the local URL during development
      const functionUrl =
        process.env.NODE_ENV === "production"
          ? "/api/sendContactEmail"
          : "http://localhost:7071/api/sendContactEmail";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit form");
      }

      // Success!
      setState((prev) => ({ ...prev, success: true }));
      logger.info("Form submitted successfully:", data);
    } catch (error) {
      logger.error("Error submitting form:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit form. Please try again.",
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Wrap the async call in a synchronous handler
  const handleSubmitWrapper = useCallback(
    (data: ContactFormData) => {
      void handleSubmit(data);
    },
    [handleSubmit],
  );

  return (
    <section
      id="contact"
      ref={sectionRef}
      className={`${styles.section} ${isDarkMode ? styles.darkMode : styles.lightMode}`}
    >
      <div className={styles.container}>
        <motion.div
          className={styles.content}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={contactAnimations.container}
        >
          <ContactHeader
            title={DEFAULT_CONTACT_CONTENT.title}
            subtitle={DEFAULT_CONTACT_CONTENT.subtitle}
            isDarkMode={isDarkMode}
          />

          {state.error && (
            <motion.div
              className={styles.error}
              variants={contactAnimations.item}
            >
              {state.error}
            </motion.div>
          )}

          {state.success && (
            <motion.div
              className={styles.success}
              variants={contactAnimations.item}
            >
              Thank you for your message! We'll get back to you soon.
            </motion.div>
          )}

          <ContactForm
            onSubmit={handleSubmitWrapper}
            isLoading={state.isLoading}
            isSuccess={state.success}
            isDarkMode={isDarkMode}
          />
        </motion.div>
      </div>
    </section>
  );
});

Contact.displayName = "Contact";
export default Contact;
