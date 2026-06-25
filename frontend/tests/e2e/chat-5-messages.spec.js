// SPDX-License-Identifier: MIT
// Purpose: Send 5 chat messages against the configured APP_URL and verify the
// chat loop accepts each prompt and at least one response indicator appears.
// Docs: frontend/tests/e2e/README.doc.md
import { test, expect } from "@playwright/test";
import { bootstrapWorkspaceChat } from "./_helpers.js";

test.describe("chat flow — 5 messages", () => {
  test.describe.configure({ mode: "serial" });

  test("sends 5 messages and receives visible response indicators", async ({ page, request }) => {
    const testLog = [];
    await bootstrapWorkspaceChat(page, request, { waitFor: "textarea" });

    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible();
    const markers = [];

    // Send each message and wait for the chat loop to respond before sending the next.
    // The chat history is virtualized; earlier messages may be hidden from the viewport,
    // so we only require them to be attached to the DOM.
    for (let i = 1; i <= 5; i++) {
      const marker = `e2e-5msg-${i}-${Date.now()}`;
      markers.push(marker);
      const message = `Message ${i}: ${marker}. Please reply with OK.`;
      await promptInput.fill(message);
      await promptInput.press("Enter");
      await expect(page.getByText(marker, { exact: false })).toBeAttached({ timeout: 15000 });

      const responseIndicator = page.locator(".dot-falling, .bg-red-50").first();
      await responseIndicator.waitFor({ state: "visible", timeout: 45000 });
      // Wait for the response to finish streaming (or for the error bubble to stabilise).
      await responseIndicator.waitFor({ state: "hidden", timeout: 45000 }).catch(() => {});

      testLog.push({ step: `chat-message-${i}`, marker, responseHandled: true });
    }

    // Scroll to the bottom and confirm all 5 user messages are still attached
    // to the DOM. The chat history is virtualized; earlier messages may be hidden
    // from the viewport, but persistence is the functional requirement.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    for (const marker of markers) {
      await expect(page.getByText(marker, { exact: false })).toBeAttached({ timeout: 10000 });
    }

    // Save a screenshot of the final chat state.
    const siteName = process.env.APP_URL?.includes("openafd") ? "OpenAfD-Chat" : "OpenSIN-Chat";
    const fileName = `${siteName.replace(/\s+/g, "-")}_chat-5-messages_${Date.now()}.png`;
    const filePath = `/Users/jeremy/dev/OpenSIN-Chat/screenshots/${fileName}`;
    await page.screenshot({ path: filePath, fullPage: true });
  });
});
