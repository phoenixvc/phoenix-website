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

test.describe("Cosmic Frontier theme contract", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (error) => console.error("pageerror:", error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        console.error("browser console:", message.text());
      }
    });
  });

  test("owns the active environment and exposes a deterministic static fixture", async ({
    page,
  }) => {
    const diagnostics = captureThemeDiagnostics(page);
    await page.goto("/?cosmic-fixture=static", {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "cosmic-frontier");

    const environment = page.locator(
      "[data-theme-environment='cosmic-starfield']",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-owner",
      "cosmic-frontier",
    );
    await expect(environment).toHaveAttribute(
      "data-theme-environment-fallback",
      "false",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");

    const starfield = page.locator("[data-starfield]");
    await expect(starfield).toHaveAttribute("data-quality-tier", "low");
    await expect(starfield).toHaveAttribute("data-seed", "20260809");
    await expect(starfield).toHaveAttribute("data-time", "12000");
    await expect(starfield.locator("canvas")).toBeVisible();

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
        selectedTheme: "cosmic-frontier",
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
  });

  test("rejects a stale unsupported selection and restores the canonical default", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem("theme_name", JSON.stringify("classic")),
    );
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-theme", "cosmic-frontier");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("theme_name") ?? "null") as
              | string
              | null,
        ),
      )
      .toBe("cosmic-frontier");
  });

  test("honours reduced-motion without removing the representative frame", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const environment = page.locator(
      "[data-theme-environment='cosmic-starfield']",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");
    await expect(page.locator("[data-starfield] canvas")).toBeVisible();
  });

  test("reapplies the canonical color aliases when mode changes", async ({
    page,
  }) => {
    await page.goto("/?cosmic-fixture=static", {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-mode", "dark");

    const readAliases = (): Promise<{
      background: string;
      namespacedBackground: string;
      hover: string;
      active: string;
      fallbackBackground: string;
      fallbackHover: string;
      fallbackActive: string;
    }> =>
      page.evaluate(() => {
        const provider = document.querySelector<HTMLElement>(".theme-wrapper");
        const fallback = getComputedStyle(provider!);
        return {
          background:
            document.documentElement.style.getPropertyValue(
              "--color-background",
            ),
          namespacedBackground: document.documentElement.style.getPropertyValue(
            "--theme-colors-background",
          ),
          hover:
            document.documentElement.style.getPropertyValue("--color-hover"),
          active:
            document.documentElement.style.getPropertyValue("--color-active"),
          fallbackBackground: fallback.getPropertyValue("--color-background"),
          fallbackHover: fallback.getPropertyValue("--color-hover"),
          fallbackActive: fallback.getPropertyValue("--color-active"),
        };
      });

    const darkAliases = await readAliases();
    await page.getByRole("button", { name: "Toggle theme" }).click();

    await expect(provider).toHaveAttribute("data-mode", "light");
    await expect.poll(readAliases).toEqual({
      background: "218 57.14285714285723% 97.25490196078432%",
      namespacedBackground: "218 57.14285714285723% 97.25490196078432%",
      hover: "233 100% 96.66666666666667%",
      active: "254 68.75% 93.72549019607843%",
      fallbackBackground: "218 57.14285714285723% 97.25490196078432%",
      fallbackHover: "233 100% 96.66666666666667%",
      fallbackActive: "254 68.75% 93.72549019607843%",
    });
    expect(darkAliases.background).not.toBe(
      "218 57.14285714285723% 97.25490196078432%",
    );
  });
});
