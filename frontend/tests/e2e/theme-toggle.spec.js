// SPDX-License-Identifier: MIT
// Purpose: E2E test for the theme toggle — click the theme segment in the
// account menu and verify data-theme changes on <html> and persists in
// localStorage under "opensin_theme".
// Docs: frontend/tests/e2e/README.doc.md
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("theme toggle", () => {
  test.describe.configure({ mode: "serial" });

  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("switching to dark theme updates data-theme and localStorage", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Open the account menu — target the non-compact trigger in the sidebar
    // footer (contains "admin" text), not the compact one in LeftSidebarIconBar
    // (which has aria-label="Profile" and is intercepted by the nav).
    const menuTrigger = page
      .locator('button[aria-haspopup="menu"]')
      .filter({ hasText: /admin/i });
    await menuTrigger.waitFor({ state: "visible", timeout: 10000 });
    await menuTrigger.click();

    const popupMenu = page.locator('[role="menu"]').first();
    await expect(popupMenu).toBeVisible({ timeout: 5000 });

    // Click the "Dark" theme button (aria-label="Dark")
    const darkBtn = page.getByRole("button", { name: "Dark", exact: true });
    await expect(darkBtn).toBeVisible({ timeout: 5000 });
    await darkBtn.click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 5000,
    });

    const storedTheme = await page.evaluate(() =>
      window.localStorage.getItem("opensin_theme"),
    );
    expect(storedTheme).toBe("dark");
  });

  test("switching to light theme updates data-theme and localStorage", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const menuTrigger = page
      .locator('button[aria-haspopup="menu"]')
      .filter({ hasText: /admin/i });
    await menuTrigger.waitFor({ state: "visible", timeout: 10000 });
    await menuTrigger.click();

    const popupMenu = page.locator('[role="menu"]').first();
    await expect(popupMenu).toBeVisible({ timeout: 5000 });

    const lightBtn = page.getByRole("button", { name: "Light", exact: true });
    await expect(lightBtn).toBeVisible({ timeout: 5000 });
    await lightBtn.click();

    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "light",
      { timeout: 5000 },
    );

    const storedTheme = await page.evaluate(() =>
      window.localStorage.getItem("opensin_theme"),
    );
    expect(storedTheme).toBe("light");
  });

  test("theme persists across page reload", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    await page.evaluate(() => {
      window.localStorage.setItem("opensin_theme", "light");
    });

    await page.reload({ waitUntil: "networkidle" });
    await assertAppLoaded(page);

    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "light",
      { timeout: 10000 },
    );

    const storedTheme = await page.evaluate(() =>
      window.localStorage.getItem("opensin_theme"),
    );
    expect(storedTheme).toBe("light");
  });
});
