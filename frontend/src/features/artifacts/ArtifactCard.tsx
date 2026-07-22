// SPDX-License-Identifier: MIT

import { Download } from "@phosphor-icons/react/dist/csr/Download";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import ArtifactIcon from "./ArtifactIcon";
import { artifactDownloadUrl } from "./api";
import type { Artifact } from "./types";

export default function ArtifactCard({
  artifact,
  workspaceSlug,
  onPreview,
  onDelete,
}: {
  artifact: Artifact;
  workspaceSlug: string;
  onPreview?: (artifact: Artifact) => void;
  onDelete?: (uuid: string) => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-theme-border bg-theme-bg-primary p-3 transition-colors hover:border-theme-text-muted/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-theme-bg-tertiary text-theme-text-secondary">
        <ArtifactIcon type={artifact.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-theme-text-primary">
          {artifact.title}
        </p>
        {artifact.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-theme-text-secondary">
            {artifact.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-[10px] text-theme-text-muted">
          <span>{artifact.type}</span>
          {artifact.version > 1 && <span>v{artifact.version}</span>}
          <span>
            {new Date(artifact.createdAt).toLocaleDateString("de-DE", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onPreview && (
          <button
            type="button"
            onClick={() => onPreview(artifact)}
            aria-label="Vorschau"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary hover:text-theme-text-primary"
          >
            <Eye size={14} />
          </button>
        )}
        <a
          href={artifactDownloadUrl(workspaceSlug, artifact.uuid)}
          download={artifact.downloadName || undefined}
          aria-label="Herunterladen"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary hover:text-theme-text-primary"
        >
          <Download size={14} />
        </a>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(artifact.uuid)}
            aria-label="Löschen"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-text-muted hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
