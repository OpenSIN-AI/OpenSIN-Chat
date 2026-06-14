// SPDX-License-Identifier: MIT
// DEV-ONLY: Browser-side MSW setup.
// Imported conditionally from main.tsx only when import.meta.env.DEV === true
// and localStorage flag `anythingllm_pdf_mock` === "true".
import { setupWorker } from "msw/browser";
import { pdfAnalysisHandlers } from "./pdfAnalysisHandlers";
import { auditHandlers } from "./auditHandlers";

// Audit handlers are only registered when the audit flag is set, so the PDF
// mock keeps working independently.
const auditEnabled =
  typeof localStorage !== "undefined" &&
  localStorage.getItem("anythingllm_ws_mock") === "true";

export const worker = setupWorker(
  ...pdfAnalysisHandlers,
  ...(auditEnabled ? auditHandlers : [])
);

export async function startMockWorker() {
  await worker.start({
    onUnhandledRequest: "bypass", // pass-through everything not mocked
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });
}
