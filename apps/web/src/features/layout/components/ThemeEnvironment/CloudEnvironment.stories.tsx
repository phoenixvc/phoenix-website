import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";
import { CLOUD_ENVIRONMENT } from "./registry";

const meta = {
  title: "Themes/Cloud/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", background: "#0b132b" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    themeName: "cloud",
    isDarkMode: true,
    sidebarWidth: 0,
    gameMode: false,
    debugMode: false,
  },
} satisfies Meta<typeof ThemeEnvironment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeterministicStaticFrame: Story = {
  args: { fixture: CLOUD_ENVIRONMENT.staticFixture },
};

export const DeterministicLight: Story = {
  args: {
    isDarkMode: false,
    fixture: CLOUD_ENVIRONMENT.staticFixture,
  },
};

export const InteractiveAdaptive: Story = {};
