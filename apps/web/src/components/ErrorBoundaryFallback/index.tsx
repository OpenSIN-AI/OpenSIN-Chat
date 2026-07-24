// SPDX-License-Identifier: MIT
import { NavLink } from "react-router";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { useState } from "react";
import type { FallbackProps } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import logger from "@/utils/logger";

export default function ErrorBoundaryFallback({
  error: rawError,
  resetErrorBoundary,
}: FallbackProps) {
  // FallbackProps types `error` as `unknown`; cast once so the rest of the
  // component can safely access Error properties.
  const error = rawError as Error;
  const [copied, setCopied] = useState<boolean>(false);
  const { t } = useTranslation();

  const copyErrorDetails = async () => {
    const details = {
      url: window.location.href,
      error: error?.name || t("errorBoundary.unknownError"),
      message: error?.message || t("errorBoundary.noMessage"),
      stack: error?.stack || t("errorBoundary.noStackTrace"),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    const formattedDetails = `
${t("errorBoundary.errorReport")}
============
${t("errorBoundary.timestamp")}: ${details.timestamp}
URL: ${details.url}
${t("errorBoundary.userAgent")}: ${details.userAgent}

${t("errorBoundary.error")}: ${details.error}
${t("errorBoundary.message")}: ${details.message}

${t("errorBoundary.stackTrace")}:
${details.stack}
    `.trim();

    try {
      await navigator.clipboard.writeText(formattedDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy error details:", err);
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-screen bg-theme-bg-primary text-theme-text-primary gap-4 p-4 md:p-8 w-full"
    >
      <h1 className="text-xl md:text-2xl font-bold text-center">
        {t("errorBoundary.title")}
      </h1>
      <p className="text-theme-text-secondary text-center px-4">
        {error?.message}
      </p>
      {import.meta.env.DEV && (
        <div className="w-full max-w-4xl">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={copyErrorDetails}
              className="flex items-center gap-2 px-3 py-1.5 bg-theme-bg-secondary text-theme-text-primary rounded hover:bg-theme-sidebar-item-hover transition-all duration-200 text-xs font-medium"
              aria-label={
                copied
                  ? t("errorBoundary.copiedAria")
                  : t("errorBoundary.copyAria")
              }
            >
              {copied ? (
                <>
                  <Check
                    className="w-3.5 h-3.5"
                    weight="bold"
                    aria-hidden="true"
                  />
                  {t("errorBoundary.copied")}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  {t("errorBoundary.copyDetails")}
                </>
              )}
            </button>
          </div>
          <pre className="w-full text-xs md:text-sm text-theme-text-secondary bg-theme-bg-secondary p-4 md:p-6 rounded-lg overflow-x-auto overflow-y-auto max-h-[60vh] md:max-h-[70vh] whitespace-pre-wrap break-words font-mono border border-theme-border shadow-sm">
            {error?.stack}
          </pre>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mt-4 w-full md:w-auto">
        <button
          type="button"
          onClick={resetErrorBoundary}
          aria-label={t("errorBoundary.reset")}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-bg-secondary text-theme-text-primary rounded-lg hover:bg-theme-sidebar-item-hover transition-all duration-300 w-full md:w-auto"
        >
          <ArrowClockwise className="w-4 h-4" aria-hidden="true" />
          {t("errorBoundary.reset")}
        </button>
        <NavLink
          to="/"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-bg-secondary text-theme-text-primary rounded-lg hover:bg-theme-sidebar-item-hover transition-all duration-300 w-full md:w-auto"
        >
          <House className="w-4 h-4" aria-hidden="true" />
          {t("errorBoundary.home")}
        </NavLink>
      </div>
    </div>
  );
}
