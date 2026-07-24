// SPDX-License-Identifier: MIT
// Purpose: Real-English translation mock for react-i18next in tests.
// Docs: src/test/i18nMock.doc.md
import enTranslations from "../locales/en/common.js";

// Resolve a dot-notation translation key against the English translation tree.
function getTranslation(obj, key) {
  return key.split(".").reduce((acc, part) => acc?.[part], obj);
}

// Replace simple {{variable}} placeholders with options.
function interpolate(value, options) {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, placeholder) => {
    const replacement = options?.[placeholder];
    return replacement !== undefined
      ? String(replacement)
      : `{{${placeholder}}}`;
  });
}

// Returns a react-i18next mock object that uses the real English translations.
// This keeps existing tests that query by rendered text passing after the
// i18next localization migration. Import it in a test file and pass it to
// vi.mock("react-i18next", () => createI18nMock()).
export function createI18nMock() {
  const t = (key, options) => {
    const value = getTranslation(enTranslations, key);
    if (typeof value === "string") return interpolate(value, options);
    if (typeof options === "string") return options;
    return key;
  };

  return {
    useTranslation: () => ({
      t,
      i18n: { language: "en", changeLanguage: () => {} },
    }),
    Trans: ({ children, defaults }) => children || defaults || null,
    I18nextProvider: ({ children }) => children,
    initReactI18next: { type: "3rdParty", init: () => {} },
  };
}
