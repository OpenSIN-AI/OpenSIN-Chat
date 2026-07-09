// SPDX-License-Identifier: MIT
import React, { useRef, useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { mutate } from "swr";
import Workspace from "@/models/workspace";
import { WORKSPACES_KEY } from "@/hooks/useWorkspaces";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ModalWrapper from "@/components/ModalWrapper";

const noop = () => false;
export default function NewWorkspaceModal({ hideModal = noop }: any) {
  const formEl = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const handleCreate = async (e) => {
    if (isSubmitting) return;
    setError(null);
    e.preventDefault();
    setIsSubmitting(true);
    const data = {};
    const form = new FormData(formEl.current);
    for (const [key, value] of form.entries()) data[key] = value;
    try {
      const { workspace, message } = await Workspace.new(data);
      if (!!workspace) {
        hideModal();
        mutate(WORKSPACES_KEY);
        navigate(paths.workspace.chat(workspace.slug));
      } else {
        setError(message);
      }
    } catch (err) {
      setError(
        t("newWorkspaceModal.creationFailed", {
          error: String(err?.message || err),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={true} closeModal={hideModal}>
      <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-theme-text-primary overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("new-workspace.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={hideModal}
            aria-label={t("newWorkspaceModal.closeAriaLabel")}
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
        <div className="h-full w-full overflow-y-auto max-h-[calc(100vh-200px)]">
          <form ref={formEl} onSubmit={handleCreate}>
            <div className="py-7 px-9 space-y-2 flex-col">
              <div className="w-full flex flex-col gap-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block mb-2 text-sm font-medium text-theme-text-primary"
                  >
                    {t("common.workspaces-name")}
                  </label>
                  <input
                    aria-label={t("new-workspace.name", "Workspace name")}
                    name="name"
                    type="text"
                    id="name"
                    className="border-none bg-theme-settings-input-bg w-full text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                    placeholder={t("new-workspace.placeholder")}
                    required={true}
                    autoComplete="off"
                    autoFocus={true}
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-sm">
                    {t("newWorkspaceModal.error", { error })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
              <button
                type="submit"
                disabled={isSubmitting}
                aria-label={t("new-workspace.create", "Create workspace")}
                className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "..." : t("newWorkspaceModal.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalWrapper>
  );
}

export function useNewWorkspaceModal() {
  const [showing, setShowing] = useState<boolean>(false);
  const showModal = () => {
    setShowing(true);
  };
  const hideModal = () => {
    setShowing(false);
  };

  return { showing, showModal, hideModal };
}
