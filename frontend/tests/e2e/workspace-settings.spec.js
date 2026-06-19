// SPDX-License-Identifier: MIT
// Purpose: E2E test for workspace settings tabs — verifies VectorDatabase,
// ChatSettings, and AgentConfig tabs load without crashing and that the
// save button (CTAButton type="submit") appears when a setting changes.
// Docs: frontend/tests/e2e/README.doc.md
//
// Reuses an existing workspace from the server to avoid the workspace-creation
// rate limiter (5/hour per IP).
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

const WS_SETTINGS_TABS = [
  ["Vector Database", "vector-database"],
  ["Chat Settings", "chat-settings"],
  ["Agent Config", "agent-config"],
];

test.describe("workspace settings tabs", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;

  test.beforeAll(async ({ request }) => {
    token = await login(request);

    // Reuse the first existing workspace — no creation, no rate-limiter hit
    const response = await request.get("/api/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const { workspaces } = await response.json();
    expect(workspaces.length).toBeGreaterThan(0);
    slug = workspaces[0].slug;
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  for (const [label, tab] of WS_SETTINGS_TABS) {
    test(`workspace settings tab "${label}" loads without crash`, async ({
      page,
    }) => {
      await page.goto(`/workspace/${slug}/settings/${tab}`, {
        waitUntil: "networkidle",
      });
      await assertAppLoaded(page);

      // The settings page renders tab navigation links — verify the page
      // mounted by checking for the tab bar (NavLink items)
      await expect(
        page.locator("nav a, .flex.gap-x-10 a").first(),
      ).toBeVisible({ timeout: 10000 });

      // No React error boundary
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: /Unexpected Application Error/i,
        }),
      ).toHaveCount(0);
    });
  }

  test("changing openAiHistory shows the save button (CTAButton submit)", async ({
    page,
  }) => {
    await page.goto(`/workspace/${slug}/settings/chat-settings`, {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    // The ChatSettings form has an input with name="openAiHistory"
    const historyInput = page.locator('input[name="openAiHistory"]');
    await expect(historyInput).toBeVisible({ timeout: 10000 });

    // Read the current value, then change it to trigger hasChanges
    const currentValue = await historyInput.inputValue();
    const newValue = String(Math.max(1, (parseInt(currentValue, 10) || 20) + 1));
    await historyInput.fill(newValue);

    // The save button (CTAButton type="submit") should now appear.
    // i18n: common.updateWorkspace → "Update Workspace" / "Workspace aktualisieren"
    const saveBtn = page.getByRole("button", {
      name: /update workspace|workspace aktualisieren/i,
    });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });

    // Verify it is a submit button (the CTAButton type="submit" fix)
    await expect(saveBtn).toHaveAttribute("type", "submit");

    // Click save — should not crash. We don't assert success because the
    // backend may reject depending on LLM config; we only verify the button
    // is wired and the form submits without a JS error.
    await saveBtn.click().catch(() => {});
    await page.waitForTimeout(2000);

    // Page should still be loaded (no crash)
    await assertAppLoaded(page);
  });

  test("workspace settings tab navigation works", async ({ page }) => {
    await page.goto(`/workspace/${slug}/settings/general-appearance`, {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    // Tab labels from i18n: workspaces—settings.chat/vector/agent
    // EN: "Chat Settings", "Vector Database", "Agent Configuration"
    // DE: "Chat-Einstellungen", "Vektordatenbank", "Agentenkonfiguration"

    // Click the Chat Settings tab link
    const chatTab = page.getByRole("link", {
      name: /chat settings|chat-einstellungen/i,
    });
    await expect(chatTab).toBeVisible({ timeout: 10000 });
    await chatTab.click();

    // URL should change to chat-settings
    await page.waitForURL(/chat-settings/, { timeout: 10000 });

    // Click the Vector Database tab
    const vectorTab = page.getByRole("link", {
      name: /vector database|vektordatenbank/i,
    });
    await expect(vectorTab).toBeVisible({ timeout: 10000 });
    await vectorTab.click();
    await page.waitForURL(/vector-database/, { timeout: 10000 });

    // Click the Agent Config tab
    const agentTab = page.getByRole("link", {
      name: /agent configuration|agentenkonfiguration/i,
    });
    await expect(agentTab).toBeVisible({ timeout: 10000 });
    await agentTab.click();
    await page.waitForURL(/agent-config/, { timeout: 10000 });

    // No crash after navigating all tabs
    await assertAppLoaded(page);
  });
});
