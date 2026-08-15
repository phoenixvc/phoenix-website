import { expect, test, type Page } from "@playwright/test";

const captureThemeDiagnostics = (page: Page): string[] => {
  const diagnostics: string[] = [];
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      diagnostics.push(message.text());
    }
  });
  return diagnostics;
};

const oceanFixtureUrl = "/?theme=ocean&ocean-fixture=static";

test.describe("Ocean theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("owns the ocean abyss environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto(oceanFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "ocean");

    const environment = page.locator(
      "[data-theme-environment='ocean-abyss']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "ocean",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const oceanEnv = page.locator("[data-ocean-environment]");
    await expect(oceanEnv).toHaveAttribute("data-quality-tier", "low");
    await expect(oceanEnv).toHaveAttribute("data-seed", "20260815");
    await expect(oceanEnv).toHaveAttribute("data-time", "12000");
    await expect(oceanEnv).toHaveAttribute("data-frame-budget", "0");
    await expect(oceanEnv).toHaveAttribute("data-ocean-zoom", "1.00");
    await expect
      .poll(async () =>
        Number(await oceanEnv.getAttribute("data-ocean-node-count")),
      )
      .toBeGreaterThan(8);
    await expect(oceanEnv.locator("canvas")).toBeVisible();

    const headerBackground = await page.locator("header").evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    expect(headerBackground).toMatch(/rgba?\(3,\s*11,\s*23/);

    const unexpected = diagnostics.filter(
      (entry) =>
        !entry.includes("[vite]") &&
        !entry.includes("favicon") &&
        !entry.includes("Download the React DevTools"),
    );
    expect(unexpected).toEqual([]);
  });

  test("persists ocean theme across route navigation", async ({ page }) => {
    await page.goto(oceanFixtureUrl, { waitUntil: "domcontentloaded" });
    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "ocean");

    const aboutLink = page.getByRole("link", { name: "About" }).first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/.*about/);
      await expect(provider).toHaveAttribute("data-theme", "ocean");
    }
  });
});
