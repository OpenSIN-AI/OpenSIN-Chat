// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef } from "react";
import { X, Terminal, Bug, Trash, ArrowClockwise } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ChatSidebar from "../ChatSidebar";
import { useConsoleSidebar } from "../ChatSidebar";

const TABS = ["logs", "terminal"];

// Listen for log events dispatched globally
const LOG_EVENT: any = "openafd:log";

export function dispatchLog(level, message: any) {
  window.dispatchEvent(
    new CustomEvent(LOG_EVENT, {
      detail: { level, message, timestamp: new Date().toISOString() },
    }),
  );
}

const LEVEL_COLORS = {
  info: "text-zinc-300 light:text-slate-700",
  warn: "text-yellow-400",
  error: "text-red-400",
  success: "text-green-400",
  debug: "text-blue-400",
};

function LogsTab() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([] as any);
  const bottomRef: any = useRef(null);

  useEffect(() => {
    function handler(e) {
      setLogs((prev) => [...prev.slice(-499), e.detail]);
    }
    window.addEventListener(LOG_EVENT, handler);
    return () => window.removeEventListener(LOG_EVENT, handler);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 light:border-slate-200 shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 light:text-slate-400">
          {t("console.logs", "Logs")}
        </span>
        <button
          type="button"
          onClick={() => setLogs([])}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 border-none bg-transparent cursor-pointer transition-colors"
        >
          <Trash size={11} />
          {t("console.clear", "Leeren")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed p-3 no-scroll">
        {logs.length === 0 ? (
          <p className="text-zinc-600 light:text-slate-400 text-center mt-8">
            {t("console.no_logs", "Keine Logs vorhanden.")}
          </p>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="flex gap-2 mb-0.5">
              <span className="text-zinc-600 light:text-slate-400 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString("de-DE", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
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

function TerminalTab() {
  const { t } = useTranslation();
  const [history, setHistory] = useState([] as any);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([] as any);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function runCommand(cmd: any) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setCmdHistory((prev) => [trimmed, ...prev].slice(0, 100));
    setHistoryIdx(-1);
    setHistory((prev) => [
      ...prev,
      { type: "input", text: `$ ${trimmed}` },
    ]);

    try {
      const res = await fetch("/api/utils/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setHistory((prev) => [
          ...prev,
          { type: "output", text: data.output ?? "(kein Output)" },
        ]);
      } else {
        const err = await res.text();
        setHistory((prev) => [
          ...prev,
          { type: "error", text: `Fehler: ${err}` },
        ]);
      }
    } catch (e) {
      setHistory((prev) => [
        ...prev,
        {
          type: "error",
          text: t("console.terminal_unavailable", "Terminal nicht verfügbar. Stelle sicher, dass der Server den /api/terminal/exec-Endpunkt bereitstellt."),
        },
      ]);
    }
  }

  function handleKeyDown(e: any) {
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
      setInput(idx === -1 ? "" : cmdHistory[idx] ?? "");
    }
  }

  return (
    <div
      className="flex flex-col h-full cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 light:border-slate-200 shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 light:text-slate-400">
          {t("console.terminal", "Terminal")}
        </span>
        <button
          type="button"
          onClick={() => setHistory([])}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 border-none bg-transparent cursor-pointer transition-colors"
        >
          <Trash size={11} />
          {t("console.clear", "Leeren")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed p-3 no-scroll">
        <p className="text-zinc-600 light:text-slate-400 mb-2">
          {t("console.terminal_hint", "OpenAfD Terminal — Befehle werden auf dem Host-System ausgeführt.")}
        </p>
        {history.map((entry, idx) => (
          <div
            key={idx}
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
      <div className="flex items-center gap-1 px-3 py-2 border-t border-zinc-800 light:border-slate-200 shrink-0">
        <span className="text-zinc-500 font-mono text-[11px]">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none font-mono text-[11px] text-zinc-200 light:text-slate-800 placeholder:text-zinc-600 caret-white"
          placeholder={t("console.terminal_placeholder", "Befehl eingeben...")}
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
  const [activeTab, setActiveTab] = useState("logs");

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px]"
        style={{ maxHeight: "calc(100% - 88px)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-0 shrink-0">
          <Terminal size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("console.title", "Konsole & Terminal")}
          </p>
          <button
            onClick={closeSidebar}
            type="button"
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-4 pt-2 pb-0 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
                  : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-100 text-zinc-400 light:text-slate-500"
              }`}
            >
              {tab === "logs" ? (
                <>
                  <Bug size={11} />
                  {t("console.tab_logs", "Logs")}
                </>
              ) : (
                <>
                  <Terminal size={11} />
                  {t("console.tab_terminal", "Terminal")}
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
