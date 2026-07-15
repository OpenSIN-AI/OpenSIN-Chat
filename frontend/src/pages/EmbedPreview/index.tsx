// SPDX-License-Identifier: MIT
// Purpose: Standalone embed widget preview page
// Docs: Shows a live preview of an embed widget by its UUID
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";

export default function EmbedPreview() {
  const { t } = useTranslation();
  const { uuid } = useParams<{ uuid: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const scriptHost = import.meta.env.DEV
    ? "http://localhost:3000"
    : window.location.origin;
  const serverHost = import.meta.env.DEV
    ? "http://localhost:3001"
    : window.location.origin;

  useEffect(() => {
    if (!uuid || !containerRef.current) return;

    // Remove any existing widget script and its injected DOM elements.
    // The widget creates a plain <div> appended to document.body and renders
    // a React app into it using "allm-" prefixed CSS classes. Without this
    // cleanup, re-renders (e.g. UUID change) leave orphaned widget instances.
    const existing = document.getElementById("embed-widget-script");
    if (existing) existing.remove();
    document
      .querySelectorAll('body > div:not(#root):not([class*="min-h-screen"])')
      .forEach((el) => {
        if (el.querySelector("[class*='allm-']")) el.remove();
      });

    const script = document.createElement("script");
    script.id = "embed-widget-script";
    script.setAttribute("data-embed-id", uuid);
    script.setAttribute("data-base-api-url", `${serverHost}/api/embed`);
    script.src = `${scriptHost}/embed/opensin-chat-widget.min.js`;
    script.onerror = () => {
      setScriptError(t("embedPreview.failedToLoad"));
    };
    script.onload = () => {
      setScriptError(null);
    };
    setScriptError(null);
    containerRef.current.appendChild(script);
    return () => {
      const s = document.getElementById("embed-widget-script");
      if (s) s.remove();
      // Also remove the widget's injected DOM elements on unmount.
      document
        .querySelectorAll('body > div:not(#root):not([class*="min-h-screen"])')
        .forEach((el) => {
          if (el.querySelector("[class*='allm-']")) el.remove();
        });
    };
  }, [uuid, scriptHost, serverHost]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8"
    >
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          {t("embedPreview.title")}
        </h1>
        <p className="text-slate-600 text-sm">
          {t("embedPreview.description")}
        </p>
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 font-mono break-all">
            {t("embedPreview.uuid")}: {uuid}
          </p>
        </div>
      </div>
      {scriptError && (
        <div className="max-w-2xl w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{scriptError}</p>
        </div>
      )}
      <div className="text-xs text-slate-400">
        {t("embedPreview.browserTitle")}
      </div>
    </div>
  );
}
