// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import React, { useEffect, useState, FormEvent } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import Admin from "@/models/admin";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import { useTranslation } from "react-i18next";
import { copyText } from "@/utils/clipboard";

type ApiKey = {
  secret: string;
};

type NewApiKeyModalProps = {
  closeModal: () => void;
  onSuccess: () => void;
};

export default function NewApiKeyModal({
  closeModal,
  onSuccess,
}: NewApiKeyModalProps): JSX.Element {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    setError(null);
    e.preventDefault();
    const user = userFromStorage();
    const Model = !!user ? Admin : System;

    try {
      const { apiKey: newApiKey, error } = await Model.generateApiKey({
        name,
      });
      if (!!newApiKey) {
        setApiKey(newApiKey);
        onSuccess();
      }
      setError(error);
    } catch (err: any) {
      setError(err?.message ?? t("api.messages.error", { error: "" }));
    }
  };

  const copyApiKey = () => {
    if (!apiKey) return false;
    copyText(apiKey.secret).then((ok) => {
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
          <h3 className="text-xl font-semibold text-theme-text-primary overflow-hidden overflow-ellipsis whitespace-nowrap">
            {t("api.modal.title")}
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
      <div className="px-7 py-6">
        <form onSubmit={handleCreate}>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {error && (
              <p className="text-red-400 text-sm">
                {t("api.messages.error", { error })}
              </p>
            )}
            {!apiKey && (
              <div>
                <label className="block mb-2 text-sm font-medium text-theme-text-primary">
                  {t("api.modal.name.label")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("api.modal.name.placeholder")}
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5"
                />
                <p className="text-theme-text-secondary text-xs md:text-sm mt-2">
                  {t("api.modal.name.helper")}
                </p>
              </div>
            )}
            {apiKey && (
              <div className="relative">
                <input
                  type="text"
                  defaultValue={`${apiKey.secret}`}
                  disabled={true}
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5 pr-10"
                />
                <button
                  type="button"
                  onClick={copyApiKey}
                  disabled={copied}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-theme-modal-border transition-all duration-300"
                >
                  {copied ? (
                    <Check size={20} className="text-green-400" weight="bold" />
                  ) : (
                    <Copy size={20} className="text-theme-text-primary" weight="bold" />
                  )}
                </button>
              </div>
            )}
            <p className="text-theme-text-secondary text-xs md:text-sm">
              {t("api.modal.helper")}
            </p>
            <a
              href={paths.apiDocs()}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline"
            >
              {t("api.readDocumentation")}{" "}
              {
                // eslint-disable-next-line i18next/no-literal-string
              }
              &rarr;
            </a>
          </div>
          <div className="flex justify-end items-center mt-6 pt-6 border-t border-theme-modal-border">
            {!apiKey ? (
              <>
                <button
                  onClick={closeModal}
                  type="button"
                  className="transition-all duration-300 text-theme-text-primary hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm mr-2"
                >
                  {t("api.modal.cancel")}
                </button>
                <button
                  type="submit"
                  className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
                >
                  {t("api.modal.create")}
                </button>
              </>
            ) : (
              <button
                onClick={closeModal}
                type="button"
                className="transition-all duration-300 text-theme-text-primary hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
              >
                {t("api.modal.close")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
