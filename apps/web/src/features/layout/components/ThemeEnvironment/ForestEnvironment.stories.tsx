import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";
import { FOREST_ENVIRONMENT } from "./registry";

const meta = {
  title: "Themes/Forest/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", background: "#0c1a12" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    themeName: "forest",
    isDarkMode: true,
    sidebarWidth: 0,
    gameMode: false,
    debugMode: false,
  },
} satisfies Meta<typeof ThemeEnvironment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeterministicStaticFrame: Story = {
  args: { fixture: FOREST_ENVIRONMENT.staticFixture },
};

export const DeterministicLight: Story = {
  args: {
    isDarkMode: false,
    fixture: FOREST_ENVIRONMENT.staticFixture,
  },
};

export const InteractiveAdaptive: Story = {};
