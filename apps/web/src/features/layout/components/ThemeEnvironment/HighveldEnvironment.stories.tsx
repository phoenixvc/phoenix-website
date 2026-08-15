import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";
import { HIGHVELD_ENVIRONMENT } from "./registry";

const meta = {
  title: "Themes/Highveld/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", background: "#0f1216" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    themeName: "highveld",
    isDarkMode: true,
    sidebarWidth: 0,
    gameMode: false,
    debugMode: false,
  },
} satisfies Meta<typeof ThemeEnvironment>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The frame `?highveld-fixture=static` produces. Seeded to a moment when a bolt
 * is live, so the deterministic case still shows the signature of the theme.
 */
export const DeterministicStaticFrame: Story = {
  args: { fixture: HIGHVELD_ENVIRONMENT.staticFixture },
};

/** Same seed and moment, rendered against the light palette. */
export const DeterministicLight: Story = {
  args: {
    isDarkMode: false,
    fixture: HIGHVELD_ENVIRONMENT.staticFixture,
  },
};

/** Midday, no bolt — shows the day end of the cycle and the wind-run veld. */
export const DeterministicMidday: Story = {
  args: {
    isDarkMode: false,
    fixture: {
      ...HIGHVELD_ENVIRONMENT.staticFixture,
      timeMs: 30000,
      qualityTier: "high",
    },
  },
};

export const InteractiveAdaptive: Story = {};
