// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { VideoCamera } from "@phosphor-icons/react/dist/csr/VideoCamera";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { X } from "@phosphor-icons/react/dist/csr/X";

export const AGENT_MODES = [
  {
    id: "deep-research",
    icon: MagnifyingGlass,
    label: "Deep Research",
    description:
      "Durchsucht das Web, analysiert Quellen und erstellt eine umfassende Recherche",
    enabled: true,
    prefix: "@agent [deep-research]",
    systemPromptHint:
      "You are operating in DEEP RESEARCH mode. Use web-search and url-fetch tools extensively. Perform multi-step reasoning: search broadly first, then drill down into specific sources. Always cite your sources with URLs. Structure your response with clear sections: Summary, Key Findings, Sources. Be thorough and analytical.",
  },
  {
    id: "image-gen",
    icon: ImageIcon,
    label: "Bilder generieren",
    description: "KI-generierte Bilder erstellen",
    enabled: false,
    badge: "coming soon",
    prefix: "@agent [image-gen]",
    systemPromptHint: "",
  },
  {
    id: "video-gen",
    icon: VideoCamera,
    label: "Video generieren",
    description: "KI-generierte Videos erstellen",
    enabled: false,
    badge: "coming soon",
    prefix: "@agent [video-gen]",
    systemPromptHint: "",
  },
  {
    id: "report",
    icon: FileText,
    label: "Bericht generieren",
    description:
      "Erstellt einen strukturierten, professionellen Bericht mit Quellen",
    enabled: true,
    prefix: "@agent [report]",
    systemPromptHint:
      "You are operating in REPORT mode. Create a structured, professional report. Use this format: 1) Executive Summary (2-3 sentences), 2) Background/Context, 3) Main Analysis (with subheadings), 4) Key Findings (bulleted), 5) Conclusions, 6) Recommendations. Use markdown formatting with proper headings (##, ###), bullet points, and bold text for emphasis. If web-search tools are available, use them to gather current information. Always cite sources.",
  },
];

export function getAgentModeById(id) {
  return AGENT_MODES.find((m) => m.id === id) || null;
}

export function parseAgentMode(message) {
  if (!message) return { mode: null, cleanMessage: message };
  const match = message.match(/^@agent\s*\[([a-z-]+)\]\s*(.*)/i);
  if (match) {
    const mode = getAgentModeById(match[1].toLowerCase());
    if (mode) {
      return {
        mode,
        cleanMessage: `@agent ${match[2]}`.trim(),
      };
    }
  }
  return { mode: null, cleanMessage: message };
}

export const AGENT_MODE_EVENT = "agent-mode-change";

export function useAgentMode() {
  const [activeMode, setActiveMode] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!showDropdown) return;
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDropdown]);

  const selectMode = useCallback((mode, sendCommand, textareaRef) => {
    if (!mode.enabled) return;
    setActiveMode(mode);
    setShowDropdown(false);
    window.dispatchEvent(
      new CustomEvent(AGENT_MODE_EVENT, { detail: { mode: mode.id } }),
    );
    if (sendCommand) {
      sendCommand({ text: mode.prefix, writeMode: "prepend" });
    }
    if (textareaRef?.current) {
      setTimeout(() => textareaRef.current.focus(), 50);
    }
  }, []);

  const clearMode = useCallback((sendCommand, textareaRef, promptInput) => {
    setActiveMode(null);
    setShowDropdown(false);
    window.dispatchEvent(
      new CustomEvent(AGENT_MODE_EVENT, { detail: { mode: null } }),
    );
    if (sendCommand && promptInput) {
      const cleaned = promptInput
        .replace(/^@agent\s*\[[a-z-]+\]\s*/i, "")
        .replace(/^@agent\s*/i, "")
        .trim();
      sendCommand({ text: cleaned, writeMode: "replace" });
    }
    if (textareaRef?.current) {
      setTimeout(() => textareaRef.current.focus(), 50);
    }
  }, []);

  return {
    activeMode,
    showDropdown,
    setShowDropdown,
    buttonRef,
    dropdownRef,
    selectMode,
    clearMode,
  };
}

export default function AgentModeButton({
  sendCommand,
  promptInput,
  textareaRef,
  visible = true,
  activeMode,
  showDropdown,
  setShowDropdown,
  buttonRef,
  dropdownRef,
  selectMode,
  clearMode,
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  const ActiveIcon = activeMode?.icon || Sparkle;

  return (
    <>
      <div className="relative flex items-center">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          aria-label={
            activeMode ? activeMode.label : t("chat_window.start_agent_session")
          }
          className={`group border-none relative flex justify-center items-center cursor-pointer rounded-lg transition-all ${
            activeMode
              ? "bg-theme-accent/15 px-2 h-7 gap-1.5"
              : "w-6 h-7 hover:bg-zinc-700 light:hover:bg-slate-200"
          }`}
        >
          <ActiveIcon
            size={16}
            weight={activeMode ? "fill" : "regular"}
            className={`pointer-events-none shrink-0 ${
              activeMode
                ? "text-theme-accent"
                : "text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-600"
            }`}
          />
          {activeMode && (
            <span className="text-xs font-medium text-theme-accent whitespace-nowrap">
              {activeMode.label}
            </span>
          )}
        </button>
        {activeMode && (
          <button
            type="button"
            onClick={() => clearMode(sendCommand, textareaRef, promptInput)}
            className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full hover:bg-zinc-600 light:hover:bg-slate-300 transition-colors"
            aria-label="Mode entfernen"
          >
            <X size={10} className="text-zinc-400 light:text-slate-500" />
          </button>
        )}
      </div>

      {showDropdown &&
        createPortal(
          <div
            className="fixed inset-0 z-40"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowDropdown(false);
            }}
          />,
          document.body,
        )}

      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            onMouseDown={(e) => {
              if (e.currentTarget.contains(e.target)) e.preventDefault();
            }}
            style={{
              position: "fixed",
              top: buttonRef?.current
                ? buttonRef.current.getBoundingClientRect().bottom + 6
                : 0,
              left: buttonRef?.current
                ? buttonRef.current.getBoundingClientRect().left
                : 0,
            }}
            className="z-50 w-[300px] bg-zinc-800 light:bg-white border border-zinc-700 light:border-slate-300 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-zinc-700 light:border-slate-200">
              <div className="flex items-center gap-1.5">
                <Sparkle
                  size={12}
                  weight="fill"
                  className="text-theme-accent"
                />
                <span className="text-xs font-semibold text-white light:text-slate-900">
                  Agent Modus wahlen
                </span>
              </div>
            </div>
            <div className="py-1">
              {AGENT_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={!mode.enabled}
                    onClick={() =>
                      mode.enabled && selectMode(mode, sendCommand, textareaRef)
                    }
                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors border-none ${
                      mode.enabled
                        ? "hover:bg-zinc-700/50 light:hover:bg-slate-100 cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    } ${
                      activeMode?.id === mode.id ? "bg-theme-accent/10" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activeMode?.id === mode.id
                          ? "bg-theme-accent/20"
                          : "bg-zinc-700/50 light:bg-slate-100"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={
                          activeMode?.id === mode.id
                            ? "text-theme-accent"
                            : "text-zinc-300 light:text-slate-600"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white light:text-slate-900">
                          {mode.label}
                        </span>
                        {mode.badge && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-700 light:bg-slate-200 text-zinc-400 light:text-slate-500 uppercase tracking-wide">
                            {mode.badge}
                          </span>
                        )}
                        {activeMode?.id === mode.id && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent">
                            aktiv
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 light:text-slate-500 leading-tight mt-0.5">
                        {mode.description}
                      </p>
                    </div>
                    {mode.enabled && (
                      <CaretRight
                        size={12}
                        className="text-zinc-600 light:text-slate-400 flex-shrink-0 mt-2"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
