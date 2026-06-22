import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/theme";
import "./theme/theme.css";
import { logger } from "@/utils/logger";
import { initWebVitals } from "@/utils/performance";
import {
  isChunkLoadError,
  attemptChunkReload,
  resetChunkReloadCounter,
} from "@/utils/chunkErrorRecovery";

logger.debug("Index file is running");

// Recover from transient/stale dynamic-import (chunk/CSS preload) failures by
// reloading once for a fresh index.html, instead of letting React.lazy trip the
// top-level error screen. Vite fires this event from its preload helper.
window.addEventListener("vite:preloadError", (event) => {
  // Suppress Vite's default rethrow; we recover by reloading instead.
  event.preventDefault();
  attemptChunkReload();
});

// Belt-and-braces: some chunk failures surface as unhandled promise rejections
// (e.g. the module fetch itself) rather than a vite:preloadError event.
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason) && attemptChunkReload()) {
    event.preventDefault();
  }
});

// If the app is still alive after a few seconds the load succeeded — clear the
// reload cap so a future deploy in the same session can self-heal again.
window.setTimeout(resetChunkReloadCounter, 5000);

// Initialize Core Web Vitals monitoring
initWebVitals();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      config={{
        defaultThemeName: "classic",
        defaultMode: "dark",
        useSystem: false,
        storage: {
          type: "localStorage",
          prefix: "my-app-theme",
        },
        transition: {
          duration: 300,
          timing: "ease",
        },
      }}
      className="theme-wrapper"
      onThemeChange={(theme) => {
        logger.debug("Theme changed:", theme);
      }}
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
);
