// SPDX-License-Identifier: MIT
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import React, { useState, useRef, useEffect, FormEvent } from "react";
import Sidebar from "@/components/SettingsSidebar";
import System from "@/models/system";
import showToast from "@/utils/toast";
import OpenSINChatIcon from "@/media/logo/opensin-icon.svg";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import GeminiAiLogo from "@/media/llmprovider/gemini.png";
import OllamaLogo from "@/media/llmprovider/ollama.png";
import LMStudioLogo from "@/media/llmprovider/lmstudio.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";

import PreLoader from "@/components/Preloader";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import ChangeWarningModal from "@/components/ChangeWarning";
import OpenAiOptions from "@/components/EmbeddingSelection/OpenAiOptions";
import GeminiOptions from "@/components/EmbeddingSelection/GeminiOptions";
import NativeEmbeddingOptions from "@/components/EmbeddingSelection/NativeEmbeddingOptions";
import OllamaEmbeddingOptions from "@/components/EmbeddingSelection/OllamaOptions";
import LMStudioEmbeddingOptions from "@/components/EmbeddingSelection/LMStudioOptions";
import GenericOpenAiEmbeddingOptions from "@/components/EmbeddingSelection/GenericOpenAiOptions";

import EmbedderItem from "@/components/EmbeddingSelection/EmbedderItem";
import { CaretUpDown } from "@phosphor-icons/react/dist/csr/CaretUpDown";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import CTAButton from "@/components/lib/CTAButton";
import { useTranslation } from "react-i18next";
import useEmbeddingPreference from "@/hooks/useEmbeddingPreference";
import logger from "@/utils/logger";

interface Embedder {
  name: string;
  value: string;
  logo: string;
  options: (settings: any) => React.ReactNode;
  description: string;
}

const EMBEDDERS: Embedder[] = [
  {
    name: "OpenSIN Chat Embedder",
    value: "native",
    logo: OpenSINChatIcon,
    options: (settings: any) => <NativeEmbeddingOptions settings={settings} />,
    description:
      "Use the built-in embedding provider for OpenSIN Chat. Zero setup!",
  },
  {
    name: "OpenAI",
    value: "openai",
    logo: OpenAiLogo,
    options: (settings: any) => <OpenAiOptions settings={settings} />,
    description: "The standard option for most non-commercial use.",
  },
  {
    name: "Gemini",
    value: "gemini",
    logo: GeminiAiLogo,
    options: (settings: any) => <GeminiOptions settings={settings} />,
    description: "Run powerful embedding models from Google AI.",
  },
  {
    name: "Ollama",
    value: "ollama",
    logo: OllamaLogo,
    options: (settings: any) => <OllamaEmbeddingOptions settings={settings} />,
    description: "Run embedding models locally on your own machine.",
  },
  {
    name: "LM Studio",
    value: "lmstudio",
    logo: LMStudioLogo,
    options: (settings: any) => (
      <LMStudioEmbeddingOptions settings={settings} />
    ),
    description:
      "Discover, download, and run thousands of cutting edge LLMs in a few clicks.",
  },
  {
    name: "Generic OpenAI",
    value: "generic-openai",
    logo: GenericOpenAiLogo,
    options: (settings: any) => (
      <GenericOpenAiEmbeddingOptions settings={settings} />
    ),
    description: "Run embedding models from any OpenAI compatible API service.",
  },
];

export default function GeneralEmbeddingPreference() {
  const { settings, isLoading } = useEmbeddingPreference();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const blocker = useUnsavedChanges(hasChanges);
  const [hasEmbeddings, setHasEmbeddings] = useState(false);
  const [hasCachedEmbeddings, setHasCachedEmbeddings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEmbedders, setFilteredEmbedders] = useState<Embedder[]>([]);
  const [selectedEmbedder, setSelectedEmbedder] = useState<string | null>(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();

  useEffect(() => {
    if (isLoading || !settings) return;
    setSelectedEmbedder(settings?.EmbeddingEngine || "native");
    setHasEmbeddings(settings?.HasExistingEmbeddings || false);
    setHasCachedEmbeddings(settings?.HasCachedEmbeddings || false);
  }, [isLoading, settings]);

  useEffect(() => {
    if (!searchMenuOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [searchMenuOpen]);

  function embedderModelChanged(formEl: HTMLFormElement) {
    try {
      const newModel = new FormData(formEl).get("EmbeddingModelPref") ?? null;
      if (newModel === null) return false;
      return settings?.EmbeddingModelPref !== newModel;
    } catch (error) {
      logger.error(error);
    }
    return false;
  }

  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const form = (e?.target ??
      document.getElementById("embedding-form")) as HTMLFormElement;
    if (
      (selectedEmbedder !== settings?.EmbeddingEngine ||
        embedderModelChanged(form)) &&
      hasChanges &&
      (hasEmbeddings || hasCachedEmbeddings)
    ) {
      openModal();
    } else {
      await handleSaveSettings();
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const form = document.getElementById("embedding-form") as HTMLFormElement;
    const settingsData: any = {};
    const formData = new FormData(form);
    settingsData.EmbeddingEngine = selectedEmbedder;
    for (const [key, value] of formData.entries()) settingsData[key] = value;

    const { error } = await System.updateSystem(settingsData);
    if (error) {
      showToast(t("embedding.saveFailed", { error }), "error");
      setHasChanges(true);
    } else {
      showToast(t("embedding.saveSuccess"), "success");
      setHasChanges(false);
    }
    setSaving(false);
    closeModal();
  };

  const updateChoice = (selection: string) => {
    setSearchQuery("");
    setSelectedEmbedder(selection);
    setSearchMenuOpen(false);
    setHasChanges(true);
  };

  const handleXButton = () => {
    if (searchQuery.length > 0) {
      setSearchQuery("");
      if (searchInputRef.current) searchInputRef.current.value = "";
    } else {
      setSearchMenuOpen(!searchMenuOpen);
    }
  };

  useEffect(() => {
    const filtered = EMBEDDERS.filter((embedder) =>
      embedder.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredEmbedders(filtered);
  }, [searchQuery, selectedEmbedder]);

  const selectedEmbedderObject = EMBEDDERS.find(
    (embedder) => embedder.value === selectedEmbedder,
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      {isLoading ? (
        <div
          style={
            {
              "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
            } as React.CSSProperties
          }
          className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
        >
          <div className="w-full h-full flex justify-center items-center">
            <PreLoader />
          </div>
        </div>
      ) : (
        <div
          style={
            {
              "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
            } as React.CSSProperties
          }
          className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
        >
          <form
            id="embedding-form"
            onSubmit={handleSubmit}
            className="flex w-full"
          >
            <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] py-16 md:py-6">
              <div className="w-full flex flex-col gap-y-1 pb-6 border-white light:border-theme-sidebar-border border-b-2 border-opacity-10">
                <div className="flex gap-x-4 items-center">
                  <p className="text-lg leading-6 font-bold text-theme-text-primary">
                    {t("embedding.title")}
                  </p>
                </div>
                <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
                  {t("embedding.desc-start")}
                  <br />
                  {t("embedding.desc-end")}
                </p>
              </div>
              <div className="w-full justify-end flex">
                {hasChanges && (
                  <CTAButton
                    onClick={() => handleSubmit()}
                    className="mt-3 mr-0 -mb-14 z-10"
                  >
                    {saving ? t("common.saving") : t("common.save")}
                  </CTAButton>
                )}
              </div>
              <div className="text-base font-bold text-theme-text-primary mt-6 mb-4">
                {t("embedding.provider.title")}
              </div>
              <div className="relative">
                {searchMenuOpen && (
                  <div
                    className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 backdrop-blur-sm z-10"
                    onClick={() => setSearchMenuOpen(false)}
                  />
                )}
                {searchMenuOpen ? (
                  <div className="absolute top-0 left-0 w-full max-w-[640px] max-h-[310px] min-h-[64px] bg-theme-settings-input-bg rounded-lg flex flex-col justify-between cursor-pointer border-2 border-primary-button z-20">
                    <div className="w-full flex flex-col gap-y-1">
                      <div className="flex items-center sticky top-0 z-10 border-b border-[#9CA3AF] mx-4 bg-theme-settings-input-bg">
                        <MagnifyingGlass
                          size={20}
                          weight="bold"
                          className="absolute left-4 z-30 text-theme-text-primary -ml-4 my-2"
                        />
                        <input
                          type="text"
                          name="embedder-search"
                          autoComplete="off"
                          placeholder={t("common.searchEmbeddingProviders")}
                          className="border-none -ml-4 my-2 bg-transparent z-20 pl-12 h-[38px] w-full px-4 py-1 text-sm outline-none text-theme-text-primary placeholder:text-theme-text-primary placeholder:font-medium"
                          onChange={(e) => setSearchQuery(e.target.value)}
                          ref={searchInputRef}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                          }}
                        />
                        <X
                          size={20}
                          weight="bold"
                          className="cursor-pointer text-theme-text-primary hover:text-x-button"
                          onClick={handleXButton}
                        />
                      </div>
                      <div className="flex-1 pl-4 pr-2 flex flex-col gap-y-1 overflow-y-auto white-scrollbar pb-4 max-h-[245px]">
                        {filteredEmbedders.map((embedder) => (
                          <EmbedderItem
                            key={embedder.name}
                            name={embedder.name}
                            value={embedder.value}
                            image={embedder.logo}
                            description={embedder.description}
                            checked={selectedEmbedder === embedder.value}
                            onClick={() => updateChoice(embedder.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    aria-label={t("common.selectProvider", "Select provider")}
                    className="w-full max-w-[640px] h-[64px] bg-theme-settings-input-bg rounded-lg flex items-center p-[14px] justify-between cursor-pointer border-2 border-transparent hover:border-primary-button transition-all duration-300"
                    type="button"
                    onClick={() => setSearchMenuOpen(true)}
                  >
                    <div className="flex gap-x-4 items-center">
                      <img
                        src={selectedEmbedderObject?.logo}
                        alt={`${selectedEmbedderObject?.name} logo`}
                        className="w-10 h-10 rounded-md"
                      />
                      <div className="flex flex-col text-left">
                        <div className="text-sm font-semibold text-theme-text-primary">
                          {selectedEmbedderObject?.name}
                        </div>
                        <div className="mt-1 text-xs text-description">
                          {selectedEmbedderObject?.description}
                        </div>
                      </div>
                    </div>
                    <CaretUpDown
                      size={24}
                      weight="bold"
                      className="text-theme-text-primary"
                    />
                  </button>
                )}
              </div>
              <div
                onChange={() => setHasChanges(true)}
                className="mt-4 flex flex-col gap-y-1"
              >
                {selectedEmbedder &&
                  EMBEDDERS.find(
                    (embedder) => embedder.value === selectedEmbedder,
                  )?.options(settings)}
              </div>
            </div>
          </form>
        </div>
      )}
      <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
        <ChangeWarningModal
          warningText="Switching the embedding model will reset all previously embedded documents in all workspaces.\n\nConfirming will clear all embeddings from your vector database and remove all documents from your workspaces. Your uploaded documents will not be deleted, they will be available for re-embedding."
          onClose={closeModal}
          onConfirm={handleSaveSettings}
        />
      </ModalWrapper>
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
