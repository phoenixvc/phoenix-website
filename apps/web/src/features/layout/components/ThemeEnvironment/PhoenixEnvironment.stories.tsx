import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";
import { PHOENIX_ENVIRONMENT } from "./registry";

const meta = {
  title: "Themes/Phoenix/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", background: "#0c0809" }}>
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

/**
 * The frame `?phoenix-fixture=static` produces. Seeded to a deterministic volcanic
 * moment with rising embers, feather wing motifs, and solar rebirth crest.
 */
export const DeterministicStaticFrame: Story = {
  args: {
    fixture: {
      seed: 20260814,
      timeMs: 12000,
      qualityTier: "low",
      motionMode: "reduced",
      paused: true,
    },
  },
};

/** Same seed and moment, rendered against the luminous sunrise parchment palette. */
export const DeterministicLight: Story = {
  args: {
    isDarkMode: false,
    fixture: {
      seed: 20260814,
      timeMs: 12000,
      qualityTier: "low",
      motionMode: "reduced",
      paused: true,
    },
  },
};

/** High quality active caldera setting. */
export const DeterministicHighTier: Story = {
  args: {
    fixture: {
      seed: 20260814,
      timeMs: 12000,
      qualityTier: "high",
      motionMode: "full",
      paused: true,
    },
  },
};

export const InteractiveAdaptive: Story = {};
