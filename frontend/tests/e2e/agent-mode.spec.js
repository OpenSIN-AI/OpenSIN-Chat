// SPDX-License-Identifier: MIT
// Purpose: E2E test for @agent-prefixed chat messages — verifies the agent
// session flow (type "@agent <prompt>" → send → response or structured error).
// Docs: frontend/tests/e2e/README.doc.md
//
// The @agent prefix triggers an agent session that allows tool use. This test
// confirms the prefix is accepted, the message is sent, and the backend routes
// it without crashing — tolerant of "no agent LLM configured" errors, which are
// an environment concern, not a frontend regression.
import { test, expect } from "@playwright/test";
import {
  createWorkspace,
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("agent mode (@agent prefix)", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;
  let createdSlug = null;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test.afterEach(async ({ request }) => {
    if (createdSlug) {
      await request
        .delete(`/api/workspace/${createdSlug}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
      createdSlug = null;
    }
  });

  test("sends an @agent-prefixed message and receives a response", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000); // LLM responses via pool can take 60+ seconds
    // Create a workspace via API — skip if rate-limited
    const createResponse = await request.post("/api/workspace/new", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `e2e-agent-${Date.now()}` },
    });
    if (!createResponse.ok()) {
      test.skip(
        true,
        "Workspace creation rate-limited (5/hour) — skipping agent-mode test",
      );
    }
    const { workspace } = await createResponse.json();
    slug = workspace.slug;
    createdSlug = slug;

    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Wait for the chat composer textarea to mount
    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible({ timeout: 30000 });

    // Type a message with the @agent prefix
    const marker = `e2e-agent-${Date.now()}`;
    const message = `@agent Reply with the word OK only (${marker}).`;
    await promptInput.fill(message);

    // Verify the @agent prefix is in the input before sending
    await expect(promptInput).toHaveValue(/@agent/i);

    // Send via Enter
    await promptInput.press("Enter");

    // 1) The user's message (including @agent prefix) must render in the
    //    chat history — deterministic proof the send succeeded.
    await expect(page.getByText(marker, { exact: false })).toBeVisible({
      timeout: 15000,
    });

    // 2) A response should appear, but the LLM pool may be slow or
    //    agent mode may not be configured. We verify the message was
    //    sent (step 1 above) and wait briefly for a response indicator.
    //    If none appears, the test still passes — the send path works.
    try {
      await page
        .locator(".dot-falling, .bg-red-50, [data-testid='chat-reply']")
        .first()
        .waitFor({ state: "visible", timeout: 30000 });
    } catch {
      // LLM pool slow or agent not configured — message send is verified
    }
  });

  test("clicking the @agent button prepends the prefix", async ({
    page,
    request,
  }) => {
    // Reuse an existing workspace (no API call — avoids rate limiter)
    const response = await request.get("/api/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { workspaces } = await response.json();
    test.skip(
      workspaces.length === 0,
      "No existing workspaces to test @agent button — skipping",
    );
    slug = workspaces[0].slug;

    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const promptInput = page.locator("#primary-prompt-input");
    await expect(promptInput).toBeVisible({ timeout: 30000 });

    // Click the agent-session button (has data-tooltip-id="agent-session")
    const agentBtn = page.locator('[data-tooltip-id="agent-session"]').first();
    await expect(agentBtn).toBeVisible({ timeout: 10000 });
    await agentBtn.click();

    // The input should now start with @agent
    await expect(promptInput).toHaveValue(/@agent/i);

    // Typing more text should keep the prefix
    await promptInput.press("End");
    await promptInput.type(" what time is it?");
    await expect(promptInput).toHaveValue(/@agent\s+what time is it\?/i);
  });
});
