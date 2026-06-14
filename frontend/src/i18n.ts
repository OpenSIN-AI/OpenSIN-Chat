// SPDX-License-Identifier: MIT
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { defaultNS, resources } from "./locales/resources";

i18next
  // https://github.com/i18next/i18next-browser-languageDetector/blob/9efebe6ca0271c3797bc09b84babf1ba2d9b4dbb/src/index.js#L11
  .use(initReactI18next) // Initialize i18n for React
  .use(LanguageDetector)
  .init({
    fallbackLng: "en",
    // Normalize region-specific locales (e.g. "en-US" -> "en") so they
    // resolve against the registered base-language resources instead of
    // falling through to raw translation keys.
    load: "languageOnly",
    supportedLngs: Object.keys(resources),
    nonExplicitSupportedLngs: true,
    // `load: "languageOnly"` is not reliably honored by the language
    // detector (see i18next/i18next#2222), so we explicitly strip the
    // region subtag from the detected language here as a safeguard.
    detection: {
      convertDetectedLanguage: (lng: string) => lng.split("-")[0],
    },
    debug: import.meta.env.DEV,
    defaultNS,
    resources,
    lowerCaseLng: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
