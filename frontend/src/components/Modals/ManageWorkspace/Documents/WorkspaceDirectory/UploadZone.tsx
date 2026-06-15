import PreLoader from "@/components/Preloader";
import { EmbeddingFileRow } from "./EmbeddingFileRow";
import { useTranslation } from "react-i18next";

interface UploadZoneProps {
  loading: boolean;
  loadingMessage: string;
  workspace: any;
  embeddingProgress: Record<string, any> | null;
  removeQueuedFile: (slug: string, filename: string) => void;
  hasChanges: boolean;
  movedItems: any[];
  handleSaveChanges: (e: React.MouseEvent) => void;
}

export function UploadZone({
  loading,
  loadingMessage,
  workspace,
  embeddingProgress,
  removeQueuedFile,
  hasChanges,
  movedItems,
  handleSaveChanges,
}: UploadZoneProps) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="px-8">
        <div className="flex items-center justify-start w-[560px]">
          <h3 className="text-white text-base font-bold ml-5">
            {workspace.name}
          </h3>
        </div>
        <div className="relative w-[560px] h-[445px] bg-theme-settings-input-bg rounded-2xl mt-5 border border-theme-modal-border">
          <div className="w-full h-[calc(100%-40px)] flex items-center justify-center flex-col gap-y-5">
            <PreLoader />
            <p className="text-theme-text-primary text-sm font-semibold animate-pulse text-center w-1/3">
              {t(
                "modals.manageWorkspace.documents.workspaceDirectory.uploadZone.loadingMessage",
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (embeddingProgress) {
    return (
      <div className="px-8">
        <div className="flex items-center justify-start w-[560px]">
          <h3 className="text-white text-base font-bold ml-5">
            {workspace.name}
          </h3>
        </div>
        <div className="relative w-[560px] h-[445px] bg-theme-settings-input-bg rounded-2xl mt-5 border border-theme-modal-border">
          <div className="text-white/80 text-xs grid grid-cols-12 py-2 px-3.5 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg sticky top-0 z-10 rounded-t-2xl">
            <div className="col-span-8 flex items-center gap-x-[4px]">
              <div className="shrink-0 w-3 h-3" />
              <p className="ml-[7px] text-theme-text-primary">
                {t(
                  "modals.manageWorkspace.documents.workspaceDirectory.uploadZone.name",
                )}
              </p>
            </div>
            <p className="col-span-4 text-right text-theme-text-primary pr-1">
              {t(
                "modals.manageWorkspace.documents.workspaceDirectory.uploadZone.status",
              )}
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
                    : undefined
                }
              />
            ))}
          </div>
        </div>
        {hasChanges && movedItems.length > 0 && (
          <div className="flex items-center justify-between w-[560px] mt-3">
            <p className="text-theme-text-secondary text-sm">
              {t(
                "modals.manageWorkspace.documents.workspaceDirectory.uploadZone.additionalFilesReady",
                { count: movedItems.length },
              )}
            </p>
            <button
              onClick={handleSaveChanges}
              className="border border-slate-200 px-5 py-1.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:opacity-80 whitespace-nowrap"
            >
              {t(
                "modals.manageWorkspace.documents.workspaceDirectory.uploadZone.addToQueue",
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
