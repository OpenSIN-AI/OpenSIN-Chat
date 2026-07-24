// SPDX-License-Identifier: MIT

import { useMemo, useState } from "react";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import ChatSidebar, { useChatSidebar } from "../ChatSidebar";
import { PanelHeader } from "@/components/ui/PanelHeader";
import useArtifacts from "@/features/artifacts/useArtifacts";
import ArtifactCard from "@/features/artifacts/ArtifactCard";
import ArtifactPreview from "@/features/artifacts/ArtifactPreview";
import { deleteArtifact } from "@/features/artifacts/api";
import type { Artifact } from "@/features/artifacts/types";

export default function ResultsSidebar({ workspace }: { workspace?: any }) {
  const { activeSidebar, closeSidebar } = useChatSidebar();
  const open = activeSidebar === "results";
  const workspaceSlug = workspace?.slug ?? null;

  const { artifacts, loading, error, reload } = useArtifacts(workspaceSlug, {
    limit: 100,
  });

  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null);

  const sortedArtifacts = useMemo(
    () =>
      [...artifacts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [artifacts],
  );

  async function handleDelete(uuid: string) {
    if (!workspaceSlug) return;
    try {
      await deleteArtifact(workspaceSlug, uuid);
      reload();
    } catch (err) {
      console.error("[ResultsSidebar] Delete failed:", err);
    }
  }

  return (
    <ChatSidebar isOpen={open}>
      <div className="flex h-full flex-col bg-theme-bg-sidebar">
        <div className="border-b border-theme-border px-4 py-4">
          <PanelHeader title="Ergebnisse" onClose={closeSidebar} />
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
            {sortedArtifacts.length > 0
              ? `${sortedArtifacts.length} ${sortedArtifacts.length === 1 ? "Ergebnis" : "Ergebnisse"}`
              : ""}
          </span>
          <button
            type="button"
            onClick={reload}
            aria-label="Aktualisieren"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary hover:text-theme-text-primary"
          >
            <ArrowsClockwise size={13} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-theme-bg-secondary"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center px-6 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : sortedArtifacts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-bg-secondary text-theme-text-secondary">
                <FileText size={22} />
              </div>
              <h2 className="mt-4 text-sm font-medium text-theme-text-primary">
                Noch keine Ergebnisse
              </h2>
              <p className="mt-1 max-w-xs text-xs leading-5 text-theme-text-secondary">
                Berichte, Dokumente, Tabellen und andere erzeugte Dateien
                erscheinen hier.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedArtifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.uuid}
                  artifact={artifact}
                  workspaceSlug={workspaceSlug!}
                  onPreview={setPreviewArtifact}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {previewArtifact && workspaceSlug && (
        <ArtifactPreview
          artifact={previewArtifact}
          workspaceSlug={workspaceSlug}
          onClose={() => setPreviewArtifact(null)}
        />
      )}
    </ChatSidebar>
  );
}
