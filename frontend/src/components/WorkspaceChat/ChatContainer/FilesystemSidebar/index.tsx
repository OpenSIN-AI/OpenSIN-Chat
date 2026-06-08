// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import {
  X,
  FolderOpen,
  Folder,
  HardDrive,
  Cpu,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/utils/constants";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import ChatSidebar, { useFilesystemSidebar } from "../ChatSidebar";

function formatUptime(seconds: any): JSX.Element {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function FilesystemSidebar() {
  const { sidebarOpen, closeSidebar } = useFilesystemSidebar();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  async function fetchData() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`${API_BASE}/utils/filesystem`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      if (e.name === "AbortError") return; // closed/unmounted — ignore
      setError(e.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (sidebarOpen) fetchData();
    return () => abortRef.current?.abort();
  }, [sidebarOpen]);

  const rows = data
    ? [
        { icon: Cpu, label: t("sidebar.filesystem.platform", "Plattform"), value: `${data.platform} (${data.arch})` },
        { icon: Cpu, label: t("sidebar.filesystem.node", "Node.js"), value: data.nodeVersion },
        { icon: HardDrive, label: t("sidebar.filesystem.storage", "Speicher frei"), value: data.storage?.current != null ? `${data.storage.current} GB / ${data.storage.capacity} GB` : "—" },
        { icon: Cpu, label: t("sidebar.filesystem.memory", "RAM frei"), value: `${data.freeMemMB} MB / ${data.totalMemMB} MB` },
        { icon: FolderOpen, label: t("sidebar.filesystem.uploadPath", "Storage"), value: data.uploadPath },
        { icon: Folder, label: t("sidebar.filesystem.workDir", "Arbeitsverzeichnis"), value: data.workDir },
        { icon: HardDrive, label: t("sidebar.filesystem.uptime", "Uptime"), value: formatUptime(data.uptime) },
      ]
    : [];

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px]"
        style={{ maxHeight: "calc(100% - 88px)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <FolderOpen size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.filesystem.title", "Verzeichnis")}
          </p>
          <button
            onClick={fetchData}
            type="button"
            disabled={loading}
            className="text-zinc-500 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 mr-1"
            aria-label="Aktualisieren"
          >
            <ArrowClockwise size={13} weight="bold" className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={closeSidebar}
            type="button"
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scroll">
          {loading && !data && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 light:bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-16 rounded bg-zinc-700 light:bg-slate-300" />
                    <div className="h-3 w-32 rounded bg-zinc-700 light:bg-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex flex-col gap-2">
              <span>
                {t("sidebar.filesystem.error", "Fehler beim Laden:")} {error}
              </span>
              <button
                onClick={fetchData}
                type="button"
                className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-200 border-none cursor-pointer transition-colors"
              >
                <ArrowClockwise size={11} weight="bold" />
                {t("sidebar.retry", "Erneut versuchen")}
              </button>
            </div>
          )}
          {!loading && !error && data && (
            <div className="flex flex-col gap-3">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 light:bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-zinc-400 light:text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 light:text-slate-400 uppercase tracking-widest">{label}</p>
                    <p className="text-xs font-mono text-zinc-200 light:text-slate-800 mt-0.5 break-all">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 p-3 rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-200">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
              {t("sidebar.filesystem.hint_title", "Hinweis")}
            </p>
            <p className="text-xs text-zinc-400 light:text-slate-500 leading-relaxed">
              {t("sidebar.filesystem.hint", "Detaillierte Verzeichnisinhalte sind über die Konsole (Terminal-Tab) zugänglich.")}
            </p>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
