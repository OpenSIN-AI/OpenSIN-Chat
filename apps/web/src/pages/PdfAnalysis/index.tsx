// SPDX-License-Identifier: MIT
// Purpose: PDF analysis page for uploading documents, extracting facts, and cross-checking claims.
// Docs: index.doc.md
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/Sidebar";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import { SidebarToggleProvider } from "@/components/Sidebar/SidebarToggle";
import { ChatSidebarProvider } from "@/components/WorkspaceChat/ChatContainer/ChatSidebar";
import Sidebars from "@/components/WorkspaceChat/ChatContainer/Sidebars";
import CrossCheckPanel from "./CrossCheckPanel";
import CorpusPanel from "./CorpusPanel";
import { JobsPanel } from "./components/JobsPanel";
import { FactsPanel } from "./components/FactsPanel";
import { TabButton } from "./components/TabButton";

export function PdfAnalysisPanel({
  isSidebar = false,
}: {
  isSidebar?: boolean;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("jobs");
  const [crossCheckFactIds, setCrossCheckFactIds] = useState<string[]>([]);

  return (
    <section
      className={`flex-1 overflow-y-auto ${isSidebar ? "p-4" : "p-6"}`}
      aria-label={t("pdfAnalysis.panel.title")}
    >
      <header className="flex flex-col gap-2 mb-6">
        <h1 className="text-xl font-semibold text-theme-text-primary text-balance">
          {t("pdfAnalysis.panel.title")}
        </h1>
        <p className="text-sm text-theme-text-secondary leading-relaxed">
          {t("pdfAnalysis.panel.description")}
        </p>
        <nav
          className={`flex items-center gap-1 shrink-0 mt-2 ${isSidebar ? "flex-wrap" : ""}`}
          aria-label={t("pdfAnalysis.panel.tabJobs")}
        >
          <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")}>
            {t("pdfAnalysis.panel.tabJobs")}
          </TabButton>
          <TabButton active={tab === "facts"} onClick={() => setTab("facts")}>
            {t("pdfAnalysis.panel.tabFacts")}
          </TabButton>
          <TabButton
            active={tab === "crosscheck"}
            onClick={() => setTab("crosscheck")}
          >
            {t("pdfAnalysis.panel.tabCrossCheck")}
          </TabButton>
          <TabButton active={tab === "corpus"} onClick={() => setTab("corpus")}>
            {t("pdfAnalysis.panel.tabCorpus")}
          </TabButton>
        </nav>
      </header>
      {tab === "jobs" ? (
        <JobsPanel isSidebar={isSidebar} />
      ) : tab === "facts" ? (
        <FactsPanel
          onCrossCheck={(factId) => {
            setCrossCheckFactIds([factId]);
            setTab("crosscheck");
          }}
        />
      ) : tab === "crosscheck" ? (
        <CrossCheckPanel prefillFactIds={crossCheckFactIds} />
      ) : (
        <CorpusPanel />
      )}
    </section>
  );
}

export default function PdfAnalysisPage() {
  return (
    <SidebarToggleProvider>
      <ChatSidebarProvider>
        <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
          <LeftSidebarIconBar />
          <Sidebar />
          <PdfAnalysisPanel />
          <Sidebars workspace={null} />
        </div>
      </ChatSidebarProvider>
    </SidebarToggleProvider>
  );
}

// Re-export sub-components for backward compatibility
export { PdfFileInput } from "./components/PdfFileInput";
export { TabButton as _TabButton } from "./components/TabButton";
export { JobsPanel as _JobsPanel } from "./components/JobsPanel";
export { FactsPanel as _FactsPanel } from "./components/FactsPanel";
