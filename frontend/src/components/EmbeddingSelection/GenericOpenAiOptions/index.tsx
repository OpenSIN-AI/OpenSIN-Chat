// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CaretDown, CaretUp, Info } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";

export default function GenericOpenAiEmbeddingOptions({ settings }: any) {
  const { t } = useTranslation();
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("genericOpenAiEmbedding.baseUrlLabel")}
          </label>
          <input
            type="url"
            name="EmbeddingBasePath"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAiEmbedding.baseUrlPlaceholder")}
            defaultValue={settings?.EmbeddingBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("genericOpenAiEmbedding.modelLabel")}
          </label>
          <input
            type="text"
            name="EmbeddingModelPref"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAiEmbedding.modelPlaceholder")}
            defaultValue={settings?.EmbeddingModelPref}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <div
            data-tooltip-place="top"
            data-tooltip-id="max-embedding-chunk-length-tooltip"
            className="flex gap-x-1 items-center mb-3"
          >
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
            <label className="text-white text-sm font-semibold block">
              {t("genericOpenAiEmbedding.maxChunkLengthLabel")}
            </label>
            <Tooltip id="max-embedding-chunk-length-tooltip">
              {t("genericOpenAiEmbedding.maxChunkLengthTooltip")}
            </Tooltip>
          </div>
          <input
            type="number"
            name="EmbeddingModelMaxChunkLength"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAiEmbedding.maxChunkLengthPlaceholder")}
            min={1}
            onScroll={(e) => (e.target as HTMLElement).blur()}
            defaultValue={settings?.EmbeddingModelMaxChunkLength}
            required={false}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <div className="flex flex-col gap-y-1 mb-4">
            <label className="text-white text-sm font-semibold flex items-center gap-x-2">
              {t("genericOpenAiEmbedding.apiKeyLabel")}{" "}
              <p className="!text-xs !italic !font-thin">
                {t("genericOpenAiEmbedding.optional")}
              </p>
            </label>
          </div>
          <input
            type="password"
            name="GenericOpenAiEmbeddingApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAiEmbedding.apiKeyPlaceholder")}
            defaultValue={
              settings?.GenericOpenAiEmbeddingApiKey ? "*".repeat(20) : ""
            }
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="flex justify-start mt-4">
        <button
          type="button"
          aria-label={
            showAdvancedControls
              ? t("genericOpenAiEmbedding.hideAdvancedAria")
              : t("genericOpenAiEmbedding.showAdvancedAria")
          }
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls
            ? t("genericOpenAiEmbedding.hideAdvanced")
            : t("genericOpenAiEmbedding.showAdvanced")}{" "}
          {t("genericOpenAiEmbedding.advancedSettings")}
          {showAdvancedControls ? (
            <CaretUp size={14} className="ml-1" />
          ) : (
            <CaretDown size={14} className="ml-1" />
          )}
        </button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-start gap-4">
          <div className="flex flex-col w-60">
            <div className="flex flex-col gap-y-1 mb-4">
              <label className="text-white text-sm font-semibold flex items-center gap-x-2">
                {t("genericOpenAiEmbedding.maxConcurrentChunksLabel")}
                <p className="!text-xs !italic !font-thin">
                  {t("genericOpenAiEmbedding.optional")}
                </p>
              </label>
            </div>
            <input
              type="number"
              name="GenericOpenAiEmbeddingMaxConcurrentChunks"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t(
                "genericOpenAiEmbedding.maxConcurrentChunksPlaceholder",
              )}
              min={1}
              onScroll={(e) => (e.target as HTMLElement).blur()}
              defaultValue={settings?.GenericOpenAiEmbeddingMaxConcurrentChunks}
              required={false}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
