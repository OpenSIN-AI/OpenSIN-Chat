// SPDX-License-Identifier: MIT
import logger from "@/utils/logger";
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
    label: undefined,
    labelKey: "agentMode.deepResearch",
    description: undefined,
    descriptionKey: "agentMode.deepResearchDesc",
    enabled: true,
    prefix: "@agent [deep-research]",
    systemPromptHint:
      "You are operating in DEEP RESEARCH mode. Use web-search and url-fetch tools extensively. Perform multi-step reasoning: search broadly first, then drill down into specific sources. Always cite your sources with URLs. Structure your response with clear sections: Summary, Key Findings, Sources. Be thorough and analytical.",
  },
  {
    id: "image-gen",
    icon: ImageIcon,
    label: undefined,
    labelKey: "agentMode.imageGen",
    description: undefined,
    descriptionKey: "agentMode.imageGenDesc",
    enabled: true,
    prefix: "@agent [image-gen]",
    systemPromptHint:
      "You are operating in IMAGE GENERATION mode. Use the image-generation tool to create the requested image. Translate the user's request into a detailed, descriptive English image prompt covering subject, style, composition, colors, and lighting. Choose a short descriptive filename. If image generation is not configured, tell the user to enable and configure the 'Image Generation' skill in the admin agent settings.",
  },
  {
    id: "video-gen",
    icon: VideoCamera,
    label: undefined,
    labelKey: "agentMode.videoGen",
    description: undefined,
    descriptionKey: "agentMode.videoGenDesc",
    enabled: false,
    badge: "coming soon",
    prefix: "@agent [video-gen]",
    systemPromptHint: "",
  },
  {
    id: "report",
    icon: FileText,
    label: undefined,
    labelKey: "agentMode.reportGen",
    description: undefined,
    descriptionKey: "agentMode.reportGenDesc",
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

const AGENT_MODE_STORAGE_KEY = "opensin_agent_mode";

function loadPersistedMode() {
  try {
    const stored = localStorage.getItem(AGENT_MODE_STORAGE_KEY);
    if (!stored) return null;
    return getAgentModeById(stored) || null;
  } catch {
    return null;
  }
}

function persistMode(modeId) {
  try {
    if (modeId) localStorage.setItem(AGENT_MODE_STORAGE_KEY, modeId);
    else localStorage.removeItem(AGENT_MODE_STORAGE_KEY);
  } catch (e) {
    logger.warn("[AgentModeButton] non-fatal error:", e?.message || e);
  }
}

export function useAgentMode() {
  const [activeMode, setActiveMode] = useState(loadPersistedMode);
  const [showDropdown, setShowDropdown] = useState(false);
  const buttonRef = useRef<any>(null);
  const dropdownRef = useRef<any>(null);

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
    persistMode(mode.id);
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
    persistMode(null);
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
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowDropdown(!showDropdown);
            }
          }}
          aria-label={
            activeMode
              ? t(activeMode.labelKey)
              : t("chat_window.start_agent_session")
          }
          aria-haspopup="true"
          aria-expanded={showDropdown}
          className={`group border-none relative flex justify-center items-center cursor-pointer rounded-lg transition-all ${
            activeMode
              ? "bg-theme-accent/15 px-2 h-7 gap-1.5"
              : "w-6 h-7 hover:bg-theme-bg-tertiary"
          }`}
        >
          <ActiveIcon
            size={16}
            weight={activeMode ? "fill" : "regular"}
            className={`pointer-events-none shrink-0 ${
              activeMode
                ? "text-theme-accent"
                : "text-theme-text-secondary group-hover:text-theme-text-primary"
            }`}
          />
          {activeMode && (
            <span className="text-xs font-medium text-theme-accent whitespace-nowrap">
              {t(activeMode.labelKey)}
            </span>
          )}
        </button>
        {activeMode && (
          <button
            type="button"
            onClick={() => clearMode(sendCommand, textareaRef, promptInput)}
            className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full hover:bg-theme-bg-tertiary transition-colors"
            aria-label={t("agentMode.removeMode")}
          >
            <X size={10} className="text-theme-text-secondary" />
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
            role="dialog"
            aria-label={t("chat_window.start_agent_session")}
            onMouseDown={(e) => {
              if (
                e.target instanceof Node &&
                e.currentTarget.contains(e.target)
              ) {
                e.preventDefault();
              }
            }}
            style={{
              position: "fixed",
              ...((): { top?: number; bottom?: number; left?: number } => {
                if (!buttonRef?.current) return { top: 0, left: 0 };
                const btnRect = buttonRef.current.getBoundingClientRect();
                const dropdownHeight = 316;
                const spaceBelow = window.innerHeight - btnRect.bottom - 6;
                const spaceAbove = btnRect.top - 6;
                const left = btnRect.left;
                if (spaceBelow >= dropdownHeight) {
                  return { top: btnRect.bottom + 6, left };
                }
                if (spaceAbove >= dropdownHeight) {
                  return { bottom: window.innerHeight - btnRect.top + 6, left };
                }
                return { top: btnRect.bottom + 6, left };
              })(),
            }}
            className="z-50 w-[300px] overflow-hidden rounded-xl bg-theme-bg-secondary shadow-[0_16px_48px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)]"
          >
            <div className="px-3 pb-1.5 pt-3">
              <div className="flex items-center gap-1.5">
                <Sparkle
                  size={12}
                  weight="fill"
                  className="text-theme-accent"
                />
                <span className="text-xs font-semibold text-theme-text-primary">
                  {t("agentMode.title")}
                </span>
              </div>
            </div>
            <div className="py-1">
              {AGENT_MODES.filter((mode) => mode.enabled).map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={activeMode?.id === mode.id}
                    aria-label={t(mode.labelKey)}
                    onClick={() => selectMode(mode, sendCommand, textareaRef)}
                    className={`mx-1.5 flex w-[calc(100%-0.75rem)] cursor-pointer items-start gap-3 rounded-lg border-none px-2.5 py-2.5 text-left transition-colors hover:bg-theme-sidebar-item-hover ${
                      activeMode?.id === mode.id ? "bg-theme-accent/10" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activeMode?.id === mode.id
                          ? "bg-theme-accent/20"
                          : "bg-theme-bg-tertiary"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={
                          activeMode?.id === mode.id
                            ? "text-theme-accent"
                            : "text-theme-text-secondary"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-theme-text-primary">
                          {t(mode.labelKey)}
                        </span>
                        {mode.badge && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-theme-bg-tertiary text-theme-text-secondary uppercase tracking-wide">
                            {mode.badge}
                          </span>
                        )}
                        {activeMode?.id === mode.id && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent">
                            {t("agentMode.active")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-theme-text-secondary leading-tight mt-0.5">
                        {t(mode.descriptionKey)}
                      </p>
                    </div>
                    {mode.enabled && (
                      <CaretRight
                        size={12}
                        className="text-theme-text-secondary flex-shrink-0 mt-2"
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
