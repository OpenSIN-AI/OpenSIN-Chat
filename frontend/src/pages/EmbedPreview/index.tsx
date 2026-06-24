// SPDX-License-Identifier: MIT
// Purpose: Standalone embed widget preview page
// Docs: Shows a live preview of an embed widget by its UUID
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

export default function EmbedPreview() {
  const { uuid } = useParams<{ uuid: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
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
          Embed Widget Preview
        </h1>
        <p className="text-slate-600 text-sm">
          This is a live preview of your embed widget. The chat widget appears
          in the bottom-right corner of this page.
        </p>
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 font-mono break-all">
            UUID: {uuid}
          </p>
        </div>
      </div>
      <div className="text-xs text-slate-400">
        OpenSIN Chat — Embed Widget Preview
      </div>
    </div>
  );
}
