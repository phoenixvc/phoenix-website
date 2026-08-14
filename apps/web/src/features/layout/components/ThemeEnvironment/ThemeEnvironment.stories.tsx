import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";

const meta = {
  title: "Themes/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    themeName: "phoenix",
    isDarkMode: true,
    sidebarWidth: 0,
    gameMode: false,
    debugMode: false,
  },
} satisfies Meta<typeof ThemeEnvironment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PhoenixInteractive: Story = {
  args: {
    themeName: "phoenix",
    isDarkMode: true,
  },
};

export const PhoenixLightMode: Story = {
  args: {
    themeName: "phoenix",
    isDarkMode: false,
  },
};

export const PhoenixDeterministicStaticFrame: Story = {
  args: {
    themeName: "phoenix",
    isDarkMode: true,
    fixture: {
      seed: 20260814,
      timeMs: 15000,
      qualityTier: "low",
      motionMode: "reduced",
      paused: true,
    },
  },
};

export const PhoenixReducedMotion: Story = {
  args: {
    themeName: "phoenix",
    isDarkMode: true,
    fixture: {
      seed: 20260814,
      timeMs: 12000,
      qualityTier: "low",
      motionMode: "reduced",
      paused: true,
    },
  },
};

export const CosmicFrontierInteractive: Story = {
  args: {
    themeName: "cosmic-frontier",
    isDarkMode: true,
  },
};
