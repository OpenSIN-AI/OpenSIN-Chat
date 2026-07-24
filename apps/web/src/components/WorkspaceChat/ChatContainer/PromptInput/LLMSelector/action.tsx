// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import { Brain } from "@phosphor-icons/react/dist/csr/Brain";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import LLMSelectorModal from "./index";
import { useTheme } from "@/hooks/useTheme";
import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import useUser from "@/hooks/useUser";
import { useModal } from "@/hooks/useModal";
import SetupProvider from "./SetupProvider";

export const TOGGLE_LLM_SELECTOR_EVENT = "toggle_llm_selector";
export const SAVE_LLM_SELECTOR_EVENT = "save_llm_selector";
export const PROVIDER_SETUP_EVENT = "provider_setup_requested";

export default function LLMSelectorAction({ workspaceSlug = null }: any) {
  const { t } = useTranslation();
  const { slug: urlSlug } = useParams();
  const slug = urlSlug ?? workspaceSlug;
  const tooltipRef = useRef<any>(null);
  const { theme } = useTheme();
  const { user } = useUser();
  const [saved, setSaved] = useState(false as any);
  const {
    isOpen: isSetupProviderOpen,
    openModal: openSetupProviderModal,
    closeModal: closeSetupProviderModal,
  } = useModal();
  const [config, setConfig] = useState({
    settings: {},
    provider: null,
  } as any);

  function toggleLLMSelectorTooltip() {
    if (!tooltipRef.current) return;
    if (tooltipRef.current.isOpen) {
      tooltipRef.current.close();
    } else {
      tooltipRef.current.open();
    }
  }

  function handleSaveLLMSelector() {
    if (!tooltipRef.current) return;
    tooltipRef.current.close();
    setSaved(true);
  }

  useEffect(() => {
    window.addEventListener(
      TOGGLE_LLM_SELECTOR_EVENT,
      toggleLLMSelectorTooltip,
    );
    window.addEventListener(SAVE_LLM_SELECTOR_EVENT, handleSaveLLMSelector);
    return () => {
      window.removeEventListener(
        TOGGLE_LLM_SELECTOR_EVENT,
        toggleLLMSelectorTooltip,
      );
      window.removeEventListener(
        SAVE_LLM_SELECTOR_EVENT,
        handleSaveLLMSelector,
      );
    };
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => {
      setSaved(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    let timer;
    function handleProviderSetupEvent(e: any) {
      const { provider, settings } = e.detail;
      setConfig({
        settings,
        provider,
      });
      timer = setTimeout(() => {
        openSetupProviderModal();
      }, 300);
    }

    window.addEventListener(PROVIDER_SETUP_EVENT, handleProviderSetupEvent);
    return () => {
      window.removeEventListener(
        PROVIDER_SETUP_EVENT,
        handleProviderSetupEvent,
      );
      if (timer) clearTimeout(timer);
    };
  }, []);

  // This feature is disabled for multi-user instances where the user is not an admin
  // This is because of the limitations of model selection currently and other nuances in controls.
  if (!!user && user.role !== "admin") return null;
  if (!slug) return null;

  return (
    <>
      <div
        id="llm-selector-btn"
        data-tooltip-id="tooltip-llm-selector-btn"
        aria-label={t("common.llmSelector")}
        className={`border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer`}
      >
        {saved ? (
          <CheckCircle className="w-[20px] h-[20px] pointer-events-none text-green-400" />
        ) : (
          <Brain className="w-[20px] h-[20px] pointer-events-none text-[var(--theme-sidebar-footer-icon-fill)]" />
        )}
      </div>
      <Tooltip
        ref={tooltipRef}
        id="tooltip-llm-selector-btn"
        place="top"
        opacity={1}
        clickable={true}
        delayShow={300} // dont trigger tooltip instantly to not spam the UI
        delayHide={800} // Prevent the travel time from icon to window hiding tooltip
        arrowColor={
          theme === "light"
            ? "var(--theme-modal-border)"
            : "var(--theme-bg-primary)"
        }
        className="z-[99] !w-[min(500px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !bg-theme-bg-primary !px-[5px] !rounded-lg !pointer-events-auto light:border-2 light:border-theme-modal-border"
      >
        <LLMSelectorModal {...({ tooltipRef, workspaceSlug: slug } as any)} />
      </Tooltip>
      <SetupProvider
        isOpen={isSetupProviderOpen}
        closeModal={closeSetupProviderModal}
        postSubmit={() => closeSetupProviderModal()}
        settings={config.settings}
        llmProvider={config.provider}
      />
    </>
  );
}
