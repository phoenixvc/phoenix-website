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

const classicFixtureUrl = "/?theme=classic&classic-fixture=static";

test.describe("Classic theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("owns the classic blueprint environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto(classicFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "classic");

    const environment = page.locator(
      "[data-theme-environment='classic-blueprint']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "classic",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const classicEnv = page.locator("[data-classic-environment]");
    await expect(classicEnv).toHaveAttribute("data-quality-tier", "low");
    await expect(classicEnv).toHaveAttribute("data-seed", "20260818");
    await expect(classicEnv).toHaveAttribute("data-time", "12000");
    await expect(classicEnv).toHaveAttribute("data-frame-budget", "0");
    await expect(classicEnv).toHaveAttribute("data-classic-zoom", "1.00");
    await expect
      .poll(async () =>
        Number(await classicEnv.getAttribute("data-classic-node-count")),
      )
      .toBeGreaterThan(8);
    await expect(classicEnv.locator("canvas")).toBeVisible();

    const headerBackground = await page.locator("header").evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    expect(headerBackground).toMatch(/rgba?\(9,\s*13,\s*22/);

    const unexpected = diagnostics.filter(
      (entry) =>
        !entry.includes("[vite]") &&
        !entry.includes("favicon") &&
        !entry.includes("Download the React DevTools"),
    );
    expect(unexpected).toEqual([]);
  });

  test("persists classic theme across route navigation", async ({ page }) => {
    await page.goto(classicFixtureUrl, { waitUntil: "domcontentloaded" });
    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "classic");

    const aboutLink = page.getByRole("link", { name: "About" }).first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/.*about/);
      await expect(provider).toHaveAttribute("data-theme", "classic");
    }
  });
});
