// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import useUser from "@/hooks/useUser";
import useWorkspace from "@/hooks/useWorkspaceBySlug";
import useSystemSettings from "@/hooks/useSystemSettings";
import useModelRouter from "@/hooks/useModelRouter";
import { useModal } from "@/hooks/useModal";
import LLMSelectorModal from "../PromptInput/LLMSelector/index";
import SetupProvider from "../PromptInput/LLMSelector/SetupProvider";
import {
  SAVE_LLM_SELECTOR_EVENT,
  PROVIDER_SETUP_EVENT,
  TOGGLE_LLM_SELECTOR_EVENT,
} from "../PromptInput/LLMSelector/action";
import { SIDEBAR_TOGGLE_EVENT } from "@/components/Sidebar/SidebarToggle";
import { safeGetItem } from "@/utils/safeStorage";

/**
 * Convert a raw model ID (e.g. "accounts/fireworks/models/minimax-m3")
 * to a friendly display name (e.g. "MiniMax M3").
 * Falls back to the raw ID if no friendly name can be derived.
 */
function prettifyModelName(rawModel: string): string {
  if (!rawModel) return "";
  // Try to extract the short name from the last path segment
  const parts = rawModel.split("/");
  const lastPart = parts[parts.length - 1];
  if (!lastPart) return rawModel;
  // Convert kebab-case to Title Case (e.g. "minimax-m3" -> "MiniMax M3")
  return lastPart
    .split("-")
    .map((word) => {
      // Keep well-known acronyms uppercase
      const upper = [
        "m1",
        "m2",
        "m3",
        "m4",
        "v1",
        "v2",
        "v3",
        "v4",
        "v5",
        "vl",
        "llm",
        "gpt",
        "api",
        "ai",
        "pro",
        "oss",
      ];
      const lower = word.toLowerCase();
      if (upper.some((u) => lower === u)) return word.toUpperCase();
      // Special-case: "minimax" -> "MiniMax", "deepseek" -> "DeepSeek"
      if (lower === "minimax") return "MiniMax";
      if (lower === "deepseek") return "DeepSeek";
      if (lower === "qwen") return "Qwen";
      if (lower === "kimi") return "Kimi";
      if (lower === "glm") return "GLM";
      // Default: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export default function WorkspaceModelPicker({ workspaceSlug = null }) {
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const { slug: urlSlug } = useParams();
  const slug = urlSlug ?? workspaceSlug;
  const { user } = useUser();
  const { workspace } = useWorkspace(slug);
  const { settings: systemSettings } = useSystemSettings();
  const [showSelector, setShowSelector] = useState(false);
  const [modelName, setModelName] = useState("");
  const {
    isOpen: isSetupProviderOpen,
    openModal: openSetupProviderModal,
    closeModal: closeSetupProviderModal,
  } = useModal();
  const [config, setConfig] = useState({ settings: {}, provider: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => safeGetItem("opensin_sidebar_toggle") !== "closed",
  );

  const effectiveProvider =
    workspace?.chatProvider ?? systemSettings?.LLMProvider;
  const routerId = workspace?.router_id || systemSettings?.ModelRouterId;
  const { router } = useModelRouter(
    effectiveProvider === "opensin-router" ? routerId : null,
  );

  useEffect(() => {
    const handleToggle = (e) => setSidebarOpen(e.detail.open);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
  }, []);

  useEffect(() => {
    if (!workspace || !systemSettings) return;
    if (effectiveProvider !== "opensin-router") {
      const rawModel = workspace.chatModel ?? systemSettings.LLMModel ?? "";
      // Convert raw model ID (e.g. "accounts/fireworks/models/minimax-m3") to a friendly name
      setModelName(prettifyModelName(rawModel));
    } else if (router) {
      setModelName(router.name);
    } else if (!routerId) {
      setModelName(t("model-router.metrics.model-router-default"));
    }
  }, [workspace, systemSettings, router, effectiveProvider, t]);

  useEffect(() => {
    function handleSave() {
      setShowSelector(false);
    }
    window.addEventListener(SAVE_LLM_SELECTOR_EVENT, handleSave);
    return () =>
      window.removeEventListener(SAVE_LLM_SELECTOR_EVENT, handleSave);
  }, []);

  useEffect(() => {
    function handleToggle() {
      setShowSelector((prev) => !prev);
    }
    window.addEventListener(TOGGLE_LLM_SELECTOR_EVENT, handleToggle);
    return () =>
      window.removeEventListener(TOGGLE_LLM_SELECTOR_EVENT, handleToggle);
  }, []);

  useEffect(() => {
    if (!showSelector) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSelector(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showSelector]);

  useEffect(() => {
    let timer;
    function handleProviderSetup(e) {
      const { provider, settings } = e.detail;
      setConfig({ settings, provider });
      timer = setTimeout(() => openSetupProviderModal(), 300);
    }
    window.addEventListener(PROVIDER_SETUP_EVENT, handleProviderSetup);
    return () => {
      window.removeEventListener(PROVIDER_SETUP_EVENT, handleProviderSetup);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!!user && user.role !== "admin") return null;
  if (!slug || isMobile) return null;

  return (
    <>
      {showSelector && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowSelector(false)}
        />
      )}
      <div
        className={`hidden md:block absolute top-2 z-30 transition-all duration-500 pointer-events-none ${
          sidebarOpen ? "left-3" : "left-11"
        }`}
      >
        <button
          type="button"
          onClick={() => setShowSelector(!showSelector)}
          aria-label={t("chat_window.select_model")}
          aria-expanded={showSelector}
          className={`group border cursor-pointer px-2.5 py-1 flex items-center rounded-full transition-colors duration-150 pointer-events-auto ${
            showSelector
              ? "bg-white/[0.06] light:bg-zinc-100 border-white/[0.08] light:border-zinc-200"
              : "border-transparent hover:bg-white/[0.04] light:hover:bg-zinc-100 hover:border-white/[0.06] light:hover:border-zinc-200"
          }`}
        >
          <span
            className={`text-xs ${
              showSelector
                ? "text-[#e4e4e7] light:text-zinc-900"
                : "text-[#71717a] light:text-zinc-500 group-hover:text-[#a1a1aa] light:group-hover:text-zinc-800"
            }`}
          >
            {modelName || t("chat_window.select_model")}
          </span>
        </button>

        {showSelector && (
          <div className="absolute left-0 top-full mt-1 bg-[#141414] light:bg-white border border-white/[0.07] light:border-zinc-200 rounded-xl shadow-2xl shadow-black/50 w-[620px] overflow-hidden pointer-events-auto">
            <LLMSelectorModal
              key={refreshKey}
              workspaceSlug={slug}
              initialProvider={config.provider?.value}
            />
          </div>
        )}
      </div>

      <SetupProvider
        isOpen={isSetupProviderOpen}
        closeModal={closeSetupProviderModal}
        postSubmit={() => {
          closeSetupProviderModal();
          setRefreshKey((k) => k + 1);
        }}
        settings={config.settings}
        llmProvider={config.provider}
      />
    </>
  );
}
