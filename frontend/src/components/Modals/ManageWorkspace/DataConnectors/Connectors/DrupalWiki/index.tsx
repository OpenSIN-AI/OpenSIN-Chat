// SPDX-License-Identifier: MIT
/**
 * Copyright 2024
 *
 * Authors:
 *  - Eugen Mayer (KontextWork)
 */

import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { Tooltip } from "react-tooltip";
import logger from "@/utils/logger";

export default function DrupalWikiOptions() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    try {
      setLoading(true);
      showToast(t("drupalWiki.toastFetching"), "info", {
        clear: true,
        autoClose: false,
      });
      const { data, error } = await System.dataConnectors.drupalwiki.collect({
        baseUrl: form.get("baseUrl"),
        spaceIds: form.get("spaceIds"),
        accessToken: form.get("accessToken"),
      });

      if (!!error) {
        showToast(error, "error", { clear: true });
        setLoading(false);
        return;
      }

      showToast(
        t("drupalWiki.toastSuccess", {
          spaceIds: data.spaceIds,
          destination: data.destination,
        }),
        "success",
        { clear: true },
      );
      e.target.reset();
      setLoading(false);
    } catch (e) {
      logger.error(e);
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
                  <label className="text-theme-text-primary text-sm font-bold flex gap-x-2 items-center">
                    <p className="font-bold text-theme-text-primary">
                      {t("drupalWiki.baseUrlLabel")}
                    </p>
                  </label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    <Trans
                      i18nKey="drupalWiki.baseUrlDescription"
                      components={{
                        a: (
                          <a
                            href="https://drupal-wiki.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          />
                        ),
                      }}
                    />
                  </p>
                </div>
                <input
                  type="url"
                  name="baseUrl"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t("drupalWiki.baseUrlPlaceholder")}
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <label className="text-theme-text-primary text-sm font-bold">
                    {t("drupalWiki.spaceIdsLabel")}
                  </label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    <Trans
                      i18nKey="drupalWiki.spaceIdsDescription"
                      components={{
                        a: (
                          <a
                            href="https://help.drupal-wiki.com/node/606"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ),
                      }}
                    />
                  </p>
                </div>
                <input
                  type="text"
                  name="spaceIds"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t("drupalWiki.spaceIdsPlaceholder")}
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <label className="text-theme-text-primary text-sm font-bold flex gap-x-2 items-center">
                    <p className="font-bold text-theme-text-primary">
                      {t("drupalWiki.apiTokenLabel")}
                    </p>
                    <Warning
                      size={14}
                      className="ml-1 text-orange-500 cursor-pointer"
                      data-tooltip-id="access-token-tooltip"
                      data-tooltip-place="right"
                    />
                    <Tooltip
                      delayHide={300}
                      id="access-token-tooltip"
                      className="max-w-xs z-99"
                      clickable={true}
                    >
                      <p className="text-sm font-light text-theme-text-primary">
                        <Trans
                          i18nKey="drupalWiki.apiTokenTooltip"
                          components={{
                            a: (
                              <a
                                href="https://help.drupal-wiki.com/node/605#2-Zugriffs-Token-generieren"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              />
                            ),
                          }}
                        />
                      </p>
                    </Tooltip>
                  </label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("drupalWiki.apiTokenDescription")}
                  </p>
                </div>
                <input
                  type="password"
                  name="accessToken"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t("drupalWiki.apiTokenPlaceholder")}
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-y-2 w-full pr-10">
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full justify-center border-none px-4 py-2 rounded-lg text-dark-text light:text-white text-sm font-bold items-center flex gap-x-2 bg-theme-home-button-primary hover:bg-theme-home-button-primary-hover disabled:bg-theme-home-button-primary-hover disabled:cursor-not-allowed"
            >
              {loading
                ? t("drupalWiki.collectingButton")
                : t("drupalWiki.submitButton")}
            </button>
            {loading && (
              <p className="text-xs text-theme-text-secondary">
                {t("drupalWiki.collectingDescription")}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
