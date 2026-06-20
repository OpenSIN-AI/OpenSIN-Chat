// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import React, { useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

type AddVariableModalProps = {
  closeModal: () => void;
  onRefresh?: () => void;
};

export default function AddVariableModal({
  closeModal,
  onRefresh,
}: AddVariableModalProps): JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const newVariable: Record<string, string> = {};
    for (const [key, value] of formData.entries())
      newVariable[key] = String(value).trim();

    if (!newVariable.key || !newVariable.value) {
      setError(t("admin.systemPromptVariables.addVariable.keyValueRequired"));
      return;
    }

    try {
      await System.promptVariables.create(newVariable);
      showToast(
        t("admin.systemPromptVariables.addVariable.createSuccess"),
        "success",
        { clear: true },
      );
      if (onRefresh) onRefresh();
      closeModal();
    } catch (error) {
      console.error("Error creating variable:", error);
      setError(t("admin.systemPromptVariables.addVariable.createFailed"));
    }
  };

  return (
    <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("admin.systemPromptVariables.addVariable.title")}
            </h3>
          </div>
          <button
            onClick={closeModal}
            type="button"
            className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
          >
            <X size={24} weight="bold" className="text-white" />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="key"
                  className="block mb-2 text-sm font-medium text-white"
                >
                  {t("admin.systemPromptVariables.addVariable.key")}
                </label>
                <input
                  name="key"
                  type="text"
                  minLength={3}
                  maxLength={255}
                  className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t(
                    "admin.systemPromptVariables.addVariable.keyPlaceholder",
                  )}
                  required={true}
                  autoComplete="off"
                  pattern="^[a-zA-Z0-9_]+$"
                />
                <p className="mt-2 text-xs text-white/60">
                  {t("admin.systemPromptVariables.addVariable.keyHelp")}
                </p>
              </div>
              <div>
                <label
                  htmlFor="value"
                  className="block mb-2 text-sm font-medium text-white"
                >
                  {t("admin.systemPromptVariables.addVariable.value")}
                </label>
                <input
                  name="value"
                  type="text"
                  className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t(
                    "admin.systemPromptVariables.addVariable.valuePlaceholder",
                  )}
                  required={true}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block mb-2 text-sm font-medium text-white"
                >
                  {t("admin.systemPromptVariables.addVariable.description")}
                </label>
                <input
                  name="description"
                  type="text"
                  className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t(
                    "admin.systemPromptVariables.addVariable.descriptionPlaceholder",
                  )}
                  autoComplete="off"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">
                  {t("admin.systemPromptVariables.addVariable.error", {
                    error,
                  })}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
              <button
                onClick={closeModal}
                type="button"
                className="transition-all duration-300 text-white hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
              >
                {t("admin.systemPromptVariables.addVariable.cancel")}
              </button>
              <button
                type="submit"
                className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
              >
                {t("admin.systemPromptVariables.addVariable.createVariable")}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
