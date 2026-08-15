import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";
import { CLASSIC_ENVIRONMENT } from "./registry";

const meta = {
  title: "Themes/Classic/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", background: "#090d16" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    themeName: "classic",
    isDarkMode: true,
    sidebarWidth: 0,
    gameMode: false,
    debugMode: false,
  },
} satisfies Meta<typeof ThemeEnvironment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeterministicStaticFrame: Story = {
  args: { fixture: CLASSIC_ENVIRONMENT.staticFixture },
};

export const DeterministicLight: Story = {
  args: {
    isDarkMode: false,
    fixture: CLASSIC_ENVIRONMENT.staticFixture,
  },
};

export const InteractiveAdaptive: Story = {};
