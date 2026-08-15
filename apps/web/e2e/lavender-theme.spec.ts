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

const lavenderFixtureUrl = "/?theme=lavender&lavender-fixture=static";

test.describe("Lavender theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("owns the lavender meadow environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto(lavenderFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "lavender");

    const environment = page.locator(
      "[data-theme-environment='lavender-meadow']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "lavender",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const lavenderEnv = page.locator("[data-lavender-environment]");
    await expect(lavenderEnv).toHaveAttribute("data-quality-tier", "low");
    await expect(lavenderEnv).toHaveAttribute("data-seed", "20260817");
    await expect(lavenderEnv).toHaveAttribute("data-time", "12000");
    await expect(lavenderEnv).toHaveAttribute("data-frame-budget", "0");
    await expect(lavenderEnv).toHaveAttribute("data-lavender-zoom", "1.00");
    await expect
      .poll(async () =>
        Number(await lavenderEnv.getAttribute("data-lavender-node-count")),
      )
      .toBeGreaterThan(8);
    await expect(lavenderEnv.locator("canvas")).toBeVisible();

    const headerBackground = await page.locator("header").evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    expect(headerBackground).toMatch(/rgba?\(18,\s*13,\s*28/);

    const unexpected = diagnostics.filter(
      (entry) =>
        !entry.includes("[vite]") &&
        !entry.includes("favicon") &&
        !entry.includes("Download the React DevTools"),
    );
    expect(unexpected).toEqual([]);
  });

  test("persists lavender theme across route navigation", async ({ page }) => {
    await page.goto(lavenderFixtureUrl, { waitUntil: "domcontentloaded" });
    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "lavender");

    const aboutLink = page.getByRole("link", { name: "About" }).first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/.*about/);
      await expect(provider).toHaveAttribute("data-theme", "lavender");
    }
  });
});
