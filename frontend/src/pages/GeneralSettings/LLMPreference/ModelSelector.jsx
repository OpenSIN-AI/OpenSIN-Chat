import React from "react";
import { CaretUpDown } from "@phosphor-icons/react";
import ProviderList from "./ProviderList";

export default function ModelSelector({
  searchQuery,
  setSearchQuery,
  filteredLLMs,
  selectedLLM,
  selectedLLMObject,
  searchMenuOpen,
  setSearchMenuOpen,
  searchInputRef,
  handleXButton,
  updateLLMChoice,
  OpenSINChatIcon,
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
        <ProviderList
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredLLMs={filteredLLMs}
          selectedLLM={selectedLLM}
          selectedLLMObject={selectedLLMObject}
          searchMenuOpen={searchMenuOpen}
          setSearchMenuOpen={setSearchMenuOpen}
          searchInputRef={searchInputRef}
          handleXButton={handleXButton}
          updateLLMChoice={updateLLMChoice}
          OpenSINChatIcon={OpenSINChatIcon}
        />
      ) : (
        <button
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
      )}
    </div>
  );
}
