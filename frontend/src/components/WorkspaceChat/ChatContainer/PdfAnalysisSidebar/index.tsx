// SPDX-License-Identifier: MIT
/**
 * Purpose: Right sidebar panel that embeds the PDF analysis tools.
 * Docs: PdfAnalysisSidebar/index.doc.md
 */
import ChatSidebar, { useChatSidebar } from "../ChatSidebar";
import { PdfAnalysisPanel } from "@/pages/PdfAnalysis";

export default function PdfAnalysisSidebar() {
  const { activeSidebar } = useChatSidebar();
  const sidebarOpen = activeSidebar === "pdf-analysis";
  return (
    <ChatSidebar isOpen={sidebarOpen} minWidth={420} defaultWidth={520}>
      <div className="w-full h-full bg-theme-bg-container flex flex-col overflow-hidden">
        <PdfAnalysisPanel isSidebar />
      </div>
    </ChatSidebar>
  );
}
