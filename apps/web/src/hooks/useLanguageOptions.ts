// SPDX-License-Identifier: MIT
import { useState, useCallback, useMemo } from "react";
import i18n from "@/i18n";
import { supportedLngs } from "@/locales/resources";

export function useLanguageOptions() {
  const supportedLanguages = useMemo(() => supportedLngs, []);
  const languageNames = useMemo(
    () => new Intl.DisplayNames(supportedLanguages, { type: "language" }),
    [supportedLanguages],
  );
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");

  const changeLanguage = useCallback((newLang = "en") => {
    if (!supportedLngs.includes(newLang)) return false;
    setCurrentLanguage(newLang);
    i18n.changeLanguage(newLang);
    return true;
  }, []);

  const getLanguageName = useCallback(
    (lang = "en") => languageNames.of(lang),
    [languageNames],
  );

  return useMemo(
    () => ({
      currentLanguage,
      supportedLanguages,
      getLanguageName,
      changeLanguage,
    }),
    [currentLanguage, supportedLanguages, getLanguageName, changeLanguage],
  );
}
