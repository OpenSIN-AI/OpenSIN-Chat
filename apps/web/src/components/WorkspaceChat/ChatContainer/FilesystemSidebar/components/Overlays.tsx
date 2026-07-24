// SPDX-License-Identifier: MIT
// Drag overlay and upload progress overlay
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { SpinnerGap } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { useTranslation } from "react-i18next";

interface OverlaysProps {
  isDragOver: boolean;
  uploading: boolean;
  uploadProgress: { current: number; total: number; name: string };
}

export function Overlays({
  isDragOver,
  uploading,
  uploadProgress,
}: OverlaysProps) {
  const { t } = useTranslation();

  return (
    <>
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-zinc-900/95 light:bg-white/95 flex items-center justify-center rounded-2xl border-2 border-dashed border-zinc-600 light:border-slate-400">
          <div className="flex flex-col items-center gap-3">
            <CloudArrowUp
              size={48}
              weight="duotone"
              className="text-zinc-300 light:text-slate-400"
            />
            <p className="text-lg font-semibold text-theme-text-primary light:text-theme-text-primary">
              {t("sidebar.filesystem.dropHere")}
            </p>
            <p className="text-sm text-zinc-400 light:text-slate-500">
              {t("sidebar.filesystem.dropHint")}
            </p>
          </div>
        </div>
      )}

      {uploading && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-zinc-800/95 light:bg-slate-800/95 px-4 py-2 flex items-center gap-3">
          <SpinnerGap
            size={16}
            weight="bold"
            className="text-theme-text-primary animate-spin flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-theme-text-primary truncate">
              {uploadProgress.name}
            </p>
            <div className="mt-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{
                  width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <span className="text-xs text-theme-text-primary flex-shrink-0">
            {uploadProgress.current + 1}/{uploadProgress.total}
          </span>
        </div>
      )}
    </>
  );
}
