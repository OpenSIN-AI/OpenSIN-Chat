// SPDX-License-Identifier: MIT
// Purpose: Loading + live embedding-progress panels for the workspace
// document directory. Shows concrete, accessible batch-embedding progress
// (processed/total + per-file state) driven by EmbeddingProgressContext SSE.
// Docs: none (co-located with WorkspaceDirectory; no separate doc.md required).
import { LoadingState as SkeletonLoadingState } from "@/components/ui/LoadingState";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useTranslation } from "react-i18next";

const STATUS_LABEL_KEYS: Record<string, string> = {
  pending: "directoryStates.statusQueued",
  embedding: "directoryStates.statusEmbedding",
  complete: "directoryStates.statusComplete",
  failed: "directoryStates.statusFailed",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "text-theme-text-secondary bg-white/10",
  embedding: "text-sky-300 bg-sky-500/15",
  complete: "text-green-300 bg-green-500/15",
  failed: "text-red-300 bg-red-500/15",
};

export function LoadingState({ workspace, loadingMessage }: any) {
  return (
    <div className="px-8">
      <div className="flex items-center justify-start w-[560px]">
        <h3 className="text-theme-text-primary text-base font-bold ml-5">
          {workspace.name}
        </h3>
      </div>
      <div
        className="relative w-[560px] h-[445px] bg-theme-settings-input-bg rounded-2xl mt-5 border border-theme-modal-border"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <SkeletonLoadingState label={loadingMessage} rows={8} />
      </div>
    </div>
  );
}

export function EmbeddingProgressState({
  workspace,
  embeddingProgress,
  hasChanges,
  movedItems,
  handleSaveChanges,
  removeQueuedFile,
}: any) {
  const { t } = useTranslation();
  const entries = Object.entries(embeddingProgress);
  const total = entries.length;
  const completed = entries.filter(
    ([, s]) => (s as any).status === "complete",
  ).length;
  const inProgress = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const summary = t("directoryStates.summary", {
    done: completed,
    total,
  });

  return (
    <div className="px-8">
      <div className="flex items-center justify-start w-[560px]">
        <h3 className="text-theme-text-primary text-base font-bold ml-5">
          {workspace.name}
        </h3>
      </div>
      <div
        className="relative w-[560px] h-[445px] bg-theme-settings-input-bg rounded-2xl mt-5 border border-theme-modal-border flex flex-col"
        role="status"
        aria-live="polite"
        aria-busy={inProgress > 0 ? "true" : "false"}
      >
        <div className="text-theme-text-primary text-xs grid grid-cols-12 py-2 px-3.5 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg sticky top-0 z-10 rounded-t-2xl">
          <div className="col-span-8 flex items-center gap-x-[4px]">
            <div className="shrink-0 w-3 h-3" />
            <p className="ml-[7px] text-theme-text-primary">
              {t("directoryStates.name")}
            </p>
          </div>
          <p className="col-span-4 text-right text-theme-text-primary pr-1">
            {t("directoryStates.status")}
          </p>
        </div>

        {/* Overall progress: processed/total with an accessible progressbar. */}
        <div className="px-3.5 py-3 border-b border-white/10">
          <div className="flex items-center justify-between text-xs text-theme-text-primary mb-1.5">
            <span>{summary}</span>
            <span className="text-theme-text-secondary">{pct}%</span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-white/10 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
            aria-valuetext={summary}
          >
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {entries.map(([filename, fileStatus]) => {
            const fs = fileStatus as {
              status: string;
              chunksProcessed?: number;
              totalChunks?: number;
              error?: string;
              [key: string]: any;
            };
            return (
              <EmbeddingFileRow
                key={filename}
                filename={filename}
                status={fs}
                onRemove={
                  fs.status === "pending"
                    ? () => removeQueuedFile(workspace.slug, filename)
                    : null
                }
              />
            );
          })}
        </div>
      </div>
      {hasChanges && movedItems.length > 0 && (
        <div className="flex items-center justify-between w-[560px] mt-3">
          <p className="text-theme-text-secondary text-sm">
            {t("directoryStates.additionalFilesReady", {
              count: movedItems.length,
            })}
          </p>
          <button
            type="button"
            onClick={handleSaveChanges}
            aria-label={t("directoryStates.addToEmbeddingQueue")}
            className="border border-slate-200 px-5 py-1.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
          >
            {t("directoryStates.addToQueue")}
          </button>
        </div>
      )}
    </div>
  );
}

function EmbeddingFileRow({ filename, status, onRemove }: any) {
  const { t } = useTranslation();
  const labelKey =
    STATUS_LABEL_KEYS[status.status] ?? "directoryStates.statusQueued";
  const badgeClass =
    STATUS_BADGE_CLASS[status.status] ??
    "text-theme-text-secondary bg-white/10";
  const showChunks =
    status.status === "embedding" &&
    typeof status.totalChunks === "number" &&
    status.totalChunks > 0;

  return (
    <div className="px-3.5 py-2 text-xs text-theme-text-primary grid grid-cols-12 border-b border-white/10 hover:bg-white/5">
      <div className="col-span-8 flex flex-col gap-y-0.5 min-w-0">
        <span className="truncate" title={filename}>
          {filename}
        </span>
        {showChunks && (
          <span className="text-theme-text-secondary text-[10px]">
            {t("directoryStates.chunkProgress", {
              done: status.chunksProcessed ?? 0,
              total: status.totalChunks,
            })}
          </span>
        )}
        {status.status === "failed" && status.error && (
          <span
            className="text-red-300 text-[10px] truncate"
            title={status.error}
          >
            {status.error}
          </span>
        )}
      </div>
      <div className="col-span-4 flex items-center justify-end gap-x-2">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClass}`}
        >
          {t(labelKey)}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("directoryStates.removeFromEmbeddingQueue")}
            className="hover:text-red-400"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
