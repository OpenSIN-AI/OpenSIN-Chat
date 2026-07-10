// SPDX-License-Identifier: MIT
// Locale resources are loaded lazily per language via dynamic import() so that
// only the active locale ends up in the initial JS bundle (~5 KB instead of ~10 KB
// for all locales combined). Additional locales load on-demand in <200 ms.
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { supportedLngs, defaultNS } from "./locales/resources";

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.js`),
    ),
  )
  .init({
    fallbackLng: "de",
    load: "languageOnly",
    supportedLngs,
    nonExplicitSupportedLngs: true,
    detection: {
      // OpenSIN Chat is a German-first app. Only honor an explicit user choice
      // saved in localStorage; otherwise fall back to German instead of the
      // browser language so the UI stays consistent (no EN/DE mix).
      order: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) => lng.split("-")[0],
    },
    debug: import.meta.env.DEV,
    ns: [defaultNS],
    defaultNS,
    lowerCaseLng: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
