// SPDX-License-Identifier: MIT
import showToast from "@/utils/toast";
import { DownloadSimple } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { Key } from "@phosphor-icons/react/dist/csr/Key";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { saveAs } from "file-saver";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ModalWrapper from "@/components/ModalWrapper";
import { copyText } from "@/utils/clipboard";

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
    copyText(recoveryCodes.join(",\n")).then((ok) => {
      if (ok) {
        showToast(t("recoveryCode.copiedToClipboard"), "success", {
          clear: true,
        });
      } else {
        showToast(t("recoveryCode.copiedToClipboardFailed"), "error");
      }
    });
  };

  return (
    <ModalWrapper isOpen={true}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 light:bg-white light:border-slate-200 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center gap-x-3 border-b border-white/10 light:border-slate-200 px-6 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#009ee0]/10 ring-1 ring-[#009ee0]/25">
            <Key
              size={20}
              className="text-[#009ee0]"
              weight="bold"
              aria-hidden="true"
            />
          </span>
          <h3 className="truncate text-lg font-semibold tracking-tight text-zinc-50 light:text-slate-900">
            {t("recoveryCode.title")}
          </h3>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100vh-220px)] w-full overflow-y-auto">
          <div className="px-6 py-6">
            <p className="text-sm leading-relaxed text-zinc-400 light:text-slate-500">
              {t("recoveryCode.description")}
            </p>
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400">
              {t("recoveryCode.shownOnce")}
            </p>

            {/* Codes block */}
            <div className="relative mt-5 rounded-xl border border-white/10 bg-zinc-800/50 light:bg-slate-100 light:border-slate-200">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                aria-label={t("recoveryCode.copyAriaLabel")}
                className="absolute right-2 top-2 flex items-center gap-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 light:text-slate-500 transition hover:bg-white/5 hover:text-[#009ee0]"
              >
                <Copy size={15} weight="bold" aria-hidden="true" />
                {t("recoveryCode.copy", "Copy")}
              </button>
              <ul className="space-y-1.5 p-5 font-mono">
                {recoveryCodes.map((code) => (
                  <li
                    key={code}
                    className="text-sm text-zinc-200 light:text-slate-800"
                  >
                    {code}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex w-full items-center justify-end gap-x-2 border-t border-white/10 light:border-slate-200 px-6 py-4">
          <button
            type="button"
            className="flex items-center gap-x-2 rounded-xl bg-[#009ee0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0089c4] focus:outline-none focus:ring-2 focus:ring-[#009ee0]/40"
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
                {t("recoveryCode.download")}
              </>
            )}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
