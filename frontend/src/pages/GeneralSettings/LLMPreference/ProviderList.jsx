import React from "react";
import LLMItem from "@/components/LLMSelection/LLMItem";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

export default function ProviderList({
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
