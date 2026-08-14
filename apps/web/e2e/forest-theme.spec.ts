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

const forestFixtureUrl = "/?theme=forest&forest-fixture=static";

test.describe("Forest theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("owns the forest environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto(forestFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "forest");

    const environment = page.locator(
      "[data-theme-environment='forest-canopy']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "forest",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const canopy = page.locator("[data-forest-canopy]");
    await expect(canopy).toHaveAttribute("data-quality-tier", "low");
    await expect(canopy).toHaveAttribute("data-seed", "20260809");
    await expect(canopy).toHaveAttribute("data-time", "12000");
    await expect(canopy).toHaveAttribute("data-frame-budget", "0");
    await expect(canopy).toHaveAttribute("data-forest-zoom", "1");
    await expect(canopy).toHaveAttribute("data-forest-focus", "overview");
    await expect
      .poll(async () =>
        Number(await canopy.getAttribute("data-forest-node-count")),
      )
      .toBeGreaterThan(10);
    await expect(canopy.locator("canvas")).toBeVisible();
    await expect(canopy.locator("svg")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Portfolio Glade" }),
    ).toBeVisible();

    const headerBackground = await page
      .locator("header")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(headerBackground).toMatch(/rgba?\(10,\s*22,\s*16/);
    const sidebarBackground = await page
      .locator("aside")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(sidebarBackground).toMatch(/rgb\(/);
    expect(sidebarBackground).not.toBe("rgb(13, 14, 30)");

    await expect
      .poll(() =>
        page.evaluate(() => ({
          selectedTheme: JSON.parse(
            localStorage.getItem("theme_name") ?? "null",
          ) as string | null,
          primary:
            document.documentElement.style.getPropertyValue("--color-primary"),
          namespacedPrimary: document.documentElement.style.getPropertyValue(
            "--theme-colors-primary",
          ),
          background:
            document.documentElement.style.getPropertyValue(
              "--color-background",
            ),
          namespacedBackground: document.documentElement.style.getPropertyValue(
            "--theme-colors-background",
          ),
        })),
      )
      .toMatchObject({
        selectedTheme: "forest",
        primary: expect.stringMatching(/\d/),
        namespacedPrimary: expect.stringMatching(/\d/),
        background: expect.stringMatching(/\d/),
        namespacedBackground: expect.stringMatching(/\d/),
      });

    const variables = await page.evaluate(() => ({
      primary:
        document.documentElement.style.getPropertyValue("--color-primary"),
      namespacedPrimary: document.documentElement.style.getPropertyValue(
        "--theme-colors-primary",
      ),
      background:
        document.documentElement.style.getPropertyValue("--color-background"),
      namespacedBackground: document.documentElement.style.getPropertyValue(
        "--theme-colors-background",
      ),
    }));
    expect(variables.primary).toBe(variables.namespacedPrimary);
    expect(variables.background).toBe(variables.namespacedBackground);
    expect(
      diagnostics.filter((message) =>
        /ThemeAcquisitionManager|component variant|theme initialization failed|invalid color/i.test(
          message,
        ),
      ),
    ).toEqual([]);

    await page.screenshot({
      path: "e2e/evidence/forest-dark-static.png",
      fullPage: true,
    });
  });

  test("honours reduced-motion without removing the representative forest frame", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?theme=forest", { waitUntil: "domcontentloaded" });

    const environment = page.locator(
      "[data-theme-environment='forest-canopy']",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");
    await expect(page.locator("[data-forest-canopy] canvas")).toBeVisible();
    await page.screenshot({
      path: "e2e/evidence/forest-reduced-motion.png",
      fullPage: true,
    });
  });

  test("reapplies forest color aliases when mode changes", async ({ page }) => {
    await page.goto(forestFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "forest");
    await expect(provider).toHaveAttribute("data-mode", "dark");

    const readAliases = (): Promise<{
      background: string;
      namespacedBackground: string;
    }> =>
      page.evaluate(() => ({
        background:
          document.documentElement.style.getPropertyValue("--color-background"),
        namespacedBackground: document.documentElement.style.getPropertyValue(
          "--theme-colors-background",
        ),
      }));

    const darkAliases = await readAliases();
    await page.getByRole("button", { name: "Toggle theme" }).click();

    await expect(provider).toHaveAttribute("data-mode", "light");
    await expect.poll(readAliases).toMatchObject({
      background: expect.stringMatching(/\d/),
      namespacedBackground: expect.stringMatching(/\d/),
    });
    const lightAliases = await readAliases();
    expect(lightAliases.background).toBe(lightAliases.namespacedBackground);
    expect(lightAliases.background).not.toBe(darkAliases.background);

    await page.screenshot({
      path: "e2e/evidence/forest-light-static.png",
      fullPage: true,
    });
  });

  test("zooms into a grove from the forest navigation", async ({ page }) => {
    await page.goto(forestFixtureUrl, { waitUntil: "domcontentloaded" });
    const canopy = page.locator("[data-forest-canopy]");
    await page.getByRole("button", { name: "Portfolio Glade" }).click();
    await expect(canopy).toHaveAttribute(
      "data-forest-focus",
      "portfolio-grove",
    );
    await expect(canopy).toHaveAttribute("data-forest-zoom", "2.35");
    await page.getByRole("button", { name: "Whole forest" }).click();
    await expect(canopy).toHaveAttribute("data-forest-focus", "overview");
    await expect(canopy).toHaveAttribute("data-forest-zoom", "1");
  });

  test("can be selected from the header theme menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("button", { name: "Theme Selection" }).click();
    await page.getByRole("button", { name: "Forest" }).click();

    await expect(page.locator(".theme-wrapper")).toHaveAttribute(
      "data-theme",
      "forest",
    );
    await expect(
      page.locator("[data-theme-environment='forest-canopy']"),
    ).toHaveAttribute("data-theme-environment-owner", "forest");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("theme_name") ?? "null") as
              | string
              | null,
        ),
      )
      .toBe("forest");
  });

  test("keeps Forest after navigating to another page", async ({ page }) => {
    await page.goto("/?theme=forest", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".theme-wrapper")).toHaveAttribute(
      "data-theme",
      "forest",
    );

    await page.locator("header").getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator(".theme-wrapper")).toHaveAttribute(
      "data-theme",
      "forest",
    );
    await expect(
      page.locator("[data-theme-environment='forest-canopy']"),
    ).toHaveAttribute("data-theme-environment-owner", "forest");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("theme_name") ?? "null") as
              | string
              | null,
        ),
      )
      .toBe("forest");
  });

  test("keeps Cosmic as the default when Forest is not selected", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.removeItem("theme_name"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".theme-wrapper")).toHaveAttribute(
      "data-theme",
      "cosmic-frontier",
    );
    await expect(
      page.locator("[data-theme-environment='cosmic-starfield']"),
    ).toHaveAttribute("data-theme-environment-fallback", "false");
  });
});
