import type { Preview } from "@storybook/react-vite";
import "../src/theme/theme.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
  },
};

export default preview;
