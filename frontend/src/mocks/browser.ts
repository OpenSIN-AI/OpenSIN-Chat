// SPDX-License-Identifier: MIT
// DEV-ONLY: Browser-side MSW setup.
// Imported conditionally from main.tsx only when import.meta.env.DEV === true
// and localStorage flag `anythingllm_pdf_mock` === "true".
import { setupWorker } from "msw/browser";
import { pdfAnalysisHandlers } from "./pdfAnalysisHandlers";

export const worker = setupWorker(...pdfAnalysisHandlers);

export async function startMockWorker() {
  await worker.start({
    onUnhandledRequest: "bypass", // pass-through everything not mocked
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });
}
