// SPDX-License-Identifier: MIT

import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import ChatSidebar, { useChatSidebar } from "../ChatSidebar";
import { PanelHeader } from "@/components/ui/PanelHeader";

export default function ResultsSidebar() {
  const { activeSidebar, closeSidebar } = useChatSidebar();
  const open = activeSidebar === "results";

  return (
    <ChatSidebar isOpen={open}>
      <div className="flex h-full flex-col bg-theme-bg-sidebar">
        <div className="border-b border-theme-border px-4 py-4">
          <PanelHeader title="Ergebnisse" onClose={closeSidebar} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-bg-secondary text-theme-text-secondary">
            <FileText size={22} />
          </div>
          <h2 className="mt-4 text-sm font-medium text-theme-text-primary">Noch keine Ergebnisse</h2>
          <p className="mt-1 max-w-xs text-xs leading-5 text-theme-text-secondary">
            Berichte, Dokumente, Tabellen und andere erzeugte Dateien erscheinen hier.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 flex items-center gap-2 rounded-xl border-none bg-theme-bg-secondary px-3 py-2 text-xs font-medium text-theme-text-secondary opacity-60"
          >
            <Plus size={13} />
            Ergebnis erstellen
          </button>
        </div>
      </div>
    </ChatSidebar>
  );
}
