// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import React, { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import BrowserExtensionApiKey from "@/models/browserExtensionApiKey";
import { fullApiUrl, POPUP_BROWSER_EXTENSION_EVENT } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { copyText } from "@/utils/clipboard";

type NewBrowserExtensionApiKeyModalProps = {
  closeModal: () => void;
  onSuccess: () => void;
  isMultiUser?: boolean;
};

export default function NewBrowserExtensionApiKeyModal({
  closeModal,
  onSuccess,
  isMultiUser,
}: NewBrowserExtensionApiKeyModalProps): JSX.Element {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    setError(null);
    e.preventDefault();

    const { apiKey: newApiKey, error } =
      await BrowserExtensionApiKey.generateKey();
    if (!!newApiKey) {
      const fullApiKey = `${fullApiUrl()}|${newApiKey}`;
      setApiKey(fullApiKey);
      onSuccess();

      window.postMessage(
        { type: POPUP_BROWSER_EXTENSION_EVENT, apiKey: fullApiKey },
        "*",
      );
    }
    setError(error);
  };

  const copyApiKey = () => {
    if (!apiKey) return false;
    copyText(apiKey).then((ok) => {
      if (ok) setCopied(true);
    });
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("browserExtensionApiKey.newKey.title")}
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
        <div className="px-7 py-6">
          <form onSubmit={handleCreate}>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {error && (
                <p className="text-red-400 text-sm">
                  {t("browserExtensionApiKey.newKey.error", { error })}
                </p>
              )}
              {apiKey && (
                <input
                  type="text"
                  defaultValue={apiKey}
                  disabled={true}
                  className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg block w-full p-2.5"
                />
              )}
              {isMultiUser && (
                <p className="text-yellow-300 light:text-orange-500 text-xs md:text-sm font-semibold">
                  {t("browserExtensionApiKey.newKey.multiUserWarning")}
                </p>
              )}
              <p className="text-white text-opacity-60 text-xs md:text-sm">
                {t("browserExtensionApiKey.newKey.autoConnectInfo")}
              </p>
              <p className="text-white text-opacity-60 text-xs md:text-sm">
                {t("browserExtensionApiKey.newKey.manualConnectInfo")}
              </p>
            </div>
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
              {!apiKey ? (
                <>
                  <button
                    onClick={closeModal}
                    type="button"
                    className="transition-all duration-300 text-white hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
                  >
                    {t("browserExtensionApiKey.newKey.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
                  >
                    {t("browserExtensionApiKey.newKey.createApiKey")}
                  </button>
                </>
              ) : (
                <button
                  onClick={copyApiKey}
                  type="button"
                  disabled={copied}
                  className="w-full transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm cursor-pointer"
                >
                  {copied
                    ? t("browserExtensionApiKey.newKey.apiKeyCopied")
                    : t("browserExtensionApiKey.newKey.copyApiKey")}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
  );
}
