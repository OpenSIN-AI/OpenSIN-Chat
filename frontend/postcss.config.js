// SPDX-License-Identifier: MIT
// Issue #460: Tailwind CSS v3 → v4 migration.
// @tailwindcss/postcss replaces the tailwindcss PostCSS plugin.
// The @theme block in index.css replaces tailwind.config.js theme config.
// @source directives replace the content array.
// @import "tailwindcss" replaces @tailwind base/components/utilities.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
