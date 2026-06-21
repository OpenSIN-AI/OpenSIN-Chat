// SPDX-License-Identifier: MIT
import { useState, useCallback } from "react";
import i18n from "@/i18n";
import { resources as languages } from "@/locales/resources";

export function useLanguageOptions() {
  const supportedLanguages = Object.keys(languages);
  const languageNames = new Intl.DisplayNames(supportedLanguages, {
    type: "language",
  });
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");

  const changeLanguage = useCallback((newLang = "en") => {
    if (!Object.keys(languages).includes(newLang)) return false;
    setCurrentLanguage(newLang);
    i18n.changeLanguage(newLang);
    return true;
  }, []);

  return {
    currentLanguage,
    supportedLanguages,
    getLanguageName: (lang = "en") => languageNames.of(lang),
    changeLanguage,
  };
}
