// SPDX-License-Identifier: MIT
// Purpose: End-to-end test for the chat upload/attachment flow.
// Docs: frontend/tests/e2e/README.doc.md
import { test, expect } from "playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Authenticate against the running backend and return the JWT token.
 *
 * Uses the same credentials as the existing sidebar-tabs repro script:
 * username "admin" with no password. This matches the single-user mode the
 * dev server is running in.
 */
async function login(request) {
  const response = await request.post("/api/request-token", {
    data: { username: "admin", password: "" },
  });
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  expect(token).toBeTruthy();
  return token;
}

/**
 * Create a workspace via the API so the test has a real workspace slug to
 * navigate to. The home page does not auto-create a workspace on initial load,
 * so we set one up explicitly.
 */
async function createWorkspace(request, token) {
  const response = await request.post("/api/workspace/new", {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `e2e-upload-${Date.now()}` },
  });
  expect(response.ok()).toBeTruthy();
  const { workspace } = await response.json();
  expect(workspace?.slug).toBeTruthy();
  return workspace.slug;
}

/**
 * Seed the browser session with the auth token and preferred locale before
 * loading the application so the PrivateRoute lets us through.
 *
 * Using `page.addInitScript` guarantees the localStorage values are present
 * before any application code reads them, avoiding an unauthenticated flash or
 * redirect.
 */
async function seedSession(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("openafd_authToken", t);
    window.localStorage.setItem(
      "openafd_user",
      JSON.stringify({ username: "admin" }),
    );
    window.localStorage.setItem("openafd-demo-unlocked", "1");
    window.localStorage.setItem("i18nextLng", "en");
  }, token);
}

/**
 * Intercept the frontend onboarding check so the PrivateRoute does not
 * redirect to the onboarding flow. This works around a dev-server issue where
 * `POST /api/onboarding` returns 200 but does not persist the onboarding flag.
 */
async function mockOnboardingCheck(page) {
  await page.route("/api/onboarding", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ onboardingComplete: true }),
    });
  });
}

test.describe("upload attachment flow", () => {
  test("opens the AddSourceMenu and uploads an image attachment", async ({
    page,
    request,
  }) => {
    const token = await login(request);
    const slug = await createWorkspace(request, token);
    await seedSession(page, token);
    await mockOnboardingCheck(page);

    // Navigate to the chat page for a real workspace.
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });

    // Wait for the chat composer to be ready.
    const attachButton = page.getByTestId("attach-item-trigger");
    await expect(attachButton).toBeVisible();

    // Open the v0-style AddSourceMenu.
    await attachButton.click();
    const menu = page.getByRole("menu", { name: /add files/i });
    await expect(menu).toBeVisible();

    // Click "Upload from computer" to trigger the hidden file input.
    const uploadMenuItem = page.getByRole("menuitem", {
      name: /Upload from computer/i,
    });
    await expect(uploadMenuItem).toBeVisible();
    await uploadMenuItem.click();

    // Simulate the native file picker by setting the file directly on the
    // hidden dropzone input. This is the standard Playwright pattern for
    // testing file uploads without a real OS dialog.
    const fixturePath = path.join(
      __dirname,
      "..",
      "fixtures",
      "test-image.png",
    );
    const fileInput = page.locator("input#dnd-chat-file-uploader");
    await fileInput.setInputFiles(fixturePath);

    // Verify the attachment appears in the prompt input area.
    const attachment = page
      .locator("[class*='bg-theme-attachment']")
      .filter({ hasText: /test-image\.png/i })
      .first();
    await expect(attachment).toBeVisible({ timeout: 10000 });

    // Optional: verify the file name is shown in the attachment list.
    await expect(attachment).toContainText("test-image.png");
  });
});
