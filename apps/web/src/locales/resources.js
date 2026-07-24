// SPDX-License-Identifier: MIT
// This file no longer eagerly imports locale data.
// Locale bundles are loaded lazily via dynamic import() inside i18n.ts using
// i18next-resources-to-backend. Only metadata lives here so tree-shaking keeps
// locale files out of the initial JS bundle.
//
// To add a language: create src/locales/<iso>/common.js and add the code below.
// Run `npm run verify:translations` in frontend/ to validate completeness.

export const defaultNS = "common";

/** ISO codes for all supported locales. */
export const supportedLngs = ["en", "de"];
