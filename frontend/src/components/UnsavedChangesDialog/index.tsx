// SPDX-License-Identifier: MIT
// Purpose: Reusable dialog shown when React Router blocks navigation
// due to unsaved form changes. Works with useBlocker from react-router-dom.
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import ModalWrapper from "@/components/ModalWrapper";

/**
 * @param {Object} props
 * @param {import("react-router-dom").Blocker} props.blocker - The blocker returned by useBlocker
 */
export default function UnsavedChangesDialog({ blocker }: any) {
  const { t } = useTranslation();

  const handleReset = useCallback(() => blocker.reset(), [blocker]);
  const handleProceed = useCallback(() => blocker.proceed(), [blocker]);

  if (blocker.state !== "blocking") return null;

  return (
    <ModalWrapper isOpen={true} closeModal={handleReset}>
      <div className="w-full max-w-lg bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden z-[9999]">
        <div className="relative px-6 py-5 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <Warning className="text-yellow-400 w-6 h-6" weight="fill" />
            <h3 className="text-xl font-semibold text-white">
              {t("common.unsavedChanges") || "Unsaved Changes"}
            </h3>
          </div>
        </div>
        <div className="py-6 px-8">
          <p className="text-white text-sm">
            {t("common.unsavedChangesDescription") ||
              "You have unsaved changes. Are you sure you want to leave this page?"}
          </p>
        </div>
        <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
          <button
            onClick={handleReset}
            type="button"
            className="transition-all duration-300 bg-transparent text-white hover:opacity-60 px-4 py-2 rounded-lg text-sm border-none"
          >
            {t("common.stayOnPage") || "Stay on Page"}
          </button>
          <button
            onClick={handleProceed}
            type="button"
            className="transition-all duration-300 bg-red-500 text-white hover:opacity-60 px-4 py-2 rounded-lg text-sm border-none"
          >
            {t("common.discardAndLeave") || "Discard & Leave"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
