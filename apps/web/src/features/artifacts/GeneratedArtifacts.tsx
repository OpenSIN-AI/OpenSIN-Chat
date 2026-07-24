// SPDX-License-Identifier: MIT

import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import ArtifactCard from "./ArtifactCard";
import ArtifactPreview from "./ArtifactPreview";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Artifact } from "./types";

export default function GeneratedArtifacts({
  artifacts,
  workspaceSlug,
}: {
  artifacts: Artifact[];
  workspaceSlug: string;
}) {
  const { t } = useTranslation();
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null);

  if (!artifacts || artifacts.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkle size={13} className="text-theme-text-muted" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
          {artifacts.length === 1
            ? t("artifacts.result")
            : t("artifacts.results", { count: artifacts.length })}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {artifacts.map((artifact) => (
          <ArtifactCard
            key={artifact.uuid}
            artifact={artifact}
            workspaceSlug={workspaceSlug}
            onPreview={setPreviewArtifact}
          />
        ))}
      </div>
      {previewArtifact && (
        <ArtifactPreview
          artifact={previewArtifact}
          workspaceSlug={workspaceSlug}
          onClose={() => setPreviewArtifact(null)}
        />
      )}
    </div>
  );
}
