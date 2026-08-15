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

const cloudFixtureUrl = "/?theme=cloud&cloud-fixture=static";

test.describe("Cloud theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("owns the cloud stratosphere environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto(cloudFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "cloud");

    const environment = page.locator(
      "[data-theme-environment='cloud-strato']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "cloud",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const cloudEnv = page.locator("[data-cloud-environment]");
    await expect(cloudEnv).toHaveAttribute("data-quality-tier", "low");
    await expect(cloudEnv).toHaveAttribute("data-seed", "20260816");
    await expect(cloudEnv).toHaveAttribute("data-time", "12000");
    await expect(cloudEnv).toHaveAttribute("data-frame-budget", "0");
    await expect(cloudEnv).toHaveAttribute("data-cloud-zoom", "1.00");
    await expect
      .poll(async () =>
        Number(await cloudEnv.getAttribute("data-cloud-node-count")),
      )
      .toBeGreaterThan(8);
    await expect(cloudEnv.locator("canvas")).toBeVisible();

    const headerBackground = await page.locator("header").evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    expect(headerBackground).toMatch(/rgba?\(11,\s*19,\s*43/);

    const unexpected = diagnostics.filter(
      (entry) =>
        !entry.includes("[vite]") &&
        !entry.includes("favicon") &&
        !entry.includes("Download the React DevTools"),
    );
    expect(unexpected).toEqual([]);
  });

  test("persists cloud theme across route navigation", async ({ page }) => {
    await page.goto(cloudFixtureUrl, { waitUntil: "domcontentloaded" });
    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "cloud");

    const aboutLink = page.getByRole("link", { name: "About" }).first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/.*about/);
      await expect(provider).toHaveAttribute("data-theme", "cloud");
    }
  });
});
