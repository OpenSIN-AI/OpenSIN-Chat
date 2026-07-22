// SPDX-License-Identifier: MIT
import { useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { FolderSimplePlus } from "@phosphor-icons/react/dist/csr/FolderSimplePlus";
import { GitBranch } from "@phosphor-icons/react/dist/csr/GitBranch";
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
  const [tab, setTab] = useState<"create" | "github">("create");
  const [projectName, setProjectName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    let name = projectName.trim();
    if (tab === "github") {
      if (!githubUrl.trim()) {
        setError(t("projects.githubUrlRequired", "GitHub Repository URL ist erforderlich."));
        return;
      }
      // Extract repo name if name not explicitly provided
      if (!name) {
        const parts = githubUrl.trim().replace(/\.git$/, "").split("/");
        name = parts[parts.length - 1] || "GitHub Repo";
      }
    }

    if (!name) {
      setError(t("projects.nameRequired", "Projektname ist erforderlich."));
      return;
    }

    setIsSubmitting(true);
    try {
      const finalName = tab === "github" ? `📦 ${name}` : name;
      const { folder, message } = await Workspace.threads.folders.new(
        workspace.slug,
        finalName,
      );
      if (message || !folder) {
        setError(message || t("projects.createError", "Projekt konnte nicht erstellt werden."));
        return;
      }

      showToast(
        tab === "github"
          ? t("projects.clonedSuccess", "GitHub-Projekt {{name}} erstellt", { name })
          : t("projects.createSuccess", "Projekt {{name}} erstellt", { name }),
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

        {/* Tab Selection */}
        <div className="px-5 pt-3 flex gap-2 border-b border-theme-modal-border">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === "create"
                ? "border-blue-500 text-theme-text-primary"
                : "border-transparent text-theme-text-muted hover:text-theme-text-primary"
            }`}
          >
            {t("projects.tabCreate", "Projektverzeichnis")}
          </button>
          <button
            type="button"
            onClick={() => setTab("github")}
            className={`flex-1 py-2 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              tab === "github"
                ? "border-blue-500 text-theme-text-primary"
                : "border-transparent text-theme-text-muted hover:text-theme-text-primary"
            }`}
          >
            <GitBranch size={14} />
            {t("projects.tabGithub", "Aus GitHub klonen")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {tab === "create" ? (
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
          ) : (
            <>
              <div>
                <label
                  htmlFor="github-url"
                  className="block mb-1.5 text-xs font-medium text-theme-text-secondary"
                >
                  {t("projects.githubUrlLabel", "GitHub Repository URL")}
                </label>
                <input
                  id="github-url"
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="w-full h-9 px-3 rounded-lg bg-theme-settings-input-bg border border-theme-modal-border text-sm text-theme-text-primary outline-none focus:border-zinc-400"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="project-name-optional"
                    className="block mb-1.5 text-xs font-medium text-theme-text-secondary"
                  >
                    {t("projects.customNameLabel", "Projektname (optional)")}
                  </label>
                  <input
                    id="project-name-optional"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Repository-Name"
                    className="w-full h-9 px-3 rounded-lg bg-theme-settings-input-bg border border-theme-modal-border text-sm text-theme-text-primary outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="w-28">
                  <label
                    htmlFor="git-branch"
                    className="block mb-1.5 text-xs font-medium text-theme-text-secondary"
                  >
                    {t("projects.branchLabel", "Branch")}
                  </label>
                  <input
                    id="git-branch"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full h-9 px-3 rounded-lg bg-theme-settings-input-bg border border-theme-modal-border text-sm text-theme-text-primary outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            </>
          )}

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
              {isSubmitting
                ? "..."
                : tab === "github"
                  ? t("projects.cloneBtn", "Projekt klonen")
                  : t("projects.createBtn", "Projekt erstellen")}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
