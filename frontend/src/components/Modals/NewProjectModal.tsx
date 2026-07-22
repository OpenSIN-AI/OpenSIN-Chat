// SPDX-License-Identifier: MIT
import { useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { FolderSimplePlus } from "@phosphor-icons/react/dist/csr/FolderSimplePlus";
import { LockSimple } from "@phosphor-icons/react/dist/csr/LockSimple";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import ModalWrapper from "@/components/ModalWrapper";

interface NewProjectModalProps {
  workspace: { slug: string; name?: string };
  hideModal: () => void;
  onCreated: (folder: any) => void;
}

export default function NewProjectModal({
  workspace,
  hideModal,
  onCreated,
}: NewProjectModalProps) {
  const { t } = useTranslation();
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const name = projectName.trim();
    if (!name) {
      setError(t("projects.nameRequired", "Projektname ist erforderlich."));
      return;
    }

    setIsSubmitting(true);
    try {
      const { folder, message } = await Workspace.threads.folders.new(
        workspace.slug,
        name,
      );
      if (message || !folder) {
        setError(message || t("projects.createError", "Projekt konnte nicht erstellt werden."));
        return;
      }

      showToast(
        t("projects.createSuccess", "Projekt {{name}} erstellt", { name }),
        "success",
      );
      onCreated(folder);
      hideModal();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={true} closeModal={hideModal}>
      <div className="w-full max-w-md bg-theme-bg-secondary rounded-xl shadow-2xl shadow-black/50 border border-theme-modal-border overflow-hidden">
        <div className="relative px-5 py-4 border-b border-theme-modal-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderSimplePlus size={18} className="text-theme-text-primary" />
            <h3 className="text-sm font-semibold text-theme-text-primary">
              {t("projects.modalTitle", "Neues Projekt erstellen")}
            </h3>
          </div>
          <button
            type="button"
            onClick={hideModal}
            aria-label={t("common.close")}
            className="text-theme-text-secondary hover:text-theme-text-primary p-1 rounded-md transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label
              htmlFor="project-name"
              className="block mb-1.5 text-xs font-medium text-theme-text-secondary"
            >
              {t("projects.nameLabel", "Projektname")}
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t("projects.namePlaceholder", "z.B. API Gateway, Politik-Forschung...")}
              className="w-full h-9 px-3 rounded-lg bg-theme-settings-input-bg border border-theme-modal-border text-sm text-theme-text-primary outline-none focus:border-zinc-400"
              autoFocus
              required
            />
          </div>

          {/* GitHub clone — disabled until backend integration is real */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-theme-bg-secondary/50 border border-theme-modal-border/50 opacity-60">
            <LockSimple size={14} className="text-theme-text-muted flex-shrink-0" />
            <span className="text-xs text-theme-text-muted">
              {t("projects.githubComingSoon", "GitHub-Klonen: Demnächst verfügbar")}
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 p-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={hideModal}
              className="px-3 h-8 text-xs font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors"
            >
              {t("common.cancel", "Abbrechen")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "..." : t("projects.createBtn", "Projekt erstellen")}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
