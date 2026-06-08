// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import System from "@/models/system";
import showToast from "@/utils/toast";
import {
  AVAILABLE_LLM_PROVIDERS,
  ALL_LLM_PROVIDERS,
  LLM_PREFERENCE_CHANGED_EVENT,
} from "./llmProviders.jsx";

// Re-export so other modules can keep importing from the
// page-level entrypoint that the rest of the codebase uses.
export { AVAILABLE_LLM_PROVIDERS, ALL_LLM_PROVIDERS, LLM_PREFERENCE_CHANGED_EVENT };
import OpenAfDChatIcon from "@/media/logo/openafd-icon.svg";
import PreLoader from "@/components/Preloader";
import LLMItem from "@/components/LLMSelection/LLMItem";
import { CaretUpDown, MagnifyingGlass, X } from "@phosphor-icons/react";
import CTAButton from "@/components/lib/CTAButton";

export default function GeneralLLMPreference() {
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLLMs, setFilteredLLMs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = { LLMProvider: selectedLLM };
    const formData = new FormData(form);

    for (var [key, value] of formData.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    setSaving(true);

    if (error) {
      showToast(`Failed to save LLM settings: ${error}`, "error");
    } else {
      showToast("LLM preferences saved successfully.", "success");
    }
    setSaving(false);
    setHasChanges(!!error);
  };

  const updateLLMChoice = (selection) => {
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
    async function fetchKeys() {
      const _settings = await System.keys();
      setSettings(_settings);
      setSelectedLLM(_settings?.LLMProvider);
      setLoading(false);
    }
    fetchKeys();
  }, []);

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
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className={`${isMobile ? "h-full" : "h-[calc(100%-32px)]"} relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0`
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
}) {
  return (
    <div
      className={`${isMobile ? "h-full" : "h-[calc(100%-32px)]"} relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0`
    >
      <form onSubmit={handleSubmit} className="flex w-full">
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <Header hasChanges={hasChanges} saving={saving} handleSubmit={handleSubmit} t={t} />
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

function Header({ hasChanges, saving, handleSubmit, t }) {
  return (
    <>
      <div className="w-full flex flex-col gap-y-1 pb-6 border-white light:border-theme-sidebar-border border-b-2 border-opacity-10">
        <div className="flex gap-x-4 items-center">
          <p className="text-lg leading-6 font-bold text-white">
            {t("llm.title")}
          </p>
        </div>
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60">
          {t("llm.description")}
        </p>
      </div>
      <div className="w-full justify-end flex">
        {hasChanges && (
          <CTAButton
            onClick={() => handleSubmit()}
            className="mt-3 mr-0 -mb-14 z-10"
          >
            {saving ? "Saving..." : "Save changes"}
          </CTAButton>
        )}
      </div>
      <div className="text-base font-bold text-white mt-6 mb-4">
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
}) {
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
            placeholder="Search all LLM providers"
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
            className="cursor-pointer text-white hover:text-x-button"
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

function SearchMenuClosed({ selectedLLMObject, setSearchMenuOpen }) {
  return (
    <button
      className="w-full max-w-[640px] h-[64px] bg-theme-settings-input-bg rounded-lg flex items-center p-[14px] justify-between cursor-pointer border-2 border-transparent hover:border-primary-button transition-all duration-300"
      type="button"
      onClick={() => setSearchMenuOpen(true)}
    >
      <div className="flex gap-x-4 items-center">
        <img
          src={selectedLLMObject?.logo || OpenAfDChatIcon}
          alt={`${selectedLLMObject?.name} logo`}
          className="w-10 h-10 rounded-md"
        />
        <div className="flex flex-col text-left">
          <div className="text-sm font-semibold text-white">
            {selectedLLMObject?.name || "None selected"}
          </div>
          <div className="mt-1 text-xs text-description">
            {selectedLLMObject?.description ||
              "You need to select an LLM"}
          </div>
        </div>
      </div>
      <CaretUpDown
        size={24}
        weight="bold"
        className="text-white"
      />
    </button>
  );
}

function OptionsSection({ selectedLLM, settings }) {
  return (
    <div className="mt-4 flex flex-col gap-y-1">
      {selectedLLM &&
        AVAILABLE_LLM_PROVIDERS.find(
          (llm) => llm.value === selectedLLM,
        )?.options?.(settings)}
    </div>
  );
}

