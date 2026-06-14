# End-to-end tests for the upload/attachment flow

**Docs:** `upload-attachment.spec.js`

This directory contains Playwright end-to-end tests for the OpenSIN-Chat
frontend. The first spec covers the chat attachment flow through the v0-style
`AddSourceMenu`.

## What is tested

- Log in to the running backend via `/api/request-token` (single-user mode,
  username `admin`, empty password).
- Seed the browser session with the auth token and English locale.
- Navigate to a real workspace chat page.
- Open the attachment menu (`data-testid="attach-item-trigger"`).
- Select "Upload from computer".
- Upload a small PNG fixture from `tests/fixtures/test-image.png`.
- Verify the attachment appears in the prompt input area and shows the file
  name.

## Test fixtures

- `tests/fixtures/test-image.png` — a 1×1 transparent PNG used for image
  attachments. Images are attached client-side without a backend upload, so the
  test can verify the UI state immediately.

## How to run

```bash
cd frontend
npx playwright test tests/e2e/upload-attachment.spec.js
```

## Caveats

- The running backend must have at least one workspace for the test to pick a
  slug via `/api/workspaces`.
- The test uses the standard Playwright pattern of calling `setInputFiles` on
  the hidden `input#dnd-chat-file-uploader` instead of interacting with the OS
  file picker.
