// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import PreLoader from "@/components/Preloader";
import { OLLAMA_COMMON_URLS } from "@/utils/constants";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { Tooltip } from "react-tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import useProviderModels from "@/hooks/useProviderModels";

export default function OllamaEmbeddingOptions({ settings }: any) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
    authToken,
    authTokenValue,
  } = useProviderEndpointAutoDiscovery({
    provider: "ollama",
    initialBasePath: settings?.EmbeddingBasePath,
    ENDPOINTS: OLLAMA_COMMON_URLS,
  });

  const [maxChunkLength, setMaxChunkLength] = useState(
    settings?.EmbeddingModelMaxChunkLength || 8192,
  );
  const [batchSize, setBatchSize] = useState(
    settings?.OllamaEmbeddingBatchSize || 1,
  );

  const handleMaxChunkLengthChange: any = (e) => {
    setMaxChunkLength(Number((e.target as unknown as any)?.value));
  };

  const handleBatchSizeChange: any = (e) => {
    setBatchSize(Number((e.target as unknown as any)?.value));
  };

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <OllamaEmbeddingModelSelection
          settings={settings}
          basePath={basePath.value}
        />
        <div className="flex flex-col w-60">
          <div
            data-tooltip-place="top"
            data-tooltip-id="max-embedding-chunk-length-tooltip"
            className="flex gap-x-1 items-center mb-3"
          >
            <label className="text-theme-text-primary text-sm font-semibold block">
              {t("ollamaEmbedding.maxChunkLengthLabel")}
            </label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
            <Tooltip id="max-embedding-chunk-length-tooltip">
              {t("ollamaEmbedding.maxChunkLengthTooltip")}
            </Tooltip>
          </div>
          <input
            type="number"
            name="EmbeddingModelMaxChunkLength"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("ollamaEmbedding.maxChunkLengthPlaceholder")}
            min={1}
            value={maxChunkLength}
            onChange={handleMaxChunkLengthChange}
            onScroll={(e) => (e.target as HTMLElement).blur()}
            required={true}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="flex justify-start mt-4">
        <button
          type="button"
          aria-label={
            showAdvancedControls
              ? t("ollamaEmbedding.hideAdvancedAria")
              : t("ollamaEmbedding.showAdvancedAria")
          }
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls
            ? t("ollamaEmbedding.hideAdvanced")
            : t("ollamaEmbedding.showAdvanced")}{" "}
          {t("ollamaEmbedding.advancedSettings")}
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
            <div className="flex justify-between items-center mb-2">
              <label className="text-theme-text-primary text-sm font-semibold">
                {t("ollamaEmbedding.baseUrlLabel")}
              </label>
              {loading ? (
                <PreLoader size="6" />
              ) : (
                <>
                  {!basePathValue.value && (
                    <button
                      type="button"
                      aria-label={t("ollamaEmbedding.autoDetectAria")}
                      onClick={handleAutoDetectClick}
                      className="bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      {t("ollamaEmbedding.autoDetect")}
                    </button>
                  )}
                </>
              )}
            </div>
            <input
              type="url"
              name="EmbeddingBasePath"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("ollamaEmbedding.baseUrlPlaceholder")}
              value={basePathValue.value}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("ollamaEmbedding.baseUrlHelp")}
            </p>
          </div>
          <div className="flex flex-col w-60">
            <div
              data-tooltip-place="top"
              data-tooltip-id="ollama-batch-size-tooltip"
              className="flex gap-x-1 items-center mb-3"
            >
              <label className="text-theme-text-primary text-sm font-semibold block">
                {t("ollamaEmbedding.batchSizeLabel")}
              </label>
              <Info
                size={16}
                className="text-theme-text-secondary cursor-pointer"
              />
              <Tooltip id="ollama-batch-size-tooltip">
                {t("ollamaEmbedding.batchSizeTooltip")}
              </Tooltip>
            </div>
            <input
              type="number"
              name="OllamaEmbeddingBatchSize"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("ollamaEmbedding.batchSizePlaceholder")}
              min={1}
              value={batchSize}
              onChange={handleBatchSizeChange}
              onScroll={(e) => (e.target as HTMLElement).blur()}
              required={true}
              autoComplete="off"
            />
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("ollamaEmbedding.batchSizeHelp")}
            </p>
          </div>
          <div>
            <label className="text-theme-text-primary font-semibold block mb-3 text-sm">
              {t("ollamaEmbedding.authTokenLabel")}
            </label>
            <input
              type="password"
              name="OllamaLLMAuthToken"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("ollamaEmbedding.authTokenPlaceholder")}
              defaultValue={settings?.OllamaLLMAuthToken ? "*".repeat(20) : ""}
              value={authTokenValue.value}
              onChange={authToken.onChange}
              onBlur={authToken.onBlur}
              required={false}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("ollamaEmbedding.authTokenHelp1")}{" "}
              <code>{t("ollamaEmbedding.authTokenBearer")}</code>{" "}
              {t("ollamaEmbedding.authTokenHelp1End")}
              <br />
              {t("ollamaEmbedding.authTokenHelp2")}{" "}
              <b>{t("ollamaEmbedding.authTokenHelp2b")}</b>{" "}
              {t("ollamaEmbedding.authTokenHelp2End")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OllamaEmbeddingModelSelection({ settings, basePath = null }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading: loading } = useProviderModels(
    basePath ? "ollama" : null,
    null,
    basePath,
  );

  if (loading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-2">
          {t("ollamaEmbedding.modelLabel")}
        </label>
        <select
          name="EmbeddingModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {!!basePath
              ? t("ollamaEmbedding.loadingModels")
              : t("ollamaEmbedding.enterUrlFirst")}
          </option>
        </select>
        <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
          {t("ollamaEmbedding.selectModelHelp")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-2">
        {t("ollamaEmbedding.modelLabel")}
      </label>
      <select
        name="EmbeddingModelPref"
        required={true}
        defaultValue={settings?.EmbeddingModelPref}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("ollamaEmbedding.yourLoadedModels")}>
            {(customModels as any).map((model) => {
              return (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
      <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
        {t("ollamaEmbedding.chooseModelHelp")}
      </p>
    </div>
  );
}
