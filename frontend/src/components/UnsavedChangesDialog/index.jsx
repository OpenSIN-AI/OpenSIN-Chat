// SPDX-License-Identifier: MIT
import ModalWrapper from "@/components/ModalWrapper";
import { useTranslation } from "react-i18next";

/**
 * UnsavedChangesDialog — shown when the user tries to navigate away from a
 * settings page that has unsaved changes. Requires a react-router-dom v6
 * `blocker` object passed as a prop.
 *
 * @param {{ blocker: import("react-router-dom").Blocker }} props
 */
export default function UnsavedChangesDialog({ blocker }) {
  const { t } = useTranslation();

  if (blocker?.state !== "blocking") return null;

  return (
    <ModalWrapper isOpen onClose={blocker.reset} closeModal={blocker.reset}>
      <div className="relative w-full max-w-md bg-theme-bg-secondary rounded-lg shadow-lg p-6 flex flex-col gap-y-4">
        <h2 className="text-lg font-semibold text-theme-text-primary">
          Unsaved Changes
        </h2>
        <p className="text-sm text-theme-text-secondary">
          You have unsaved changes. Are you sure you want to leave this page?
          Your changes will be lost.
        </p>
        <div className="flex gap-x-3 justify-end mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              blocker.reset();
            }}
            className="px-4 py-2 text-sm rounded-lg bg-theme-bg-primary text-theme-text-primary hover:bg-theme-bg-primary/80 transition-colors"
          >
            Stay on Page
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              blocker.proceed();
            }}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            Discard &amp; Leave
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
