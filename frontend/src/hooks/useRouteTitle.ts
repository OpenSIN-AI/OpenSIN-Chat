// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";

const APP_NAME = "OpenSIN Chat";

function resolveTitleKey(pathname: string): string | null {
  if (pathname === "/") return "page.titles.home";
  if (pathname.startsWith("/login")) return "page.titles.login";
  if (pathname.startsWith("/sso/")) return "page.titles.sso";
  if (pathname.startsWith("/onboarding")) return "page.titles.onboarding";
  // /docs/:slug pages manage their own titles in Docs/index.tsx.
  if (pathname === "/docs") return "page.titles.docs";
  if (pathname.startsWith("/docs/")) return null;
  if (pathname === "/mail") return "page.titles.emailCenter";
  if (pathname.startsWith("/pdf-analysis")) return "page.titles.pdfAnalysis";
  if (pathname.match(/^\/workspace\/[^/]+\/settings\//))
    return "page.titles.workspaceSettings";
  if (pathname.startsWith("/workspace/")) return "page.titles.workspace";
  if (pathname.startsWith("/settings/")) return "page.titles.settings";
  return "page.titles.notFound";
}

export default function useRouteTitle() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const key = resolveTitleKey(location.pathname);
    if (!key) return;
    const pageName =
      key === "page.titles.emailCenter" ? t(key, "E-Mail Zentrale") : t(key);
    const appName = t("page.title") || APP_NAME;
    if (key === "page.titles.home" || pageName === appName) {
      document.title = appName;
    } else {
      document.title = `${pageName} — ${appName}`;
    }
  }, [location.pathname, t, i18n.language]);
}
