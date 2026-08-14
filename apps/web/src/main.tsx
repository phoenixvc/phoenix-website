import { StrictMode, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/theme";
import { DEFAULT_THEME_NAME } from "@/theme/constants/themes/catalog";
import { createBuiltInThemeRegistry } from "@/theme/constants/themes/registry";
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

function PhoenixApp(): ReactElement {
  const [themeRegistry] = useState(createBuiltInThemeRegistry);

  return (
    <ThemeProvider
      themeRegistry={themeRegistry}
      config={{
        defaultThemeName: DEFAULT_THEME_NAME,
        defaultMode: "dark",
        useSystem: false,
        storage: {
          type: "localStorage",
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
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PhoenixApp />
  </StrictMode>,
);
