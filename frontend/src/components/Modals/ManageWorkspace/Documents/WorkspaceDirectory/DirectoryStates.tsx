// SPDX-License-Identifier: MIT
import PreLoader from "@/components/Preloader";
import { X } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";

export function LoadingState({ workspace, loadingMessage }: any as any) {
  return (
    <div className="px-8">
      <div className="flex items-center justify-start w-[560px]">
        <h3 className="text-white text-base font-bold ml-5">{workspace.name}</h3>
      </div>
      <div className="relative w-[560px] h-[445px] bg-theme-settings-input-bg rounded-2xl mt-5 border border-theme-modal-border">
        <div className="w-full h-[calc(100%-40px)] flex items-center justify-center flex-col gap-y-5">
          <PreLoader />
          <p className="text-theme-text-primary text-sm font-semibold animate-pulse text-center w-1/3">
            {loadingMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmbeddingProgressState({
  workspace, embeddingProgress, hasChanges, movedItems, handleSaveChanges, removeQueuedFile, }: any as any) {
  return (
    <div className="px-8">
      <div className="flex items-center justify-start w-[560px]">
        <h3 className="text-white text-base font-bold ml-5">{workspace.name}</h3>
      </div>
      <div className="relative w-[560px] h-[445px] bg-theme-settings-input-bg rounded-2xl mt-5 border border-theme-modal-border">
        <div className="text-white/80 text-xs grid grid-cols-12 py-2 px-3.5 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg sticky top-0 z-10 rounded-t-2xl">
          <div className="col-span-8 flex items-center gap-x-[4px]">
            <div className="shrink-0 w-3 h-3" />
            <p className="ml-[7px] text-theme-text-primary">Name</p>
          </div>
          <p className="col-span-4 text-right text-theme-text-primary pr-1">
            Status
          </p>
        </div>
        <div className="overflow-y-auto h-[calc(100%-40px)]">
          {Object.entries(embeddingProgress).map(([filename, fileStatus]) => (
            <EmbeddingFileRow
              key={filename}
              filename={filename}
              status={fileStatus}
              onRemove={
                fileStatus.status === "pending"
                  ? () => removeQueuedFile(workspace.slug, filename)
                  : null
              }
            />
          ))}
        </div>
      </div>
      {hasChanges && movedItems.length > 0 && (
        <div className="flex items-center justify-between w-[560px] mt-3">
          <p className="text-theme-text-secondary text-sm">
            {movedItems.length} additional file(s) ready to embed
          </p>
          <button
            onClick={handleSaveChanges}
            className="border border-slate-200 px-5 py-1.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
          >
            Add to queue
          </button>
        </div>
      )}
    </div>
  );
}

function EmbeddingFileRow({ filename, status, onRemove }: any) {
  return (
    <div className="px-3.5 py-2 text-xs text-white/80 grid grid-cols-12 border-b border-white/10 hover:bg-white/5">
      <div className="col-span-8 flex items-center gap-x-2">
        <span className="truncate">{filename}</span>
      </div>
      <div className="col-span-4 flex items-center justify-end gap-x-2">
        <span className="text-theme-text-secondary">{status.status}</span>
        {onRemove && (
          <button onClick={onRemove} className="hover:text-red-400">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
