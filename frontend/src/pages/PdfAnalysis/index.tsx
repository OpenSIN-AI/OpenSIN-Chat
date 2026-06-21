// SPDX-License-Identifier: MIT
// Purpose: PDF analysis page for uploading documents, extracting facts, and cross-checking claims.
// Docs: index.doc.md
import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
const ReactMarkdown = React.lazy(() => import("react-markdown"));
import remarkGfm from "remark-gfm";
let docxMod = null;
let jsPDFMod = null;
const docxReady = () =>
  docxMod
    ? Promise.resolve(docxMod)
    : import("docx").then((m) => (docxMod = m));
const jsPDFReady = () =>
  jsPDFMod
    ? Promise.resolve(jsPDFMod)
    : import("jspdf").then((m) => (jsPDFMod = m.default ?? m));
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileDoc } from "@phosphor-icons/react/dist/csr/FileDoc";
import { FileMd } from "@phosphor-icons/react/dist/csr/FileMd";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { ListBullets } from "@phosphor-icons/react/dist/csr/ListBullets";
import Sidebar from "@/components/Sidebar";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import { SidebarToggleProvider } from "@/components/Sidebar/SidebarToggle";
import PdfAnalysis from "@/models/pdfAnalysis";
import { ChatSidebarProvider } from "@/components/WorkspaceChat/ChatContainer/ChatSidebar";
import Sidebars from "@/components/WorkspaceChat/ChatContainer/Sidebars";
import CrossCheckPanel from "./CrossCheckPanel";
import PreLoader from "@/components/Preloader";
import { copyText } from "@/utils/clipboard";
import CorpusPanel from "./CorpusPanel";

function formatEta(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h} h ${m} min`;
}

interface PdfFileInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  multiple?: boolean;
  label: string;
  placeholder: string;
}

/**
 * Replaces the browser-native <input type="file"> "Choose File / No file chosen"
 * text with a fully localised DE button + filename display.
 * The hidden native input still receives the file so form submission works normally.
 */
export function PdfFileInput({
  inputRef,
  multiple = false,
  label,
  placeholder,
}: PdfFileInputProps) {
  const { t } = useTranslation();
  const [fileNames, setFileNames] = useState<string[]>([]);
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileNames(Array.from(e.target.files || []).map((f) => f.name));
  }
  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-theme-sidebar-border bg-theme-bg-container text-sm text-theme-text-primary hover:opacity-80 cursor-pointer"
      >
        <UploadSimple size={14} aria-hidden="true" />
        {label}
      </button>
      <span className="text-sm text-theme-text-secondary truncate max-w-full flex-1 min-w-0">
        {fileNames.length === 0
          ? placeholder
          : fileNames.length === 1
            ? fileNames[0]
            : `${t("pdfAnalysis.panel.filesSelected", { count: fileNames.length })}`}
      </span>
    </div>
  );
}

export function PdfAnalysisPanel({ isSidebar = false }: { isSidebar?: boolean }) {
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
          className={`flex gap-2 mt-2 ${isSidebar ? "flex-wrap" : ""}`}
          aria-label={t("pdfAnalysis.panel.tabJobs")}
        >
          <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")} compact={isSidebar}>
            {t("pdfAnalysis.panel.tabJobs")}
          </TabButton>
          <TabButton active={tab === "facts"} onClick={() => setTab("facts")} compact={isSidebar}>
            {t("pdfAnalysis.panel.tabFacts")}
          </TabButton>
          <TabButton
            active={tab === "crosscheck"}
            onClick={() => setTab("crosscheck")}
            compact={isSidebar}
          >
            {t("pdfAnalysis.panel.tabCrossCheck")}
          </TabButton>
          <TabButton active={tab === "corpus"} onClick={() => setTab("corpus")} compact={isSidebar}>
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

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}

export function TabButton({ active, onClick, children, compact = false }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${compact ? "px-3" : "px-4"} py-1.5 rounded-md text-sm border ${
        active
          ? "bg-theme-bg-secondary text-theme-text-primary border-theme-sidebar-border"
          : "bg-transparent text-theme-text-secondary border-transparent hover:text-theme-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Analysen: Start-Formular + Job-Liste ---------------- */

interface PdfJob {
  id: string;
  documentName: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: {
    chunksTotal: number;
    chunksDone: number;
    phase?: string;
    concurrency?: number;
    etaSeconds?: number;
    pagesPerMinute?: number;
  };
  error?: string;
  [key: string]: any;
}

export function JobsPanel({ isSidebar = false }: { isSidebar?: boolean }) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<PdfJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<PdfJob | null>(null);

  const refresh = useCallback(async () => {
    setJobs((await PdfAnalysis.list()) as PdfJob[]);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <StartForm onStarted={refresh} isSidebar={isSidebar} />
      <section
        aria-label={t("pdfAnalysis.panel.jobsSection")}
        className="flex flex-col gap-3"
      >
        <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
          {t("pdfAnalysis.panel.jobsSection")}
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-theme-text-secondary">
            {t("pdfAnalysis.panel.noJobs")}
          </p>
        )}
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            onShowReport={() => setSelectedJob(job)}
            onCancelled={refresh}
          />
        ))}
      </section>
      {selectedJob && (
        <ReportModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

interface StartFormProps {
  onStarted: () => void;
  isSidebar?: boolean;
}

function StartForm({ onStarted, isSidebar = false }: StartFormProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [task, setTask] = useState("");
  const [reportType, setReportType] = useState("");
  const [factCriteria, setFactCriteria] = useState("");
  const [deepScan, setDeepScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file || !task.trim()) {
      setError(t("pdfAnalysis.panel.fileRequired"));
      return;
    }
    setBusy(true);
    try {
      const uploaded = await PdfAnalysis.upload(file);
      if (uploaded.error) throw new Error(uploaded.error);
      const started = await PdfAnalysis.start({
        pdfPath: uploaded.pdfPath as string,
        task: task.trim(),
        reportType: reportType.trim() || undefined,
        factCriteria: factCriteria.trim() || undefined,
        deepScan,
      });
      if (started.error) throw new Error(started.error);
      setTask("");
      setReportType("");
      setFactCriteria("");
      if (fileRef.current) {
        fileRef.current.value = "";
        fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
      onStarted?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
    >
      <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
        {t("pdfAnalysis.panel.newAnalysis")}
      </h2>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.panel.pdfFile")}
        <PdfFileInput
          inputRef={fileRef}
          label={t("pdfAnalysis.panel.chooseFile")}
          placeholder={t("pdfAnalysis.panel.noFileChosen")}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.panel.taskRequired")}
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder={t("pdfAnalysis.panel.taskPlaceholder")}
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60 leading-relaxed"
        />
      </label>

      <div className={`flex flex-col gap-3 ${isSidebar ? "" : "md:flex-row"}`}>
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.reportType")}
          <input
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            placeholder={t("pdfAnalysis.panel.reportTypePlaceholder")}
            className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
          />
        </label>
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.factCriteria")}
          <input
            value={factCriteria}
            onChange={(e) => setFactCriteria(e.target.value)}
            placeholder={t("pdfAnalysis.panel.factCriteriaPlaceholder")}
            className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
          />
        </label>
      </div>

      <label className={`flex gap-2 text-sm text-theme-text-secondary ${isSidebar ? "items-start" : "items-center"}`}>
        <input
          type="checkbox"
          checked={deepScan}
          onChange={(e) => setDeepScan(e.target.checked)}
          className={`accent-current ${isSidebar ? "mt-0.5" : ""}`}
        />
        <span className={isSidebar ? "leading-snug" : ""}>{t("pdfAnalysis.panel.deepScan")}</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md text-sm font-medium bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 disabled:opacity-50"
        >
          {busy
            ? t("pdfAnalysis.panel.submitBusy")
            : t("pdfAnalysis.panel.submitIdle")}
        </button>
      </div>
    </form>
  );
}

interface JobRowProps {
  job: PdfJob;
  onShowReport: () => void;
  onCancelled: () => void;
}

function JobRow({ job, onShowReport, onCancelled }: JobRowProps) {
  const { t } = useTranslation();
  const { progress = { chunksTotal: 0, chunksDone: 0 }, status } = job;
  const pct =
    progress.chunksTotal > 0
      ? Math.round((progress.chunksDone / progress.chunksTotal) * 100)
      : 0;
  const isActive = status === "pending" || status === "running";

  const PHASE_LABELS: Record<string, string> = {
    init: t("pdfAnalysis.panel.phaseInit"),
    reading: t("pdfAnalysis.panel.phaseReading"),
    analyzing: t("pdfAnalysis.panel.phaseAnalyzing"),
    synthesizing: t("pdfAnalysis.panel.phaseSynthesizing"),
    "verifying-facts": t("pdfAnalysis.panel.phaseVerifying"),
    "storing-facts": t("pdfAnalysis.panel.phaseStoring"),
    done: t("pdfAnalysis.panel.phaseDone"),
  };

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-theme-text-primary truncate">
            {job.documentName}
          </p>
          <p className="text-xs text-theme-text-secondary truncate">
            {job.task}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-1 rounded-md border ${
            status === "completed"
              ? "text-green-400 border-green-400/40"
              : status === "failed"
                ? "text-red-400 border-red-400/40"
                : "text-theme-text-secondary border-theme-sidebar-border"
          }`}
        >
          {status === "completed"
            ? t("pdfAnalysis.panel.statusCompleted")
            : status === "failed"
              ? t("pdfAnalysis.panel.statusFailed")
              : PHASE_LABELS[progress.phase] || status}
        </span>
      </div>

      {isActive && (
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-2 rounded-full bg-theme-bg-container overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="w-[var(--progress-pct)] h-full bg-theme-text-secondary transition-all"
              style={{ "--progress-pct": `${pct}%` } as React.CSSProperties}
            />
          </div>
          <span className="text-xs text-theme-text-secondary w-24 text-right">
            {t("pdfAnalysis.panel.chunksCount", {
              done: progress.chunksDone,
              total: progress.chunksTotal,
            })}
          </span>
          {progress.concurrency != null && (
            <span
              className="text-xs text-theme-text-secondary whitespace-nowrap"
              title={t("pdfAnalysis.panel.agentTitle")}
            >
              · {progress.concurrency}{" "}
              {t("pdfAnalysis.panel.agentsActive", {
                count: progress.concurrency,
              })}
            </span>
          )}
        </div>
      )}

      {isActive &&
        (progress.etaSeconds != null || progress.pagesPerMinute != null) && (
          <p className="text-xs text-theme-text-secondary">
            {progress.concurrency != null &&
              t("pdfAnalysis.panel.agentsActive", {
                count: progress.concurrency,
              })}
            {progress.pagesPerMinute != null &&
              ` · ${t("pdfAnalysis.panel.pagesPerMin", { count: progress.pagesPerMinute })}`}
            {progress.etaSeconds != null &&
              ` · ${t("pdfAnalysis.panel.eta", { time: formatEta(progress.etaSeconds) })}`}
          </p>
        )}

      {job.error && <p className="text-xs text-red-400">{job.error}</p>}

      <div className="flex gap-2">
        {status === "completed" && (
          <button
            type="button"
            onClick={onShowReport}
            className="text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
          >
            {t("pdfAnalysis.panel.showReport")}
          </button>
        )}
        {isActive && (
          <button
            type="button"
            onClick={async () => {
              try {
                await PdfAnalysis.cancel(job.id);
                onCancelled?.();
              } catch (e) {
                console.error(e);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-md text-red-400 border border-red-400/40 hover:opacity-80"
          >
            {t("pdfAnalysis.panel.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * Recursively extracts plain text from React children (strings, numbers,
 * arrays, and elements with nested children).  Needed because
 * String(children) on a React element yields "[object Object]".
 */
function nodeToText(node: React.ReactNode): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (React.isValidElement(node))
    return nodeToText((node.props as any).children);
  return "";
}

/**
 * Parses a Markdown string and returns a flat list of heading objects
 * { level: 1|2|3, text: string, id: string } for the table of contents.
 */
function extractHeadings(markdown = ""): Heading[] {
  const lines = markdown.split("\n");
  const headings: Heading[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)/);
    if (m) {
      const text = m[2].trim();
      headings.push({
        level: m[1].length,
        text,
        id: text
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-"),
      });
    }
  }
  return headings;
}

/**
 * Download the report as plain Markdown (.md).
 */
function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/i, "") + "-bericht.md";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download the report as a DOCX file using the `docx` library.
 * Converts basic Markdown headings and paragraphs — bold/italic are preserved.
 */
async function downloadDocx(filename: string, content: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
    await docxReady();
  const lines = content.split("\n");
  const children = [];

  for (const line of lines) {
    if (!line.trim()) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) {
      children.push(
        new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 }),
      );
    } else if (h2) {
      children.push(
        new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 }),
      );
    } else if (h3) {
      children.push(
        new Paragraph({ text: h3[1], heading: HeadingLevel.HEADING_3 }),
      );
    } else {
      // Inline bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.map((part) => {
        const bold = part.match(/^\*\*(.+)\*\*$/);
        return new TextRun({ text: bold ? bold[1] : part, bold: !!bold });
      });
      children.push(new Paragraph({ children: runs }));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/i, "") + "-bericht.docx";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download the report as a PDF using jsPDF.
 * Renders the text content line by line with basic heading detection.
 */
async function downloadPdf(filename: string, content: string) {
  const JsPDF = await jsPDFReady();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = margin;

  const lines = content.split("\n");

  for (const raw of lines) {
    const h1 = raw.match(/^#\s+(.*)/);
    const h2 = raw.match(/^##\s+(.*)/);
    const h3 = raw.match(/^###\s+(.*)/);
    const stripped = raw.replace(/^#{1,3}\s+/, "").replace(/\*\*/g, "");

    if (!stripped.trim()) {
      y += 4;
      continue;
    }

    if (h1) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
    } else if (h2) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
    } else if (h3) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
    }

    const wrapped = doc.splitTextToSize(stripped, maxW);
    for (const wline of wrapped) {
      if (y + 8 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(wline, margin, y);
      y += h1 ? 9 : h2 ? 7 : h3 ? 6 : 5.5;
    }
  }

  doc.save(filename.replace(/\.pdf$/i, "") + "-bericht.pdf");
}

interface ReportResult {
  totalPages?: number;
  chunks?: number;
  factsStored?: number;
  chunkErrors?: number;
  report?: string;
  error?: string;
  [key: string]: any;
}

interface ReportModalProps {
  job: PdfJob;
  onClose: () => void;
}

function ReportModal({ job, onClose }: ReportModalProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState<ReportResult | null>(null);
  const [tocOpen, setTocOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    PdfAnalysis.result(job.id)
      .then((res) => {
        if (!cancelled) setResult(res as ReportResult);
      })
      .catch((e) => {
        if (!cancelled) console.error(e);
      });
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  // Build table of contents from headings in the report
  const headings = useMemo(
    () => (result?.report ? extractHeadings(result.report) : []),
    [result?.report],
  );

  function scrollToHeading(id: string) {
    const el = contentRef.current?.querySelector(`[data-heading-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddAsSource() {
    // Trigger a workspace-document-upload with the rendered report as text.
    // For now we copy the text to clipboard and show a browser notification
    // until the ManageWorkspace integration is wired up with a real workspace slug.
    if (result?.report) {
      copyText(result.report).then((ok) => {
        if (ok) alert(t("pdfAnalysis.panel.addedAsSourceToast"));
      });
    }
  }

  const reportMd = result?.report ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("pdfAnalysis.panel.reportFor", { name: job.documentName })}
    >
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border shadow-xl">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 p-4 border-b border-theme-sidebar-border shrink-0">
          <h3 className="text-sm font-semibold text-theme-text-primary truncate flex-1 min-w-0">
            {t("pdfAnalysis.panel.reportFor", { name: job.documentName })}
          </h3>

          {/* TOC toggle */}
          {headings.length > 0 && (
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-secondary border border-theme-sidebar-border hover:text-theme-text-primary hover:opacity-80"
              aria-pressed={tocOpen}
              title={t("pdfAnalysis.panel.tocToggle")}
            >
              <ListBullets size={13} aria-hidden="true" />
              {t("pdfAnalysis.panel.tocToggle")}
            </button>
          )}

          {/* Add as source */}
          <button
            type="button"
            onClick={handleAddAsSource}
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
            title={t("pdfAnalysis.panel.addAsSource")}
          >
            <FilePdf size={13} aria-hidden="true" />
            {t("pdfAnalysis.panel.addAsSource")}
          </button>

          {/* Download MD */}
          <button
            type="button"
            onClick={() => downloadMarkdown(job.documentName, reportMd)}
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
            title={t("pdfAnalysis.panel.downloadMd")}
          >
            <FileMd size={13} aria-hidden="true" />
            .md
          </button>

          {/* Download DOCX */}
          <button
            type="button"
            onClick={() =>
              downloadDocx(job.documentName, reportMd).catch(() => {})
            }
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
            title={t("pdfAnalysis.panel.downloadDocx")}
          >
            <FileDoc size={13} aria-hidden="true" />
            .docx
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={() => downloadPdf(job.documentName, reportMd)}
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
            title={t("pdfAnalysis.panel.downloadPdf")}
          >
            <FilePdf size={13} aria-hidden="true" />
            .pdf
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-container"
            aria-label={t("pdfAnalysis.panel.close")}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* ── Body: TOC + Content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Table of Contents */}
          {tocOpen && headings.length > 0 && (
            <nav
              aria-label={t("pdfAnalysis.panel.tocLabel")}
              className="w-56 shrink-0 border-r border-theme-sidebar-border overflow-y-auto p-4"
            >
              <p className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wide mb-3">
                {t("pdfAnalysis.panel.tocLabel")}
              </p>
              <ul className="flex flex-col gap-1">
                {headings.map((h, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => scrollToHeading(h.id)}
                      className={`w-full text-left text-xs text-theme-text-secondary hover:text-theme-text-primary leading-snug py-0.5 ${
                        h.level === 1
                          ? "font-semibold"
                          : h.level === 2
                            ? "pl-3"
                            : "pl-6 opacity-80"
                      }`}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Report content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-5 min-w-0">
            {!result ? (
              <p className="text-sm text-theme-text-secondary">
                {t("pdfAnalysis.panel.loading")}
              </p>
            ) : result.report ? (
              <>
                <p className="text-xs text-theme-text-secondary mb-4">
                  {t("pdfAnalysis.panel.summary", {
                    totalPages: result.totalPages,
                    chunks: result.chunks,
                    factsStored: result.factsStored,
                  })}
                  {result.chunkErrors > 0 &&
                    t("pdfAnalysis.panel.chunkErrors", {
                      count: result.chunkErrors,
                    })}
                </p>
                {/* Rendered Markdown */}
                <Suspense fallback={<PreLoader />}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={
                      {
                        h1: ({ children, ...p }: any) => {
                          const text = nodeToText(children);
                          const id = text
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-");
                          return (
                            <h1
                              data-heading-id={id}
                              className="text-lg font-bold text-theme-text-primary mt-6 mb-3 leading-snug"
                              {...p}
                            >
                              {children}
                            </h1>
                          );
                        },
                        h2: ({ children, ...p }: any) => {
                          const text = nodeToText(children);
                          const id = text
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-");
                          return (
                            <h2
                              data-heading-id={id}
                              className="text-base font-semibold text-theme-text-primary mt-5 mb-2 leading-snug"
                              {...p}
                            >
                              {children}
                            </h2>
                          );
                        },
                        h3: ({ children, ...p }: any) => {
                          const text = nodeToText(children);
                          const id = text
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-");
                          return (
                            <h3
                              data-heading-id={id}
                              className="text-sm font-semibold text-theme-text-primary mt-4 mb-1.5"
                              {...p}
                            >
                              {children}
                            </h3>
                          );
                        },
                        p: ({ children }: any) => (
                          <p className="text-sm text-theme-text-primary leading-relaxed mb-3">
                            {children}
                          </p>
                        ),
                        strong: ({ children }: any) => (
                          <strong className="font-semibold text-theme-text-primary">
                            {children}
                          </strong>
                        ),
                        em: ({ children }: any) => (
                          <em className="italic text-theme-text-secondary">
                            {children}
                          </em>
                        ),
                        ul: ({ children }: any) => (
                          <ul className="list-disc list-inside text-sm text-theme-text-primary mb-3 flex flex-col gap-1 pl-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }: any) => (
                          <ol className="list-decimal list-inside text-sm text-theme-text-primary mb-3 flex flex-col gap-1 pl-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }: any) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                        hr: () => (
                          <hr className="border-theme-sidebar-border my-4" />
                        ),
                        blockquote: ({ children }: any) => (
                          <blockquote className="border-l-2 border-theme-sidebar-border pl-3 text-sm text-theme-text-secondary italic my-3">
                            {children}
                          </blockquote>
                        ),
                        pre: ({ children }: any) => (
                          <pre className="bg-theme-bg-container rounded-md p-3 text-xs font-mono text-theme-text-primary overflow-x-auto my-3">
                            {children}
                          </pre>
                        ),
                        code: ({ className, children, ...props }: any) =>
                          className ? (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code
                              className="px-1 py-0.5 rounded bg-theme-bg-container text-xs font-mono text-theme-text-primary"
                              {...props}
                            >
                              {children}
                            </code>
                          ),
                        table: ({ children }: any) => (
                          <div className="overflow-x-auto my-3">
                            <table className="text-sm w-full border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }: any) => (
                          <th className="text-left text-xs font-semibold text-theme-text-primary border border-theme-sidebar-border px-2 py-1 bg-theme-bg-container">
                            {children}
                          </th>
                        ),
                        td: ({ children }: any) => (
                          <td className="text-xs text-theme-text-primary border border-theme-sidebar-border px-2 py-1">
                            {children}
                          </td>
                        ),
                      } as any
                    }
                  >
                    {result.report}
                  </ReactMarkdown>
                </Suspense>
              </>
            ) : (
              <p className="text-sm text-red-400">
                {result.error || t("pdfAnalysis.panel.noReport")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fakten-Speicher: Suche mit Quellenbezug ---------------- */

interface FactSource {
  documentName: string;
  page: number;
  pageCorrected?: boolean;
}

interface Fact {
  id: string;
  detail: string;
  quote?: string;
  source: FactSource;
  verified?: boolean;
  tags?: string[];
  crossCheck?: any;
}

interface FactsPanelProps {
  onCrossCheck?: (factId: string) => void;
}

export function FactsPanel({ onCrossCheck }: FactsPanelProps) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setFacts(
      (await PdfAnalysis.searchFacts({
        q,
        document: documentFilter,
      })) as Fact[],
    );
    setLoading(false);
  }, [q, documentFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    PdfAnalysis.searchFacts({ q, document: documentFilter })
      .then((res) => {
        if (cancelled) return;
        setFacts(res as Fact[]);
      })
      .catch((e) => {
        if (!cancelled) console.error(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex flex-col md:flex-row gap-3 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pdfAnalysis.panel.searchPlaceholder")}
          aria-label={t("pdfAnalysis.panel.searchAria")}
          className="flex-1 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
        <input
          value={documentFilter}
          onChange={(e) => setDocumentFilter(e.target.value)}
          placeholder={t("pdfAnalysis.panel.documentFilterPlaceholder")}
          aria-label={t("pdfAnalysis.panel.documentFilterAria")}
          className="md:w-64 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md text-sm font-medium bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
        >
          {t("pdfAnalysis.panel.search")}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.searching")}
        </p>
      ) : facts.length === 0 ? (
        <p className="text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.noFacts")}
        </p>
      ) : (
        <ul
          className="flex flex-col gap-3"
          aria-label={t("pdfAnalysis.panel.foundFactsAria")}
        >
          {facts.map((fact) => (
            <li
              key={fact.id}
              className="flex flex-col gap-1 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
            >
              <p className="text-sm text-theme-text-primary leading-relaxed">
                {fact.detail}
              </p>
              {fact.quote && (
                <blockquote className="text-xs text-theme-text-secondary italic border-l-2 border-theme-sidebar-border pl-2">
                  {`"${fact.quote}"`}
                </blockquote>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-theme-text-secondary">
                  {t("pdfAnalysis.panel.sourceLabel", {
                    docName: fact.source.documentName,
                    page: fact.source.page,
                  })}
                  {fact.source.pageCorrected && (
                    <span
                      className="ml-1 text-blue-400"
                      title={t("pdfAnalysis.panel.pageCorrectedAria")}
                    >
                      {t("pdfAnalysis.panel.pageCorrected")}
                    </span>
                  )}
                  {fact.verified === true && (
                    <span className="ml-1 text-green-400">
                      {t("pdfAnalysis.panel.verified")}
                    </span>
                  )}
                  {fact.verified === false && (
                    <span className="ml-1 text-yellow-400">
                      {t("pdfAnalysis.panel.notVerified")}
                    </span>
                  )}
                </span>
                {fact.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md bg-theme-bg-container text-theme-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
                {fact.crossCheck && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md border ${
                      fact.crossCheck.webOverall === "supports"
                        ? "text-green-400 border-green-400/40"
                        : fact.crossCheck.webOverall === "contradicts"
                          ? "text-red-400 border-red-400/40"
                          : "text-yellow-400 border-yellow-400/40"
                    }`}
                    title={t("pdfAnalysis.panel.checkedAt", {
                      date: fact.crossCheck.checkedAt
                        ? new Date(fact.crossCheck.checkedAt).toLocaleString(
                            "de-DE",
                          )
                        : "—",
                    })}
                  >
                    {t("pdfAnalysis.panel.crossChecked")}{" "}
                    {fact.crossCheck.webOverall === "supports"
                      ? t("pdfAnalysis.panel.crossCheckSupports")
                      : fact.crossCheck.webOverall === "contradicts"
                        ? t("pdfAnalysis.panel.crossCheckContradicts")
                        : t("pdfAnalysis.panel.crossCheckInconclusive")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onCrossCheck?.(fact.id)}
                  className="ml-auto text-xs px-2 py-0.5 rounded-md text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
                  aria-label={t("pdfAnalysis.panel.checkSourcesAria", {
                    text: fact.detail.slice(0, 40),
                  })}
                >
                  {t("pdfAnalysis.panel.checkSources")}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await PdfAnalysis.deleteFact(fact.id);
                      search();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="text-xs text-red-400 hover:opacity-80"
                  aria-label={t("pdfAnalysis.panel.deleteFactAria", {
                    text: fact.detail.slice(0, 40),
                  })}
                >
                  {t("pdfAnalysis.panel.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
