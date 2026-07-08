// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { useTranslation } from "react-i18next";

export default function PaperlessNgxOptions() {
  const [loading, setLoading] = useState<boolean>(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    try {
      setLoading(true);
      showToast(t("dataConnectors.paperlessNgx.fetchingDocuments"), "info", {
        clear: true,
        autoClose: false,
      });

      const { data, error } = await System.dataConnectors.paperlessNgx.collect({
        baseUrl: form.get("baseUrl"),
        apiToken: form.get("apiToken"),
      });

      if (!!error) {
        showToast(error, "error", { clear: true });
        setLoading(false);
        return;
      }

      showToast(
        t("dataConnectors.paperlessNgx.successImport", {
          files: data.files,
          destination: data.destination,
        }),
        "success",
        { clear: true },
      );
      e.target.reset();
      setLoading(false);
    } catch (e) {
      console.error(e);
      showToast(e.message, "error", { clear: true });
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full">
      <div className="flex flex-col w-full px-1 md:pb-6 pb-16">
        <form className="w-full" onSubmit={handleSubmit}>
          <div className="w-full flex flex-col py-2">
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <label className="text-theme-text-primary text-sm font-bold">
                    {t("dataConnectors.paperlessNgx.baseUrl")}
                  </label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("dataConnectors.paperlessNgx.baseUrlHelp")}
                  </p>
                </div>
                <input
                  type="url"
                  name="baseUrl"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t(
                    "dataConnectors.paperlessNgx.baseUrlPlaceholder",
                  )}
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <label className="text-theme-text-primary text-sm font-bold flex gap-x-2 items-center">
                    <p className="font-bold text-theme-text-primary">
                      {t("dataConnectors.paperlessNgx.apiToken")}
                    </p>
                  </label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("dataConnectors.paperlessNgx.apiTokenHelp")}
                  </p>
                </div>
                <input
                  type="password"
                  name="apiToken"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t(
                    "dataConnectors.paperlessNgx.apiTokenPlaceholder",
                  )}
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-y-2 w-full pr-10">
            <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-white mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
              <div className="gap-x-2 flex items-center">
                <Info className="shrink-0" size={25} aria-hidden="true" />
                <p className="text-sm">
                  {t("dataConnectors.paperlessNgx.instanceRunningInfo")}
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full justify-center border-none px-4 py-2 rounded-lg text-dark-text light:text-white text-sm font-bold items-center flex gap-x-2 bg-theme-home-button-primary hover:bg-theme-home-button-primary-hover disabled:bg-theme-home-button-primary-hover disabled:cursor-not-allowed"
            >
              {loading
                ? t("dataConnectors.paperlessNgx.importingDocuments")
                : t("dataConnectors.paperlessNgx.submit")}
            </button>
            {loading && (
              <p className="text-xs text-theme-text-secondary">
                {t("dataConnectors.paperlessNgx.completeHint")}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
