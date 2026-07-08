// SPDX-License-Identifier: MIT
// Purpose: New workspace creation modal
// Docs: NewWorkspaceModal/index.doc.md
import React, { useState, FormEvent } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import Admin from "@/models/admin";
import { useTranslation } from "react-i18next";

interface NewWorkspaceModalProps {
  closeModal: () => void;
}

export default function NewWorkspaceModal({
  closeModal,
}: NewWorkspaceModalProps): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCreate = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    setError(null);
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const { workspace, error: createError } = await Admin.newWorkspace(
        form.get("name") as string,
      );
      if (!!workspace) window.location.reload();
      setError(createError);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create workspace");
    }
  };

  return (
    <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
      <div className="relative p-6 border-b rounded-t border-theme-modal-border">
        <div className="w-full flex gap-x-2 items-center">
          <h3 className="text-xl font-semibold text-theme-text-primary overflow-hidden overflow-ellipsis whitespace-nowrap">
            {t("admin.newWorkspaceModal.title")}
          </h3>
        </div>
        <button
          onClick={closeModal}
          type="button"
          className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
        >
          <X size={24} weight="bold" className="text-theme-text-primary" />
        </button>
      </div>
      <div className="p-6">
        <form onSubmit={handleCreate}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block mb-2 text-sm font-medium text-theme-text-primary"
              >
                {t("common.workspaces-name")}
              </label>
              <input
                name="name"
                type="text"
                className="border-none bg-theme-settings-input-bg w-full text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("admin.newWorkspaceModal.placeholder")}
                minLength={4}
                required={true}
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">
                {t("admin.newWorkspaceModal.error", { error })}
              </p>
            )}
            <p className="text-theme-text-secondary text-xs md:text-sm">
              {t("admin.newWorkspaceModal.adminOnlyHint")}
            </p>
          </div>
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
            <button
              onClick={closeModal}
              type="button"
              className="transition-all duration-300 text-theme-text-primary hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
            >
              {t("admin.newWorkspaceModal.cancel")}
            </button>
            <button
              type="submit"
              className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
            >
              {t("admin.newWorkspaceModal.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
