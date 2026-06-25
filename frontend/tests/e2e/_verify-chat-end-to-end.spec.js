// SPDX-License-Identifier: MIT
// Purpose: One-off production end-to-end chat verification for sinchat.delqhi.com.
// Docs: frontend/tests/e2e/README.doc.md
//
// This file is intentionally prefixed with an underscore so it does NOT run
// during normal CI E2E suites. It is executed manually to verify the chat
// against the live production deployment.
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import {
  login,
  getOrCreateWorkspace,
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";

const SITE = {
  name: "OpenSIN-Chat",
  url: "https://sinchat.delqhi.com",
};

const SCREENSHOT_DIR = "/Users/jeremy/dev/OpenSIN-Chat/screenshots";

const now = Date.now();
const MARKER = `Verifiziere Chat Sichtbarkeit: Hallo OpenSIN! [E2E-${now}]`;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const saveScreenshot = async (page, label) => {
  ensureDir(SCREENSHOT_DIR);
  const fileName = `${SITE.name.replace(/\s+/g, "-")}_chat-verify_${label}_${now}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
};

const saveReport = (data) => {
  ensureDir(SCREENSHOT_DIR);
  const filePath = path.join(SCREENSHOT_DIR, `${SITE.name.replace(/\s+/g, "-")}_chat-verify-report_${now}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
};

const scrollToBottom = async (page) => {
  // Try to scroll the React Virtuoso list container.
  const virtuoso = page.locator('[data-virtuoso-scroller="true"]').first();
  if (await virtuoso.isVisible().catch(() => false)) {
    await virtuoso.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(300);
  }
  // Fallback: scroll the outer chat-history div.
  const history = page.locator("#chat-history").first();
  if (await history.isVisible().catch(() => false)) {
    await history.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(300);
  }
  // Last resort: scroll window.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
};

const waitForVisible = async (page, locator, attempts = 8) => {
  for (let i = 0; i < attempts; i++) {
    if (await locator.isVisible().catch(() => false)) return true;
    await scrollToBottom(page);
    await page.waitForTimeout(500);
  }
  return await locator.isVisible().catch(() => false);
};

const textExistsInPage = async (page, text) => {
  const pageText = await page.locator("body").textContent().catch(() => "");
  return pageText.includes(text);
};

const getChatHistoryHtml = async (page) => {
  const history = page.locator("#chat-history").first();
  return await history.innerHTML().catch(() => "");
};

const getChatHistoryText = async (page) => {
  const history = page.locator("#chat-history").first();
  return await history.textContent().catch(() => "");
};

async function createThread(request, token, slug) {
  const response = await request.post(`${SITE.url}/api/workspace/${slug}/thread/new`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {},
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create thread: ${response.status()} ${body}`);
  }
  const { thread, error } = await response.json();
  if (error) throw new Error(`Thread creation error: ${error}`);
  if (!thread?.slug) throw new Error("Thread response did not contain a slug");
  return thread.slug;
}

async function getOrCreateThread(request, token, slug) {
  const response = await request.get(`${SITE.url}/api/workspace/${slug}/threads`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.ok()) {
    const { threads } = await response.json();
    if (threads && threads.length > 0) return threads[0].slug;
  }
  return createThread(request, token, slug);
}

test.describe("production chat end-to-end verification", () => {
  const consoleErrors = [];
  const networkFailures = [];
  const networkResponses = [];
  const testLog = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    networkFailures.length = 0;
    networkResponses.length = 0;
    testLog.length = 0;

    await page.setViewportSize({ width: 1280, height: 900 });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push({ type: "pageerror", text: err.message });
    });

    page.on("requestfailed", (req) => {
      networkFailures.push({
        url: req.url(),
        method: req.method(),
        failure: req.failure()?.errorText || "unknown",
      });
    });

    page.on("response", (res) => {
      networkResponses.push({
        url: res.url(),
        method: res.request().method(),
        status: res.status(),
      });
    });
  });

  test("sends message and waits for AI response on production", async ({ page, request }) => {
    const result = {
      status: "FAIL",
      site: SITE.name,
      url: SITE.url,
      workspaceSlug: null,
      threadSlug: null,
      userMessage: MARKER,
      userMessageVisible: false,
      userMessageInDom: false,
      aiResponded: false,
      isErrorBubble: false,
      assistantTextPreview: "",
      chatHistoryText: "",
      chatHistoryHtml: "",
      screenshots: [],
      consoleErrors: [],
      networkFailures: [],
      chatApiResponses: [],
      chatApiFailures: [],
      non2xxChatApi: [],
      testLog: [],
      timestamp: new Date().toISOString(),
    };

    try {
      testLog.push({ step: "start", url: SITE.url, marker: MARKER });

      // 1. Authenticate
      const token = await login(request);
      result.workspaceSlug = await getOrCreateWorkspace(request, token);
      testLog.push({ step: "login", workspace: result.workspaceSlug });

      // 2. Create or reuse a thread so the chat page is in thread mode.
      result.threadSlug = await getOrCreateThread(request, token, result.workspaceSlug);
      testLog.push({ step: "thread", threadSlug: result.threadSlug });

      // 3. Seed browser session
      await seedSession(page, token);
      await mockOnboardingCheck(page);

      // 4. Navigate to the thread chat page
      const chatUrl = `${SITE.url}/workspace/${result.workspaceSlug}/t/${result.threadSlug}`;
      await page.goto(chatUrl, { waitUntil: "networkidle", timeout: 60000 });
      await assertAppLoaded(page);
      testLog.push({ step: "navigate", url: page.url() });

      await page.locator("#primary-prompt-input").first().waitFor({ state: "visible", timeout: 30000 });
      const screenshotBefore = await saveScreenshot(page, "01-before-send");
      result.screenshots.push(screenshotBefore);
      testLog.push({ step: "before-send", screenshot: screenshotBefore });

      // 5. Type and send unique message
      const promptInput = page.locator("#primary-prompt-input");
      await promptInput.fill(MARKER);
      await promptInput.press("Enter");
      testLog.push({ step: "send", message: MARKER });

      // Wait for the chat API to be called or a response to appear.
      await page.waitForTimeout(1000);
      await scrollToBottom(page);

      // 6. Wait for the user's own message to appear
      const userMessageLocator = page.getByText(MARKER, { exact: false });
      result.userMessageVisible = await waitForVisible(page, userMessageLocator, 10);
      result.userMessageInDom = await textExistsInPage(page, MARKER);
      testLog.push({ step: "user-message-visible", visible: result.userMessageVisible, inDom: result.userMessageInDom });

      // 7. Wait for a response indicator (loading, error bubble, or actual assistant text)
      const responseLocator = page.locator(".dot-falling, .bg-red-50, [data-testid='assistant-message'], .assistant-message, .message-assistant").first();
      const responseIndicatorVisible = await waitForVisible(page, responseLocator, 12);
      testLog.push({ step: "response-indicator-visible", visible: responseIndicatorVisible });

      // Give the LLM more time to stream text.
      await page.waitForTimeout(10000);
      await scrollToBottom(page);
      await page.waitForTimeout(500);

      // 8. Analyze the response
      const errorBubble = page.locator(".bg-red-50").first();
      result.isErrorBubble = await errorBubble.isVisible().catch(() => false);
      const assistantMessage = page.locator("[data-testid='assistant-message'], .assistant-message, .message-assistant, .dot-falling").first();
      const assistantText = await assistantMessage.textContent().catch(() => "");
      result.assistantTextPreview = assistantText.slice(0, 500);
      result.aiResponded = assistantText.trim().length > 0 && !result.isErrorBubble;
      result.chatHistoryText = await getChatHistoryText(page);
      result.chatHistoryHtml = await getChatHistoryHtml(page);

      testLog.push({
        step: "response-analysis",
        isErrorBubble: result.isErrorBubble,
        assistantTextPreview: result.assistantTextPreview,
        aiResponded: result.aiResponded,
        chatHistoryTextPreview: result.chatHistoryText.slice(0, 500),
      });

      // 9. Final screenshot
      await scrollToBottom(page);
      const screenshotFinal = await saveScreenshot(page, "02-final-chat");
      result.screenshots.push(screenshotFinal);
      testLog.push({ step: "final-screenshot", screenshot: screenshotFinal });

      // 10. Network analysis
      result.chatApiResponses = networkResponses.filter(
        (r) => r.url.includes("/api/workspace/") && (r.url.includes("/chats") || r.url.includes("/stream-chat")),
      );
      result.chatApiFailures = networkFailures.filter(
        (f) => f.url.includes("/api/workspace/") && (f.url.includes("/chats") || f.url.includes("/stream-chat")),
      );
      result.non2xxChatApi = result.chatApiResponses.filter((r) => r.status >= 400);
      result.consoleErrors = consoleErrors;
      result.networkFailures = networkFailures.filter((n) => !n.url.includes("favicon"));
      result.testLog = testLog;

      // 11. Determine PASS/FAIL
      result.status = result.userMessageVisible && result.aiResponded ? "PASS" : "FAIL";

      const reportPath = saveReport(result);
      testLog.push({ step: "report", reportPath });

      // 12. Assertions
      expect(result.userMessageVisible, "User message must be visible in chat area").toBe(true);
      expect(result.aiResponded, "AI must respond with visible assistant text").toBe(true);
      expect(result.non2xxChatApi.length, "No chat API non-2xx responses").toBe(0);
    } catch (e) {
      // On any error, save whatever we have captured so far.
      result.chatApiResponses = networkResponses.filter(
        (r) => r.url.includes("/api/workspace/") && (r.url.includes("/chats") || r.url.includes("/stream-chat")),
      );
      result.chatApiFailures = networkFailures.filter(
        (f) => f.url.includes("/api/workspace/") && (f.url.includes("/chats") || f.url.includes("/stream-chat")),
      );
      result.non2xxChatApi = result.chatApiResponses.filter((r) => r.status >= 400);
      result.consoleErrors = consoleErrors;
      result.networkFailures = networkFailures.filter((n) => !n.url.includes("favicon"));
      result.testLog = testLog;
      result.error = e.message;
      result.status = "FAIL";
      try {
        const screenshotError = await saveScreenshot(page, "03-error-state");
        result.screenshots.push(screenshotError);
      } catch {
        // Browser may already be closed.
      }
      saveReport(result);
      throw e;
    }
  });
});
