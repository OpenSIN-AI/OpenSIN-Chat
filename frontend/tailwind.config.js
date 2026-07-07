// SPDX-License-Identifier: MIT
// Issue #8/#10: Compatibility shim for IDE Tailwind IntelliSense.
// The actual configuration is in src/index.css via @theme and @source.
// This file is NOT loaded by the build.
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
