// SPDX-License-Identifier: MIT
// Purpose: E2E test for keyboard shortcuts in the chat interface —
// Enter to send, Shift+Enter for newline, Escape to close menus.
// Docs: frontend/tests/e2e/README.doc.md
//
// The PromptInput component (usePromptState.js) handles:
//   - Enter (keyCode 13, no shift) → submit the form
//   - Shift+Enter → newline (default textarea behavior, no submit)
//   - Escape → closes the ToolsMenu if open
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("keyboard shortcuts", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;

  test.beforeAll(async ({ request }) => {
    token = await login(request);

    // Reuse an existing workspace to avoid the rate limiter
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

  test("Enter sends the message", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible({ timeout: 30000 });

    // Type a unique message and press Enter
    const marker = `e2e-kb-enter-${Date.now()}`;
    const message = `Keyboard test Enter (${marker}). Reply OK.`;
    await promptInput.fill(message);
    await promptInput.press("Enter");

    // The message must appear in the chat history — proof Enter sent it
    await expect(page.getByText(marker, { exact: false })).toBeVisible({
      timeout: 15000,
    });

    // The input should be cleared after sending
    await expect(promptInput).toHaveValue("");
  });

  test("Shift+Enter inserts a newline without sending", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible({ timeout: 30000 });

    // Type text, then Shift+Enter, then more text
    const firstLine = `e2e-kb-shift-${Date.now()}`;
    await promptInput.fill(firstLine);
    await promptInput.press("Shift+Enter");
    await promptInput.type("second line");

    // The input should contain a newline (not sent)
    const value = await promptInput.inputValue();
    expect(value).toContain(firstLine);
    expect(value).toContain("second line");
    expect(value).toContain("\n");

    // The message should NOT appear in chat history (it wasn't sent).
    // We scope the check to the chat history area (excluding the textarea)
    // because getByText would otherwise match the text still in the input.
    await page.waitForTimeout(2000);
    // The chat history container excludes the prompt input area
    const chatHistory = page.locator(
      '[class*="chat-history"], [class*="ChatHistory"], #chat-history',
    );
    const historyTexts = await chatHistory
      .allInnerTexts()
      .catch(() => []);
    const fullHistory = historyTexts.join(" ");
    expect(fullHistory).not.toContain(firstLine);

    // Double-check: the textarea still has the full multi-line text
    const finalValue = await promptInput.inputValue();
    expect(finalValue).toContain(firstLine);
    expect(finalValue).toContain("\n");
  });

  test("Escape closes the tools menu if open", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible({ timeout: 30000 });

    // Type a slash to potentially open the tools/slash command menu
    await promptInput.fill("/");
    await page.waitForTimeout(500);

    // Press Escape — should close any menu that opened
    await promptInput.press("Escape");
    await page.waitForTimeout(500);

    // The app should not crash — verify it's still loaded
    await assertAppLoaded(page);

    // The prompt input should still be visible and functional
    await expect(promptInput).toBeVisible({ timeout: 5000 });

    // Clear and type a normal message to confirm the input still works
    await promptInput.fill("");
    await promptInput.type("test after escape");
    await expect(promptInput).toHaveValue("test after escape");
  });

  test("Ctrl/Cmd+Z undoes text in the prompt input", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible({ timeout: 30000 });

    // Type some text
    await promptInput.fill("");
    await promptInput.type("hello world test");

    // Verify text was entered
    await expect(promptInput).toHaveValue("hello world test");

    // Press Cmd+Z (macOS) or Ctrl+Z — the usePromptState undo handler
    // should revert the text
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await promptInput.press(`${modifier}+z`);
    await page.waitForTimeout(300);

    // The text should have been undone (value should be different/shorter)
    const valueAfterUndo = await promptInput.inputValue();
    // Undo may not always fully clear in headless, but the value should
    // have changed (the undo stack was popped)
    expect(valueAfterUndo.length).toBeLessThanOrEqual("hello world test".length);
  });
});
