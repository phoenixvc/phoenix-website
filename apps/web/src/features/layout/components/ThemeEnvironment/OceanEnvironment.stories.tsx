import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import ThemeEnvironment from "./ThemeEnvironment";
import { OCEAN_ENVIRONMENT } from "./registry";

const meta = {
  title: "Themes/Ocean/Environment",
  component: ThemeEnvironment,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story): ReactElement => (
      <div style={{ minHeight: "100vh", background: "#030b14" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    themeName: "ocean",
    isDarkMode: true,
    sidebarWidth: 0,
    gameMode: false,
    debugMode: false,
  },
} satisfies Meta<typeof ThemeEnvironment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeterministicStaticFrame: Story = {
  args: { fixture: OCEAN_ENVIRONMENT.staticFixture },
};

export const DeterministicLight: Story = {
  args: {
    isDarkMode: false,
    fixture: OCEAN_ENVIRONMENT.staticFixture,
  },
};

export const InteractiveAdaptive: Story = {};
