// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import Document from "@/models/document";
import { useTranslation } from "react-i18next";

export default function NewFolderModal({ closeModal, files, setFiles }: any) {
  const [error, setError] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (folderName.trim() !== "") {
      setLoading(true);
      try {
        const newFolder = {
          name: folderName,
          type: "folder",
          items: [],
        };
        const { success } = await Document.createFolder(folderName);
        if (success) {
          setFiles({
            ...files,
            items: [...files.items, newFolder],
          });
          closeModal();
        } else {
          setError(t("newFolderModal.failedToCreate"));
        }
      } catch (err: any) {
        setError(
          t("newFolderModal.error", { error: String(err?.message || err) }),
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
      <div className="relative p-6 border-b rounded-t border-theme-modal-border">
        <div className="w-full flex gap-x-2 items-center">
          <h3 className="text-xl font-semibold text-theme-text-primary overflow-hidden overflow-ellipsis whitespace-nowrap">
            {t("newFolderModal.title")}
          </h3>
        </div>
        <button
          type="button"
          onClick={closeModal}
          aria-label={t("newFolderModal.closeAriaLabel")}
          className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
        >
          <X
            size={24}
            weight="bold"
            className="text-theme-text-primary"
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="p-6">
        <form onSubmit={handleCreate}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="folderName"
                className="block mb-2 text-sm font-medium text-theme-text-primary"
              >
                {t("newFolderModal.folderNameLabel")}
              </label>
              <input aria-label={t("common.folderName", "Folder name")}
                name="folderName"
                type="text"
                className="border-none bg-theme-settings-input-bg w-full text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("newFolderModal.folderNamePlaceholder")}
                required={true}
                autoComplete="off"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">
                {t("newFolderModal.error", { error })}
              </p>
            )}
          </div>
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
            <button
              type="button"
              onClick={closeModal}
              aria-label={t("newFolderModal.cancelAriaLabel")}
              className="transition-all duration-300 text-theme-text-primary hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
            >
              {t("newFolderModal.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : t("newFolderModal.createFolder")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
