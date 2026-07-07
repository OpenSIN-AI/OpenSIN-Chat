// SPDX-License-Identifier: MIT
// Issue #460: Tailwind CSS v3 → v4 migration.
// This file is kept as a compatibility shim for tools that still expect
// a tailwind.config.js (e.g. IDE Tailwind IntelliSense extensions).
// The actual configuration now lives in src/index.css via @theme and
// @source directives (the v4 way). This file is NOT loaded by the build.
//
// To be removed once all tooling supports the CSS-based config.

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Theme is now defined in src/index.css via @theme {}
  // This is kept empty for IntelliSense compatibility only.
  theme: {
    extend: {},
  },
  plugins: [],
};
