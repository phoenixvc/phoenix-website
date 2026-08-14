import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";

const meta = {
  title: "Themes/Cosmic Frontier/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", background: "#080b18" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    themeName: "cosmic-frontier",
    isDarkMode: true,
    sidebarWidth: 0,
    gameMode: false,
    debugMode: false,
  },
} satisfies Meta<typeof ThemeEnvironment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeterministicStaticFrame: Story = {
  args: {
    fixture: {
      seed: 20260809,
      timeMs: 12000,
      qualityTier: "low",
      motionMode: "reduced",
      paused: true,
    },
  },
};

export const InteractiveAdaptive: Story = {};

export const ForestDeterministicStaticFrame: Story = {
  args: {
    themeName: "forest",
    fixture: {
      seed: 20260809,
      timeMs: 12000,
      qualityTier: "low",
      motionMode: "reduced",
      paused: true,
    },
  },
};

export const ForestInteractiveAdaptive: Story = {
  args: {
    themeName: "forest",
    isDarkMode: true,
  },
};
