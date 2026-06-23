// features/error/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/utils/logger";
import {
  isChunkLoadError,
  attemptChunkReload,
} from "@/utils/chunkErrorRecovery";
import styles from "./NotFound.module.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** True while a reload is pending to recover from a chunk-load failure. */
  isReloading: boolean;
}

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
}

/**
 * Reports error to external service (Sentry, LogRocket, etc.)
 * To enable, set VITE_ERROR_REPORTING_ENDPOINT in environment
 */
const reportError = async (report: ErrorReport): Promise<void> => {
  const endpoint = import.meta.env.VITE_ERROR_REPORTING_ENDPOINT;

  if (!endpoint) {
    // Error reporting not configured, log locally only
    logger.error("[ErrorBoundary] Error reporting endpoint not configured");
    return;
  }

  try {
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(report));
    } else {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
        keepalive: true,
      });
    }
    logger.debug("[ErrorBoundary] Error reported successfully");
  } catch (err) {
    logger.error("[ErrorBoundary] Failed to report error:", err);
  }
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReloading: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Optimistically suppress the error UI for chunk-load failures — they are
    // recovered by a reload in componentDidCatch (or shown gracefully if the
    // reload cap is reached).
    return { hasError: true, error, isReloading: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // A failed code-split chunk (stale deploy, network blip) is recoverable by
    // reloading for a fresh index.html — do that before showing any error UI.
    if (isChunkLoadError(error)) {
      if (attemptChunkReload()) {
        return; // page is about to reload
      }
      // Reload cap reached: fall through and show the graceful fallback.
      this.setState({ isReloading: false });
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Log error to console DIRECTLY so it's always visible
    console.error("=== ERROR BOUNDARY CAUGHT ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("===================================");

    // Also log via logger
    logger.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Build error report
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };

    // Report to external service (fire and forget)
    void reportError(report);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isReloading: false,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // A reload is pending to recover from a chunk-load failure — render
      // nothing rather than flashing the error screen.
      if (this.state.isReloading) {
        return null;
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <section className={`${styles.container} ${styles.dark}`}>
          <div className={styles.content}>
            <h1 className={styles.errorCode}>Oops!</h1>
            <h2 className={styles.title}>Something went wrong</h2>
            <p className={styles.description}>
              We encountered an unexpected error. Please try refreshing the page
              or going back to the home page.
            </p>
            {/* Raw error/stack is dev-only — never shown to end users in prod */}
            {import.meta.env.DEV && this.state.error && (
              <div style={{
                marginTop: "30px",
                padding: "20px",
                background: "#2a1515",
                border: "2px solid #ff4444",
                borderRadius: "12px",
                textAlign: "left",
                maxWidth: "800px",
                margin: "30px auto",
                fontSize: "14px",
                fontFamily: "monospace",
              }}>
                <div style={{
                  color: "#ff6b6b",
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "15px",
                  borderBottom: "1px solid #ff4444",
                  paddingBottom: "10px"
                }}>
                  DEBUG INFO (share this with developer):
                </div>
                <div style={{ color: "#ffaaaa", marginBottom: "10px" }}>
                  <strong style={{ color: "#ff6b6b" }}>Error:</strong> {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <pre style={{
                    marginTop: "10px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "#cc8888",
                    fontSize: "11px",
                    maxHeight: "300px",
                    overflow: "auto",
                    background: "#1a0a0a",
                    padding: "10px",
                    borderRadius: "6px"
                  }}>
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <div className={styles.actions}>
              <button
                onClick={() => (window.location.href = "/")}
                className={styles.primaryButton}
              >
                Go Home
              </button>
              <button
                onClick={this.handleReset}
                className={styles.secondaryButton}
              >
                Try Again
              </button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
