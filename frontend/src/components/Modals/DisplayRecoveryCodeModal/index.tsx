// SPDX-License-Identifier: MIT
import showToast from "@/utils/toast";
import { DownloadSimple, Key } from "@phosphor-icons/react";
import { saveAs } from "file-saver";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ModalWrapper from "@/components/ModalWrapper";

type RecoveryCodeModalProps = {
  recoveryCodes: string[];
  onDownloadComplete: () => void;
  onClose: () => void;
};

export default function RecoveryCodeModal({
  recoveryCodes,
  onDownloadComplete,
  onClose,
}: RecoveryCodeModalProps) {
  const [downloadClicked, setDownloadClicked] = useState<boolean>(false);
  const { t } = useTranslation();

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    saveAs(blob, "recovery_codes.txt");
    setDownloadClicked(true);
  };

  const handleClose = () => {
    if (downloadClicked) {
      onDownloadComplete();
      onClose();
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCodes.join(",\n")).then(() => {
      showToast(t("recoveryCode.copiedToClipboard"), "success", {
        clear: true,
      });
    });
  };

  return (
    <ModalWrapper isOpen={true}>
      <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <Key
              size={24}
              className="text-white"
              weight="bold"
              aria-hidden="true"
            />
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("recoveryCode.title")}
            </h3>
          </div>
        </div>
        <div className="h-full w-full overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="py-7 px-9 space-y-2 flex-col">
            <p className="text-sm text-white flex flex-col">
              {t("recoveryCode.description")}{" "}
              <br />
              <b className="mt-4">{t("recoveryCode.shownOnce")}</b>
            </p>
            <div
              role="button"
              tabIndex={0}
              className="border-none bg-theme-settings-input-bg text-white hover:text-primary-button
                   flex items-center justify-center rounded-md mt-6 cursor-pointer"
              onClick={handleCopyToClipboard}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCopyToClipboard();
                }
              }}
              aria-label={t("recoveryCode.copyAriaLabel")}
            >
              <ul className="space-y-2 md:p-6 p-4">
                {recoveryCodes.map((code, index) => (
                  <li key={index} className="md:text-sm text-xs">
                    {code}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
            <button
              type="button"
              className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm flex items-center gap-x-2"
              onClick={downloadClicked ? handleClose : downloadRecoveryCodes}
              aria-label={
                downloadClicked
                  ? t("recoveryCode.closeAriaLabel")
                  : t("recoveryCode.downloadAriaLabel")
              }
            >
              {downloadClicked ? (
                t("recoveryCode.close")
              ) : (
                <>
                  <DownloadSimple weight="bold" size={18} aria-hidden="true" />
                  <p>{t("recoveryCode.download")}</p>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
