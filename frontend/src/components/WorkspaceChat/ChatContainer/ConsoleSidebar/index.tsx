// SPDX-License-Identifier: MIT
import React, { useState, useEffect, useRef } from "react";
import { Terminal } from "@phosphor-icons/react/dist/csr/Terminal";
import { Bug } from "@phosphor-icons/react/dist/csr/Bug";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { useTranslation } from "react-i18next";
import ChatSidebar, { useConsoleSidebar } from "../ChatSidebar";
import { baseHeaders } from "@/utils/request";
import { PanelHeader } from "@/components/ui/PanelHeader";

const TABS = ["logs", "terminal"] as const;
type TabName = (typeof TABS)[number];

export function dispatchLog(
  level: "info" | "warn" | "error" | "success" | "debug",
  message: string,
) {
  window.dispatchEvent(
    new CustomEvent("opensin:log", {
      detail: { level, message, timestamp: new Date().toISOString() },
    }),
  );
}

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: "text-zinc-300 light:text-slate-700",
  warn: "text-yellow-400",
  error: "text-red-400",
  success: "text-green-400",
  debug: "text-blue-400",
};

function LogsTab() {
  const { t, i18n } = useTranslation();
  const { consoleLogs, clearConsoleLogs } = useConsoleSidebar();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-theme-border shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-widest text-theme-text-muted">
          {t("consoleSidebar.logs")}
        </span>
        <button
          type="button"
          onClick={() => clearConsoleLogs()}
          aria-label={t("consoleSidebar.clear")}
          className="flex items-center gap-1 text-[10px] text-theme-text-muted hover:text-theme-text-secondary border-none bg-transparent cursor-pointer transition-colors"
        >
          <Trash size={11} aria-hidden="true" />
          {t("consoleSidebar.clear")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed p-3 no-scroll">
        {consoleLogs.length === 0 ? (
          <p className="text-theme-text-muted text-center mt-8">
            {t("consoleSidebar.noLogs")}
          </p>
        ) : (
          consoleLogs.map((log, idx) => (
            <div key={`${log.timestamp}-${idx}`} className="flex gap-2 mb-0.5">
              <span className="text-theme-text-muted shrink-0">
                {new Date(log.timestamp).toLocaleTimeString(i18n.language, {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                {}
              </span>
              <span className={LEVEL_COLORS[log.level] ?? LEVEL_COLORS.info}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

type HistoryEntry =
  | { type: "input"; text: string }
  | { type: "output"; text: string }
  | { type: "error"; text: string };

function TerminalTab() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState<string>("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function runCommand(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setCmdHistory((prev) => [trimmed, ...prev].slice(0, 100));
    setHistoryIdx(-1);
    setHistory((prev) => [...prev, { type: "input", text: `$ ${trimmed}` }]);

    try {
      const res = await fetch("/api/utils/terminal/exec", {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setHistory((prev) => [
          ...prev,
          { type: "output", text: data.output ?? t("consoleSidebar.noOutput") },
        ]);
      } else {
        const err = await res.text();
        setHistory((prev) => [
          ...prev,
          { type: "error", text: t("consoleSidebar.error", { error: err }) },
        ]);
      }
    } catch (e) {
      setHistory((prev) => [
        ...prev,
        {
          type: "error",
          text: t("console.terminal_unavailable"),
        },
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(idx);
      setInput(cmdHistory[idx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? "" : (cmdHistory[idx] ?? ""));
    }
  }

  return (
    <div
      className="flex flex-col h-full cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-theme-border shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-widest text-theme-text-muted">
          {t("consoleSidebar.terminal")}
        </span>
        <button
          type="button"
          onClick={() => setHistory([])}
          aria-label={t("consoleSidebar.clear")}
          className="flex items-center gap-1 text-[10px] text-theme-text-muted hover:text-theme-text-secondary border-none bg-transparent cursor-pointer transition-colors"
        >
          <Trash size={11} aria-hidden="true" />
          {t("consoleSidebar.clear")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed p-3 no-scroll">
        <p className="text-theme-text-muted mb-2">
          {t("consoleSidebar.terminalHint")}
        </p>
        {history.map((entry, idx) => (
          <div
            key={`${idx}-${entry.type}-${entry.text?.slice(0, 20) ?? ""}`}
            className={
              entry.type === "input"
                ? "text-zinc-200 light:text-slate-800 mb-0.5"
                : entry.type === "error"
                  ? "text-red-400 mb-1 whitespace-pre-wrap"
                  : "text-green-400 mb-1 whitespace-pre-wrap"
            }
          >
            {entry.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {/* Input line */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-theme-border shrink-0">
        <span className="text-theme-text-muted font-mono text-[11px]">{}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none font-mono text-[11px] text-theme-text-primary placeholder:text-theme-text-muted"
          placeholder={t("console.terminal_placeholder")}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export default function ConsoleSidebar() {
  const { sidebarOpen, closeSidebar } = useConsoleSidebar();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabName>("logs");

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div className="w-full h-full bg-theme-bg-sidebar flex flex-col overflow-hidden">
        <PanelHeader
          icon={<Terminal size={15} weight="fill" />}
          title={t("console.title")}
          onClose={closeSidebar}
        />
        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label={t("consoleSidebar.consoleTabs")}
          className="flex items-center gap-1 px-4 pt-2 pb-0 shrink-0"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-label={
                tab === "logs"
                  ? t("console.tab_logs")
                  : t("console.tab_terminal")
              }
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-theme-bg-tertiary text-theme-text-primary"
                  : "bg-transparent hover:bg-theme-bg-secondary text-theme-text-muted"
              }`}
            >
              {tab === "logs" ? (
                <>
                  <Bug size={11} aria-hidden="true" />
                  {t("console.tab_logs")}
                </>
              ) : (
                <>
                  <Terminal size={11} aria-hidden="true" />
                  {t("console.tab_terminal")}
                </>
              )}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden mt-2">
          {activeTab === "logs" ? <LogsTab /> : <TerminalTab />}
        </div>
      </div>
    </ChatSidebar>
  );
}
