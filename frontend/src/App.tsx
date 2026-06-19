// SPDX-License-Identifier: MIT
import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { I18nextProvider, useTranslation } from "react-i18next";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { swrConfig } from "@/utils/swrFetcher";
import i18n from "./i18n";
import { attachLanguageDomSync } from "@/utils/htmlLang";

import { PfpProvider } from "./PfpContext";
import { LogoProvider } from "./LogoContext";
import { FullScreenLoader } from "./components/Preloader";
import { ThemeProvider } from "./ThemeContext";
import { PWAModeProvider } from "./PWAContext";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp";
import ImageLightbox from "@/components/ImageLightbox";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "./components/ErrorBoundaryFallback";

function SkipToContentLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-sky-500 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}

export default function App() {
  const location = useLocation();
  useEffect(() => {
    attachLanguageDomSync();
  }, []);
  return (
    <ErrorBoundary
      FallbackComponent={ErrorBoundaryFallback}
      onError={console.error}
      resetKeys={[location.pathname]}
    >
      <ThemeProvider>
        <PWAModeProvider>
          <Suspense fallback={<FullScreenLoader />}>
            <SWRConfig value={swrConfig}>
              <AuthProvider>
                <LogoProvider>
                  <PfpProvider>
                    <I18nextProvider i18n={i18n}>
                      <SkipToContentLink />
                      <main id="main-content">
                        <ErrorBoundary
                          FallbackComponent={ErrorBoundaryFallback}
                          onError={console.error}
                        >
                          <Outlet />
                        </ErrorBoundary>
                      </main>
                      <div aria-live="polite" aria-atomic="false">
                        <ToastContainer />
                      </div>
                      <KeyboardShortcutsHelp />
                      <ImageLightbox />
                    </I18nextProvider>
                  </PfpProvider>
                </LogoProvider>
              </AuthProvider>
            </SWRConfig>
          </Suspense>
        </PWAModeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
