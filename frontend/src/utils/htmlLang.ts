// SPDX-License-Identifier: MIT
import i18next from "../i18n";
import dayjs from "dayjs";
import "dayjs/locale/de";

const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "dv", "yi"];

export function syncHtmlLang(lng) {
  const normalized = (lng || i18next.language || "en").split("-")[0];
  document.documentElement.setAttribute("lang", normalized);
  document.documentElement.setAttribute(
    "dir",
    RTL_LANGUAGES.includes(normalized) ? "rtl" : "ltr",
  );
  dayjs.locale(normalized);
}

export function syncDocumentTitle() {
  const titleKey = i18next.t("page.title");
  // i18next returns the lookup key verbatim ("page.title") when no translation
  // is loaded. Treat that as a missing translation and fall back to the default.
  const isTranslated =
    typeof titleKey === "string" &&
    titleKey.length > 0 &&
    titleKey !== "page.title";
  document.title = isTranslated ? titleKey : "OpenSIN Chat";
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
  i18next.on("languageChanged", syncHtmlLang);
  // syncDocumentTitle is intentionally NOT called here and NOT re-run on
  // languageChanged: route-specific titles (e.g. /docs/:slug) are managed by
  // their own useEffect hooks, and the global default title is already set in
  // index.html. Calling syncDocumentTitle would race with and overwrite those
  // route-specific title effects.
}
