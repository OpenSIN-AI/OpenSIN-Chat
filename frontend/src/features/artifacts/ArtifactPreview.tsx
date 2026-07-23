// SPDX-License-Identifier: MIT

import { X } from "@phosphor-icons/react/dist/csr/X";
import { Download } from "@phosphor-icons/react/dist/csr/Download";
import { useTranslation } from "react-i18next";
import ModalWrapper from "@/components/ModalWrapper";
import ArtifactIcon from "./ArtifactIcon";
import { artifactDownloadUrl } from "./api";
import type { Artifact } from "./types";

export default function ArtifactPreview({
  artifact,
  workspaceSlug,
  onClose,
}: {
  artifact: Artifact;
  workspaceSlug: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isImage = artifact.type === "image";
  const isText = artifact.type === "text" || artifact.type === "code" || artifact.type === "json";
  const downloadUrl = artifactDownloadUrl(workspaceSlug, artifact.uuid);

  return (
    <ModalWrapper isOpen={true} closeModal={onClose}>
      <div className="flex max-h-[90vh] w-[min(800px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-bg-primary shadow-2xl">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-theme-border px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-bg-tertiary text-theme-text-secondary">
            <ArtifactIcon type={artifact.type} />
          </div>
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-theme-text-primary">
            {artifact.title}
          </h2>
          <a
            href={downloadUrl}
            download={artifact.downloadName || undefined}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary hover:text-theme-text-primary"
            aria-label={t("artifacts.download")}
          >
            <Download size={15} />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("artifacts.close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary hover:text-theme-text-primary"
          >
            <X size={15} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {isImage ? (
            <div className="flex items-center justify-center">
              <img
                src={downloadUrl}
                alt={artifact.title}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          ) : isText && artifact.content ? (
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-theme-bg-secondary p-4 text-xs text-theme-text-primary">
              {artifact.content}
            </pre>
          ) : artifact.content ? (
            <div className="text-sm text-theme-text-primary">
              {artifact.content}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <p className="text-sm text-theme-text-secondary">
                {t("artifacts.noPreview")}
              </p>
              <a
                href={downloadUrl}
                download={artifact.downloadName || undefined}
                className="mt-3 rounded-lg bg-theme-bg-secondary px-3 py-2 text-xs font-medium text-theme-text-primary hover:bg-theme-bg-tertiary"
              >
                {t("artifacts.downloadFile")}
              </a>
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
