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

const phoenixFixtureUrl = "/?theme=phoenix&phoenix-fixture=static";

test.describe("Phoenix theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("owns the phoenix environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto(phoenixFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "phoenix");

    const environment = page.locator(
      "[data-theme-environment='phoenix-reign']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "phoenix",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const phoenixEnv = page.locator("[data-phoenix-environment]");
    await expect(phoenixEnv).toHaveAttribute("data-quality-tier", "low");
    await expect(phoenixEnv).toHaveAttribute("data-seed", "20260814");
    await expect(phoenixEnv).toHaveAttribute("data-time", "12000");
    await expect(phoenixEnv).toHaveAttribute("data-frame-budget", "0");
    await expect(phoenixEnv).toHaveAttribute("data-phoenix-zoom", "1.00");
    await expect(phoenixEnv).toHaveAttribute("data-phoenix-focus", "overview");
    await expect
      .poll(async () =>
        Number(await phoenixEnv.getAttribute("data-phoenix-node-count")),
      )
      .toBeGreaterThan(10);
    await expect(phoenixEnv.locator("canvas")).toBeVisible();
    await expect(phoenixEnv.locator("svg").first()).toBeVisible();

    const headerBackground = await page.locator("header").evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    expect(headerBackground).toMatch(/rgba?\(9,\s*7,\s*8/);
    const sidebarBackground = await page.locator("aside").evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    expect(sidebarBackground).toMatch(/rgb\(9,\s*7,\s*8\)/);

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
        selectedTheme: "phoenix",
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
      path: "e2e/evidence/phoenix-dark-static.png",
      fullPage: true,
    });
  });

  test("honours reduced-motion without removing the representative phoenix frame", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?theme=phoenix", { waitUntil: "domcontentloaded" });

    const environment = page.locator(
      "[data-theme-environment='phoenix-reign']",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");
    await expect(page.locator("[data-phoenix-environment] canvas")).toBeVisible();
    await page.screenshot({
      path: "e2e/evidence/phoenix-reduced-motion.png",
      fullPage: true,
    });
  });

  test("reapplies phoenix color aliases when mode changes", async ({ page }) => {
    await page.goto(phoenixFixtureUrl, {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "phoenix");
    await expect(provider).toHaveAttribute("data-mode", "dark");

    const readAliases = (): Promise<{
      background: string;
      namespacedBackground: string;
    }> =>
      page.evaluate(() => ({
        background:
          document.documentElement.style.getPropertyValue(
            "--color-background",
          ),
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
      path: "e2e/evidence/phoenix-light-static.png",
      fullPage: true,
    });
  });

  test("renders hero title with phoenix fiery gradient styling", async ({ page }) => {
    await page.goto(phoenixFixtureUrl, { waitUntil: "domcontentloaded" });
    const heroTitle = page.locator("main h1, [class*='minimizedTitle']").first();
    await expect(heroTitle).toBeVisible();
    await expect(page.locator(".theme-wrapper")).toHaveAttribute("data-theme", "phoenix");
  });

  test("can be selected from the header theme menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("button", { name: "Theme Selection" }).click();
    await page.getByRole("button", { name: "Phoenix" }).click();

    await expect(page.locator(".theme-wrapper")).toHaveAttribute(
      "data-theme",
      "phoenix",
    );
    await expect(
      page.locator("[data-theme-environment='phoenix-reign']"),
    ).toHaveAttribute("data-theme-environment-owner", "phoenix");
  });

  test("keeps Cosmic as the default when Phoenix is not selected", async ({
    page,
  }) => {
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
