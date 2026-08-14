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

test.describe("Phoenix theme contract", () => {
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
    await page.addInitScript(() => {
      localStorage.setItem("theme_name", JSON.stringify("phoenix"));
    });
    await page.goto("/?phoenix-fixture=static", {
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
    await expect(phoenixEnv.locator("canvas")).toBeVisible();

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
  });

  test("honours reduced-motion without removing the representative frame", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme_name", JSON.stringify("phoenix"));
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const environment = page.locator(
      "[data-theme-environment='phoenix-reign']",
    );
    await expect(environment).toHaveAttribute("data-motion", "reduced");
    await expect(environment).toHaveAttribute("data-lifecycle", "paused");
    await expect(
      page.locator("[data-phoenix-environment] canvas"),
    ).toBeVisible();
  });

  test("switches between dark and light mode seamlessly", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme_name", JSON.stringify("phoenix"));
    });
    await page.goto("/?phoenix-fixture=static", {
      waitUntil: "domcontentloaded",
    });

    const provider = page.locator(".theme-wrapper");
    await expect(provider).toHaveAttribute("data-mode", "dark");
    await expect(page.locator("[data-phoenix-environment]")).toHaveAttribute(
      "data-mode",
      "dark",
    );

    await page.getByRole("button", { name: "Toggle theme" }).click();

    await expect(provider).toHaveAttribute("data-mode", "light");
    await expect(page.locator("[data-phoenix-environment]")).toHaveAttribute(
      "data-mode",
      "light",
    );
  });
});
