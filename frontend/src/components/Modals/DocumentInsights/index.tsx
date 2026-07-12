// SPDX-License-Identifier: MIT
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import Transformations, {
  Transformation,
  DocumentInsight,
} from "@/models/transformation";
import showToast from "@/utils/toast";
import logger from "@/utils/logger";

export default function DocumentInsightsModal({
  workspace,
  docPath,
  docId,
  docTitle,
  closeModal,
}: {
  workspace: any;
  docPath: string;
  docId: string;
  docTitle: string;
  closeModal: () => void;
}) {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [insights, setInsights] = useState<DocumentInsight[]>([]);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [t, i] = await Promise.all([
      Transformations.all(),
      Transformations.insightsFor(workspace.slug, docId),
    ]);
    setTransformations(t);
    setInsights(i);
    setLoading(false);
  }, [workspace.slug, docId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyTransformation = async (transformation: Transformation) => {
    if (runningId !== null) return;
    setRunningId(transformation.id);
    try {
      const { insight, error } = await Transformations.apply(
        workspace.slug,
        docPath,
        transformation.id,
      );
      if (error || !insight) {
        showToast(error || "Transformation failed.", "error", { clear: true });
        return;
      }
      setInsights((prev) => [insight, ...prev]);
      showToast(`"${transformation.name}" applied.`, "success", {
        clear: true,
      });
    } catch (e: any) {
      logger.error(e);
      showToast(`Error: ${e.message}`, "error", { clear: true });
    } finally {
      setRunningId(null);
    }
  };

  const deleteInsight = async (id: number) => {
    const ok = await Transformations.deleteInsight(workspace.slug, id);
    if (!ok) {
      showToast("Failed to delete insight.", "error", { clear: true });
      return;
    }
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Insights for ${docTitle}`}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-lg border border-theme-modal-border bg-theme-bg-secondary shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-theme-modal-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-theme-text-primary">
              Insights
            </h2>
            <p className="text-xs text-theme-text-secondary truncate">
              {docTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="text-theme-text-secondary hover:text-theme-text-primary transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-y-6">
          {/* Apply Transformations */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary mb-2">
              Apply Transformation
            </h3>
            <div className="flex flex-wrap gap-2">
              {transformations.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={runningId !== null}
                  onClick={() => applyTransformation(t)}
                  title={t.description ?? t.prompt}
                  className="flex items-center gap-x-1.5 rounded-full border border-theme-modal-border px-3 py-1.5 text-xs text-theme-text-primary hover:bg-theme-sidebar-item-hover disabled:opacity-50 transition-colors"
                >
                  {runningId === t.id ? (
                    <CircleNotch
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkle size={14} weight="fill" aria-hidden="true" />
                  )}
                  {t.name}
                </button>
              ))}
              {!loading && transformations.length === 0 && (
                <p className="text-xs text-theme-text-secondary">
                  No transformations defined yet.
                </p>
              )}
            </div>
          </section>

          {/* Saved Insights */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary mb-2">
              {t("documentInsights.savedInsights", { count: insights.length })}
            </h3>
            {loading ? (
              <p className="text-xs text-theme-text-secondary">
                {t("common.loading")}
              </p>
            ) : insights.length === 0 ? (
              <p className="text-xs text-theme-text-secondary">
                {t("documentInsights.noInsights")}
              </p>
            ) : (
              <ul className="flex flex-col gap-y-3">
                {insights.map((insight) => (
                  <li
                    key={insight.id}
                    className="rounded-lg border border-theme-modal-border p-4"
                  >
                    <div className="flex items-start justify-between gap-x-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-theme-text-primary">
                          {insight.title}
                        </p>
                        <p className="text-[10px] text-theme-text-secondary">
                          {insight.transformation?.name ?? ""} &middot;{" "}
                          {new Date(insight.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteInsight(insight.id)}
                        aria-label="Delete insight"
                        className="text-theme-text-secondary hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-theme-text-primary whitespace-pre-wrap leading-relaxed">
                      {insight.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
