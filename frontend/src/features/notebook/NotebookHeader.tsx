// SPDX-License-Identifier: MIT

import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { Note } from "@phosphor-icons/react/dist/csr/Note";
import { Stack } from "@phosphor-icons/react/dist/csr/Stack";
import { NOTEBOOK_SECTIONS, type NotebookSectionId } from "./sections";

interface NotebookHeaderProps {
  notebookName: string;
  activeSection: NotebookSectionId;
  onSectionChange: (section: NotebookSectionId) => void;
  sourceCount?: number;
  noteCount?: number;
  resultCount?: number;
}

const SECTION_ICONS: Record<NotebookSectionId, typeof ChatCircle> = {
  chat: ChatCircle,
  sources: Stack,
  notes: Note,
  results: FileText,
};

export default function NotebookHeader({ notebookName, activeSection, onSectionChange, sourceCount = 0, noteCount = 0, resultCount = 0 }: NotebookHeaderProps) {
  function sectionCount(section: NotebookSectionId): number | null {
    if (section === "sources") return sourceCount;
    if (section === "notes") return noteCount;
    if (section === "results") return resultCount;
    return null;
  }

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-theme-border bg-theme-bg-primary pl-3 pr-14 sm:pl-5 md:pr-16">
      <div className="min-w-0 shrink">
        <h1 className="truncate text-sm font-semibold text-theme-text-primary">{notebookName || "Unbenanntes Notebook"}</h1>
      </div>
      <nav aria-label="Notebook-Bereiche" className="no-scroll ml-auto flex min-w-0 items-center gap-1 overflow-x-auto">
        {Object.values(NOTEBOOK_SECTIONS).map((section) => {
          const active = activeSection === section.id;
          const Icon = SECTION_ICONS[section.id];
          const count = sectionCount(section.id);
          return (
            <button
              key={section.id}
              type="button"
              title={section.description}
              aria-pressed={active}
              onClick={() => onSectionChange(section.id)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border-none px-2.5 text-xs font-medium transition-colors ${
                active ? "bg-theme-bg-secondary text-theme-text-primary" : "bg-transparent text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary"
              }`}
            >
              <Icon size={15} weight={active ? "fill" : "regular"} />
              <span className="hidden lg:inline">{section.label}</span>
              {count !== null && count > 0 && <span className="rounded-full bg-theme-bg-tertiary px-1.5 py-0.5 text-[9px] text-theme-text-secondary">{count}</span>}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
