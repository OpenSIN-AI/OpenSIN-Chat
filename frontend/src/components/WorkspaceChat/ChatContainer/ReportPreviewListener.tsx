// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import { REPORT_PREVIEW_EVENT } from "@/utils/chat/agent";
import { API_BASE } from "@/utils/constants";
import { useChatSidebar } from "./ChatSidebar";

/**
 * Must live inside ChatSidebarProvider to access openPreview().
 * Listens for the reportPreview window event dispatched by agent.js and
 * opens the PreviewSidebar automatically.
 */
export default function ReportPreviewListener() {
  const { openPreview } = useChatSidebar();
  useEffect(() => {
    // The server sends absolute "/api/..." paths. When the frontend is served
    // from a different origin than the API (VITE_API_BASE is a full URL),
    // rewrite the "/api" prefix to the configured API base so the iframe
    // loads from the API host instead of the frontend origin.
    function resolveUrl(url: string): string {
      if (!url) return url;
      if (API_BASE !== "/api" && url.startsWith("/api/")) {
        return `${API_BASE}${url.slice(4)}`;
      }
      return url;
    }
    function onReportPreview(e: CustomEvent) {
      if (!e.detail) return;
      openPreview({
        title: e.detail.title || "Bericht",
        type: e.detail.type || "pdf",
        downloadUrl: resolveUrl(e.detail.downloadUrl) || null,
        versions: (e.detail.versions || []).map((v: any) => ({
          ...v,
          downloadUrl: resolveUrl(v.downloadUrl),
        })),
        content: null,
      });
    }
    window.addEventListener(
      REPORT_PREVIEW_EVENT,
      onReportPreview as EventListener,
    );
    return () =>
      window.removeEventListener(
        REPORT_PREVIEW_EVENT,
        onReportPreview as EventListener,
      );
  }, [openPreview]);
  return null;
}
