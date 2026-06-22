import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: "camelCase", // Ensures CSS Modules are properly read
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@styles": path.resolve(__dirname, "./src/styles"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },
  server: {
    fs: {
      allow: [".."], // Allows access to parent directories (needed for workspaces)
    },
  },
  build: {
    // Increase chunk size warning limit since we have a large app
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendors AND the heavy Starfield into their own chunks so they
        // download in parallel with the core bundle instead of one monolith.
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("react")) return "vendor-react";
            return "vendor";
          }
          // The interactive starfield is the single heaviest app module.
          if (/[\\/]Starfield[\\/]/.test(id)) return "starfield";
        },
      },
    },
  },
});
