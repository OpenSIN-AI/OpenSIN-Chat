// SPDX-License-Identifier: MIT
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import React, { useEffect, useRef, useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import System from "@/models/system";
import showToast from "@/utils/toast";
import {
  AVAILABLE_LLM_PROVIDERS,
  ALL_LLM_PROVIDERS,
  LLM_PREFERENCE_CHANGED_EVENT,
} from "./llmProviders";

// Re-export so other modules can keep importing from the
// page-level entrypoint that the rest of the codebase uses.
export {
  AVAILABLE_LLM_PROVIDERS,
  ALL_LLM_PROVIDERS,
  LLM_PREFERENCE_CHANGED_EVENT,
};
import OpenSINChatIcon from "@/media/logo/opensin-icon.svg";
import PreLoader from "@/components/Preloader";
import LLMItem from "@/components/LLMSelection/LLMItem";
import { CaretUpDown } from "@phosphor-icons/react/dist/csr/CaretUpDown";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import CTAButton from "@/components/lib/CTAButton";
import useLLMProviders from "@/hooks/useLLMProviders";
import ProviderKeyStatusPanel from "@/components/ProviderKeyStatusPanel";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";

interface LLMProvider {
  name: string;
  value: string;
  logo: string;
  options?: (settings: any) => React.ReactNode;
  description: string;
  requiredConfig?: string[];
  connectionConfig?: string[];
}

export default function GeneralLLMPreference() {
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLLMs, setFilteredLLMs] = useState<LLMProvider[]>([]);
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const { keys: settings, isLoading: loading } = useLLMProviders();

  const blocker = useUnsavedChanges(hasChanges);

  useEffect(() => {
    if (settings?.LLMProvider) setSelectedLLM(settings.LLMProvider);
  }, [settings]);

  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const form = (e?.target ??
      document.getElementById("llm-preference-form")) as HTMLFormElement;
    const data: any = { LLMProvider: selectedLLM };
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) data[key] = value;
    setSaving(true);
    try {
      const { error } = await System.updateSystem(data);

      if (error) {
        showToast(t("llmPreference.saveFailed", { error }), "error");
      } else {
        showToast(t("llmPreference.saveSuccess"), "success");
      }
      setHasChanges(!!error);
    } catch (e: any) {
      showToast(
        t("llmPreference.saveFailed", { error: String(e?.message || e) }),
        "error",
      );
      setHasChanges(true);
    } finally {
      setSaving(false);
    }
  };

  const updateLLMChoice = (selection: string) => {
    setSearchQuery("");
    setSelectedLLM(selection);
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
    function updateHasChanges() {
      setHasChanges(true);
    }
    window.addEventListener(LLM_PREFERENCE_CHANGED_EVENT, updateHasChanges);
    return () => {
      window.removeEventListener(
        LLM_PREFERENCE_CHANGED_EVENT,
        updateHasChanges,
      );
    };
  }, []);

  useEffect(() => {
    const filtered = AVAILABLE_LLM_PROVIDERS.filter((llm) =>
      llm.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredLLMs(filtered);
  }, [searchQuery, selectedLLM]);

  useEffect(() => {
    if (!searchMenuOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [searchMenuOpen]);

  const selectedLLMObject = AVAILABLE_LLM_PROVIDERS.find(
    (llm) => llm.value === selectedLLM,
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      {loading ? (
        <LoadingState />
      ) : (
        <ContentArea
          hasChanges={hasChanges}
          saving={saving}
          selectedLLMObject={selectedLLMObject}
          searchMenuOpen={searchMenuOpen}
          filteredLLMs={filteredLLMs}
          selectedLLM={selectedLLM}
          handleXButton={handleXButton}
          handleSubmit={handleSubmit}
          updateLLMChoice={updateLLMChoice}
          setSearchMenuOpen={setSearchMenuOpen}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          settings={settings}
          t={t}
        />
      )}
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

function LoadingState() {
  const isMobile = useIsMobileLayout();
  return (
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
  );
}

function ContentArea({
  hasChanges,
  saving,
  selectedLLMObject,
  searchMenuOpen,
  filteredLLMs,
  selectedLLM,
  handleXButton,
  handleSubmit,
  updateLLMChoice,
  setSearchMenuOpen,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  settings,
  t,
}: {
  hasChanges: boolean;
  saving: boolean;
  selectedLLMObject: LLMProvider | undefined;
  searchMenuOpen: boolean;
  filteredLLMs: LLMProvider[];
  selectedLLM: string | null;
  handleXButton: () => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  updateLLMChoice: (selection: string) => void;
  setSearchMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  settings: any;
  t: any;
}) {
  const isMobile = useIsMobileLayout();
  return (
    <div
      style={
        {
          "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
        } as React.CSSProperties
      }
      className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
    >
      <form
        onSubmit={handleSubmit}
        id="llm-preference-form"
        className="flex w-full"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <Header
            hasChanges={hasChanges}
            saving={saving}
            handleSubmit={handleSubmit}
            t={t}
          />
          <div className="mb-4">
            <ProviderKeyStatusPanel />
          </div>
          <SearchMenu
            searchMenuOpen={searchMenuOpen}
            filteredLLMs={filteredLLMs}
            selectedLLM={selectedLLM}
            selectedLLMObject={selectedLLMObject}
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSearchMenuOpen={setSearchMenuOpen}
            handleXButton={handleXButton}
            updateLLMChoice={updateLLMChoice}
          />
          <OptionsSection selectedLLM={selectedLLM} settings={settings} />
        </div>
      </form>
    </div>
  );
}

function Header({
  hasChanges,
  saving,
  handleSubmit,
  t,
}: {
  hasChanges: boolean;
  saving: boolean;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  t: any;
}) {
  return (
    <>
      <div className="w-full flex flex-col gap-y-1 pb-6 border-white light:border-theme-sidebar-border border-b-2 border-opacity-10">
        <div className="flex gap-x-4 items-center">
          <p className="text-lg leading-6 font-bold text-theme-text-primary">
            {t("llm.title")}
          </p>
        </div>
        <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
          {t("llm.description")}
        </p>
      </div>
      <div className="w-full justify-end flex">
        {hasChanges && (
          <CTAButton
            onClick={() => (handleSubmit as any)()}
            className="mt-3 mr-0 -mb-14 z-10"
          >
            {saving ? t("common.saving") : t("common.save")}
          </CTAButton>
        )}
      </div>
      <div className="text-base font-bold text-theme-text-primary mt-6 mb-4">
        {t("llm.provider")}
      </div>
    </>
  );
}

function SearchMenu({
  searchMenuOpen,
  filteredLLMs,
  selectedLLM,
  selectedLLMObject,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  setSearchMenuOpen,
  handleXButton,
  updateLLMChoice,
}: {
  searchMenuOpen: boolean;
  filteredLLMs: LLMProvider[];
  selectedLLM: string | null;
  selectedLLMObject: LLMProvider | undefined;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSearchMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleXButton: () => void;
  updateLLMChoice: (selection: string) => void;
}) {
  return (
    <div className="relative">
      {searchMenuOpen && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 backdrop-blur-sm z-10"
          onClick={() => setSearchMenuOpen(false)}
        />
      )}
      {searchMenuOpen ? (
        <SearchMenuOpen
          filteredLLMs={filteredLLMs}
          selectedLLM={selectedLLM}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleXButton={handleXButton}
          updateLLMChoice={updateLLMChoice}
        />
      ) : (
        <SearchMenuClosed
          selectedLLMObject={selectedLLMObject}
          setSearchMenuOpen={setSearchMenuOpen}
        />
      )}
    </div>
  );
}

function SearchMenuOpen({
  filteredLLMs,
  selectedLLM,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  handleXButton,
  updateLLMChoice,
}: {
  filteredLLMs: LLMProvider[];
  selectedLLM: string | null;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  handleXButton: () => void;
  updateLLMChoice: (selection: string) => void;
}) {
  const { t } = useTranslation();
  return (
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
            name="llm-search"
            autoComplete="off"
            placeholder={t("llmPreference.searchPlaceholder")}
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
          {filteredLLMs.map((llm) => {
            return (
              <LLMItem
                key={llm.name}
                name={llm.name}
                value={llm.value}
                image={llm.logo}
                description={llm.description}
                checked={selectedLLM === llm.value}
                onClick={() => updateLLMChoice(llm.value)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SearchMenuClosed({
  selectedLLMObject,
  setSearchMenuOpen,
}: {
  selectedLLMObject: LLMProvider | undefined;
  setSearchMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { t } = useTranslation();
  return (
    <button
      aria-label={t("common.selectProvider", "Select provider")}
      className="w-full max-w-[640px] h-[64px] bg-theme-settings-input-bg rounded-lg flex items-center p-[14px] justify-between cursor-pointer border-2 border-transparent hover:border-primary-button transition-all duration-300"
      type="button"
      onClick={() => setSearchMenuOpen(true)}
    >
      <div className="flex gap-x-4 items-center">
        <img
          src={selectedLLMObject?.logo || OpenSINChatIcon}
          alt={`${selectedLLMObject?.name} logo`}
          className="w-10 h-10 rounded-md"
        />
        <div className="flex flex-col text-left">
          <div className="text-sm font-semibold text-theme-text-primary">
            {selectedLLMObject?.name || t("llmPreference.noneSelected")}
          </div>
          <div className="mt-1 text-xs text-description">
            {selectedLLMObject?.description || t("llmPreference.selectLLM")}
          </div>
        </div>
      </div>
      <CaretUpDown
        size={24}
        weight="bold"
        className="text-theme-text-primary"
      />
    </button>
  );
}

function OptionsSection({
  selectedLLM,
  settings,
}: {
  selectedLLM: string | null;
  settings: any;
}) {
  return (
    <div className="mt-4 flex flex-col gap-y-1">
      {selectedLLM &&
        AVAILABLE_LLM_PROVIDERS.find(
          (llm) => llm.value === selectedLLM,
        )?.options?.(settings)}
    </div>
  );
}
