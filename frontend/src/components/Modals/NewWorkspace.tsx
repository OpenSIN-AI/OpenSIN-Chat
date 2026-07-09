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
      <div className="w-full max-w-lg bg-theme-bg-secondary rounded-xl shadow-2xl shadow-black/40 border border-theme-modal-border overflow-hidden">
        <div className="relative px-6 py-5 border-b border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-base font-semibold tracking-tight text-theme-text-primary overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("new-workspace.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={hideModal}
            aria-label={t("newWorkspaceModal.closeAriaLabel")}
            className="absolute top-4 right-4 transition-colors duration-150 bg-transparent rounded-md text-sm p-1.5 inline-flex items-center hover:bg-theme-modal-border border-transparent border"
          >
            <X
              size={18}
              weight="bold"
              className="text-theme-text-secondary"
              aria-hidden="true"
            />
          </button>
        </div>
        <div className="h-full w-full overflow-y-auto max-h-[calc(100vh-200px)]">
          <form ref={formEl} onSubmit={handleCreate}>
            <div className="py-6 px-6 flex-col">
              <div className="w-full flex flex-col gap-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block mb-2 text-xs font-medium uppercase tracking-wider text-theme-text-secondary"
                  >
                    {t("common.workspaces-name")}
                  </label>
                  <input
                    aria-label={t("new-workspace.name", "Workspace name")}
                    name="name"
                    type="text"
                    id="name"
                    className="border border-theme-modal-border bg-theme-settings-input-bg w-full text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-none focus:border-theme-text-secondary transition-colors block h-10 px-3"
                    placeholder={t("new-workspace.placeholder")}
                    required={true}
                    autoComplete="off"
                    autoFocus={true}
                  />
                </div>
                {error && (
                  <p className="rounded-md border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-400">
                    {t("newWorkspaceModal.error", { error })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full justify-end items-center px-6 py-4 space-x-2 border-t border-theme-modal-border">
              <button
                type="button"
                onClick={hideModal}
                className="transition-colors duration-150 text-theme-text-secondary hover:text-theme-text-primary px-4 h-9 rounded-lg text-sm"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-label={t("new-workspace.create", "Create workspace")}
                className="transition-colors duration-150 bg-white text-black hover:bg-zinc-200 px-4 h-9 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
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
