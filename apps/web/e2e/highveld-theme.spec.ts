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

const highveldFixtureUrl = "/?theme=highveld&highveld-fixture=static";

test.describe("Highveld theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("owns the plateau environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto(highveldFixtureUrl, { waitUntil: "domcontentloaded" });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "highveld");

    const environment = page.locator(
      "[data-theme-environment='highveld-plateau']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "highveld",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const plateau = page.locator("[data-highveld-plateau]");
    await expect(plateau).toHaveAttribute("data-quality-tier", "low");
    await expect(plateau).toHaveAttribute("data-seed", "20260814");
    await expect(plateau).toHaveAttribute("data-time", "9170");
    await expect(plateau).toHaveAttribute("data-frame-budget", "0");
    await expect(plateau).toHaveAttribute("data-highveld-zoom", "1");
    await expect(plateau).toHaveAttribute("data-highveld-focus", "overview");
    await expect
      .poll(async () =>
        Number(await plateau.getAttribute("data-highveld-node-count")),
      )
      .toBeGreaterThan(10);

    // The signature of the theme: this seed is a storm seed, and the fixture
    // timestamp is inside a seeded strike, so the representative frame carries
    // a live bolt rather than an empty sky.
    await expect(plateau).toHaveAttribute("data-weather", "stormfront");
    await expect(plateau).toHaveAttribute("data-highveld-bolt", "active");
    // Dark mode enters the day cycle at dusk; 9170ms into it is still dusk.
    await expect(plateau).toHaveAttribute("data-highveld-phase", "dusk");

    await expect(plateau.locator("canvas")).toBeVisible();
    await expect(plateau.locator("svg")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Portfolio Ridge" }),
    ).toBeVisible();

    const headerBackground = await page
      .locator("header")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(headerBackground).toMatch(/rgba?\(15,\s*18,\s*22/);
    const sidebarBackground = await page
      .locator("aside")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(sidebarBackground).toMatch(/rgb\(15,\s*18,\s*22\)/);

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
        selectedTheme: "highveld",
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
        /ThemeAcquisitionManager|component variant|theme initialization failed|invalid color|addColorStop/i.test(
          message,
        ),
      ),
    ).toEqual([]);

    await page.screenshot({
      path: "e2e/evidence/highveld-dark-static.png",
      fullPage: true,
    });
  });

  test("renders the same seeded frame identically on every run", async ({
    page,
  }) => {
    // Determinism is the contract the Theme Designer will depend on: same seed
    // and timestamp must produce the same pixels, twice in a row.
    const grab = async (): Promise<string> => {
      await page.goto(highveldFixtureUrl, { waitUntil: "domcontentloaded" });
      const plateau = page.locator("[data-highveld-plateau]");
      await expect(plateau).toHaveAttribute("data-time", "9170");
      await expect(plateau.locator("canvas")).toBeVisible();
      // Pan initials are canvas text, so the webfont has to have landed before
      // the frames are comparable. Font availability is an environment input,
      // not scene state.
      await page.evaluate(() => document.fonts.ready);
      return plateau
        .locator("canvas")
        .evaluate((canvas) =>
          (canvas as HTMLCanvasElement).toDataURL("image/png"),
        );
    };

    const first = await grab();
    const second = await grab();
    expect(first.length).toBeGreaterThan(1000);
    expect(first).toBe(second);
  });

  test("honours reduced-motion without removing the representative frame", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?theme=highveld", { waitUntil: "domcontentloaded" });

    const environment = page.locator(
      "[data-theme-environment='highveld-plateau']",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");
    await expect(page.locator("[data-highveld-plateau] canvas")).toBeVisible();
    await page.screenshot({
      path: "e2e/evidence/highveld-reduced-motion.png",
      fullPage: true,
    });
  });

  test("reapplies highveld colour aliases when mode changes", async ({
    page,
  }) => {
    await page.goto(highveldFixtureUrl, { waitUntil: "domcontentloaded" });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "highveld");
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
      path: "e2e/evidence/highveld-light-static.png",
      fullPage: true,
    });
  });

  test("zooms into a koppie from the plateau navigation", async ({ page }) => {
    await page.goto(highveldFixtureUrl, { waitUntil: "domcontentloaded" });
    const plateau = page.locator("[data-highveld-plateau]");
    await page.getByRole("button", { name: "Portfolio Ridge" }).click();
    await expect(plateau).toHaveAttribute(
      "data-highveld-focus",
      "portfolio-koppie",
    );
    await expect(plateau).toHaveAttribute("data-highveld-zoom", "2.35");
    await page.getByRole("button", { name: "Whole plateau" }).click();
    await expect(plateau).toHaveAttribute("data-highveld-focus", "overview");
    await expect(plateau).toHaveAttribute("data-highveld-zoom", "1");
  });

  test("can be selected from the header theme menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("button", { name: "Theme Selection" }).click();
    await page.getByRole("button", { name: "Highveld", exact: true }).click();

    await expect(page.locator(".theme-wrapper")).toHaveAttribute(
      "data-theme",
      "highveld",
    );
    await expect(
      page.locator("[data-theme-environment='highveld-plateau']"),
    ).toHaveAttribute("data-theme-environment-owner", "highveld");
  });

  test("keeps Cosmic as the default when Highveld is not selected", async ({
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
