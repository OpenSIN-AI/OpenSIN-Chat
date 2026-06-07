// SPDX-License-Identifier: MIT
import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useChatSidebar } from "../../ChatSidebar";

const FILTERS = [
  { key: "all", labelKey: "chat_window.source_filter_all" },
  { key: "documents", labelKey: "chat_window.source_filter_documents" },
  { key: "media", labelKey: "chat_window.source_filter_media" },
];

export default function SourceFilterRow({ onClose }) {
  const { t } = useTranslation();
  const { sourceFilter, setSourceFilter } = useChatSidebar();
  const [showSubmenu, setShowSubmenu] = useState(false);

  function handleFilterChange(filterKey) {
    setSourceFilter(filterKey);
    onClose();
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <div
        className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${showSubmenu ? "bg-zinc-700 light:bg-slate-200" : "hover:bg-zinc-700 light:hover:bg-slate-200"}`}
      >
        <span className="text-sm font-normal text-white light:text-slate-800">
          {t("chat_window.source_filter_label")}
        </span>
        <CaretRight
          size={14}
          weight="bold"
          className="text-zinc-50 light:text-slate-800"
        />
      </div>
      {showSubmenu && (
        <SourceFilterSubmenu
          currentFilter={sourceFilter}
          onFilterChange={handleFilterChange}
        />
      )}
    </div>
  );
}

function SourceFilterSubmenu({ currentFilter, onFilterChange }) {
  const { t } = useTranslation();

  return (
    <div className="absolute right-full top-0 -mr-2 pr-2 pt-0">
      <div className="bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-300 rounded-lg p-3.5 w-[140px] flex flex-col gap-1.5 shadow-lg">
        {FILTERS.map(({ key, labelKey }) => (
          <div
            key={key}
            onClick={() => onFilterChange(key)}
            className={`px-2 py-1 rounded cursor-pointer text-sm font-normal text-white light:text-slate-800 ${currentFilter === key ? "bg-zinc-700 light:bg-slate-200" : "hover:bg-zinc-700/50 light:hover:bg-slate-100"}`}
          >
            {t(labelKey)}
          </div>
        ))}
      </div>
    </div>
  );
}
