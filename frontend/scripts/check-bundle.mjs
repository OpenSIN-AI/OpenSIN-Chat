// SPDX-License-Identifier: MIT
// Purpose: Isolated esbuild bundle check for AccountMenu and other components
// that transitively import static assets (.png/.svg).
// Docs: docs/admin/onboarding.md
import { fileURLToPath, URL } from "node:url";
import { build } from "esbuild";

const srcRoot = fileURLToPath(new URL("../src", import.meta.url));

// Entry points that previously emitted the ".png" loader error.
const entryPoints = [
  fileURLToPath(
    new URL("../src/components/Footer/AccountMenu.tsx", import.meta.url),
  ),
];

try {
  const result = await build({
    entryPoints,
    bundle: true,
    write: false, // check-only: we don't emit artifacts
    format: "esm",
    target: "esnext",
    jsx: "automatic",
    logLevel: "info",
    // Resolve the "@" alias the same way vite.config.js / vitest.config.js do.
    alias: { "@": srcRoot },
    // Treat React et al. as external so we only validate the component graph,
    // not third-party packages.
    packages: "external",
    loader: {
      // The fix: configure loaders for the asset types the app imports.
      ".png": "dataurl",
      ".jpg": "dataurl",
      ".jpeg": "dataurl",
      ".gif": "dataurl",
      ".svg": "dataurl",
      ".webp": "dataurl",
    },
  });

  const warnings = result.warnings ?? [];
  if (warnings.length > 0) {
    console.warn(`[check-bundle] completed with ${warnings.length} warning(s).`);
  } else {
    console.log("[check-bundle] OK — no loader errors, no warnings.");
  }
} catch (err) {
  console.error("[check-bundle] esbuild bundling failed:");
  console.error(err);
  process.exit(1);
}
