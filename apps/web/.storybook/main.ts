import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  async viteFinal(viteConfig) {
    viteConfig.resolve = viteConfig.resolve ?? {};
    const alias = viteConfig.resolve.alias;
    viteConfig.resolve.alias = Array.isArray(alias)
      ? [
          ...alias,
          { find: "@", replacement: path.resolve(directory, "../src") },
        ]
      : {
          ...alias,
          "@": path.resolve(directory, "../src"),
        };
    return viteConfig;
  },
};

export default config;
