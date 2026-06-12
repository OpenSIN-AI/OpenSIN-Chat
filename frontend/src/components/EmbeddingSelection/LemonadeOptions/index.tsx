// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LEMONADE_COMMON_URLS } from "@/utils/constants";
import { CaretDown, CaretUp, Info, CircleNotch } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { cleanBasePath } from "@/components/LLMSelection/LemonadeOptions";
import useProviderModels from "@/hooks/useProviderModels";

export default function LemonadeEmbeddingOptions({ settings }: any) {
  const { t } = useTranslation();

  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lemonade",
    initialBasePath: settings?.EmbeddingBasePath,
    ENDPOINTS: LEMONADE_COMMON_URLS,
  });

  const [maxChunkLength, setMaxChunkLength] = useState(
    settings?.EmbeddingModelMaxChunkLength || 8192,
  );

  const handleMaxChunkLengthChange: any = (e) => {
    setMaxChunkLength(Number((e.target as unknown as any)?.value));
  };

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <LemonadeModelSelection settings={settings} basePath={basePath.value} />
        <div className="flex flex-col w-60">
          <div
            data-tooltip-place="top"
            data-tooltip-id="max-embedding-chunk-length-tooltip"
            className="flex gap-x-1 items-center mb-3"
          >
            <label className="text-white text-sm font-semibold block">
              {t("lemonadeEmbedding.maxChunkLengthLabel")}
            </label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
            <Tooltip id="max-embedding-chunk-length-tooltip">
              {t("lemonadeEmbedding.maxChunkLengthTooltip")}
            </Tooltip>
          </div>
          <input
            type="number"
            name="EmbeddingModelMaxChunkLength"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("lemonadeEmbedding.maxChunkLengthPlaceholder")}
            min={1}
            value={maxChunkLength}
            onChange={handleMaxChunkLengthChange}
            onScroll={(e) => (e.target as HTMLElement).blur()}
            required={true}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col w-60">
          <div
            data-tooltip-place="top"
            data-tooltip-id="lemonade-embedding-api-key"
            className="flex gap-x-1 items-center mb-3"
          >
            <label className="text-white text-sm font-semibold block">
              {t("lemonadeEmbedding.apiKeyLabel")}
            </label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
            <Tooltip id="lemonade-embedding-api-key">
              {t("lemonadeEmbedding.apiKeyTooltip")}
            </Tooltip>
          </div>
          <input
            type="password"
            name="LemonadeLLMApiKey"
            defaultValue={settings?.LemonadeLLMApiKey ? "*".repeat(20) : ""}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="flex justify-start mt-4">
        <button
          type="button"
          aria-label={
            showAdvancedControls
              ? t("lemonadeEmbedding.hideManualEndpointAria")
              : t("lemonadeEmbedding.showManualEndpointAria")
          }
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls
            ? t("lemonadeEmbedding.hideManualEndpoint")
            : t("lemonadeEmbedding.showManualEndpoint")}{" "}
          {t("lemonadeEmbedding.manualEndpointInput")}
          {showAdvancedControls ? (
            <CaretUp size={14} className="ml-1" />
          ) : (
            <CaretDown size={14} className="ml-1" />
          )}
        </button>
      </div>

      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-start gap-4">
          <div className="flex flex-col w-[300px]">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <label className="text-white text-sm font-semibold">
                  {t("lemonadeEmbedding.baseUrlLabel")}
                </label>
                <Info
                  size={18}
                  className="text-theme-text-secondary cursor-pointer"
                  data-tooltip-id="lemonade-base-url"
                  data-tooltip-content={t("lemonadeEmbedding.baseUrlTooltip")}
                />
                <Tooltip
                  id="lemonade-base-url"
                  place="top"
                  delayShow={300}
                  className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
                />
              </div>
              {loading ? (
                <CircleNotch
                  size={16}
                  className="text-theme-text-secondary animate-spin"
                />
              ) : (
                <>
                  {!basePathValue.value && (
                    <button
                      type="button"
                      aria-label={t("lemonadeEmbedding.autoDetectAria")}
                      onClick={handleAutoDetectClick}
                      className="border-none bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      {t("lemonadeEmbedding.autoDetect")}
                    </button>
                  )}
                </>
              )}
            </div>
            <input
              type="url"
              name="EmbeddingBasePath"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("lemonadeEmbedding.baseUrlPlaceholder")}
              value={cleanBasePath(basePathValue.value)}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LemonadeModelSelection({ settings, basePath = null }: any) {
  const { t } = useTranslation();

  const { customModels, isLoading: loading } = useProviderModels(
    basePath ? "lemonade-embedder" : null,
    null,
    basePath,
  );

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-2">
          {t("lemonadeEmbedding.modelLabel")}
        </label>
        <select
          name="EmbeddingModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {!!basePath
              ? t("lemonadeEmbedding.loadingModels")
              : t("lemonadeEmbedding.enterUrlFirst")}
          </option>
        </select>
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          {t("lemonadeEmbedding.selectModelHelp")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("lemonadeEmbedding.modelLabel")}
      </label>
      <select
        name="EmbeddingModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("lemonadeEmbedding.yourLoadedModels")}>
            {(customModels as any).map((model) => {
              return (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings.EmbeddingModelPref === model.id}
                >
                  {model.id}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
    </div>
  );
}
