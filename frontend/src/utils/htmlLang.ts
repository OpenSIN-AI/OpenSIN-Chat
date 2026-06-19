// SPDX-License-Identifier: MIT
import i18next from "./i18n";

export function syncHtmlLang(lng) {
  const normalized = (lng || i18next.language || "en").split("-")[0];
  document.documentElement.setAttribute("lang", normalized);
}

export function syncDocumentTitle() {
  const titleKey = i18next.t("page.title");
  document.title =
    typeof titleKey === "string" && titleKey.length > 0
      ? titleKey
      : "OpenSIN Chat";
  const description = i18next.t("page.description");
  if (typeof description === "string" && description.length > 0) {
    const meta =
      document.querySelector('meta[name="description"]') ||
      document.head.appendChild(document.createElement("meta"));
    meta.setAttribute("name", "description");
    meta.setAttribute("content", description);
  }
}

export function attachLanguageDomSync() {
  syncHtmlLang(i18next.language);
  syncDocumentTitle();
  i18next.on("languageChanged", syncHtmlLang);
  i18next.on("languageChanged", syncDocumentTitle);
}
