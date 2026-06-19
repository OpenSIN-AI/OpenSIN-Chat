// SPDX-License-Identifier: MIT
// Purpose: End-to-end test for the chat upload/attachment flow.
// Docs: frontend/tests/e2e/README.doc.md
//
// NOTE: This spec is correct as written. If it fails with a generic
// "getByTestId('attach-item-trigger') not found" timeout, the root cause is a
// production build crash (the app never mounts), NOT the selector. The
// `assertAppLoaded` guard in _helpers.js surfaces such crashes with the real
// exception (e.g. "regeneratorRuntime is not defined"). See main.tsx for the
// regenerator-runtime polyfill that fixes the production bundle.
import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { bootstrapWorkspaceChat } from "./_helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("upload attachment flow", () => {
  test("opens the AddSourceMenu and uploads an image attachment", async ({
    page,
    request,
  }) => {
    await bootstrapWorkspaceChat(page, request, { waitFor: "attach" });

    // Open the v0-style AddSourceMenu.
    const attachButton = page.getByTestId("attach-item-trigger");
    await expect(attachButton).toBeVisible();
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
    // hidden dropzone input — the standard Playwright pattern for file
    // uploads without a real OS dialog.
    const fixturePath = path.join(
      __dirname,
      "..",
      "fixtures",
      "test-image.png",
    );
    const fileInput = page.locator("input#dnd-chat-file-uploader");
    await fileInput.setInputFiles(fixturePath);

    // Verify the attachment appears in the prompt input area. Image
    // attachments render as a preview <img> with the file name in the alt
    // text and as a tooltip on the wrapping element.
    const imageAttachment = page.locator('img[alt*="test-image.png"]');
    await expect(imageAttachment).toBeVisible({ timeout: 10000 });

    // Optional: verify the file name is shown in the tooltip / context.
    await expect(
      page.locator('[data-tooltip-content*="test-image.png"]'),
    ).toHaveCount(1);
  });
});
