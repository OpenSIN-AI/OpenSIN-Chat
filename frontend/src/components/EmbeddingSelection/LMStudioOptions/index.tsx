// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LMSTUDIO_COMMON_URLS } from "@/utils/constants";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { Tooltip } from "react-tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import useProviderModels from "@/hooks/useProviderModels";

export default function LMStudioEmbeddingOptions({ settings }: any) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    authToken,
    authTokenValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lmstudio",
    initialBasePath: settings?.EmbeddingBasePath,
    ENDPOINTS: LMSTUDIO_COMMON_URLS,
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
        <LMStudioModelSelection
          settings={settings}
          basePath={basePath.value}
          apiKey={authTokenValue.value}
        />
        <div className="flex flex-col w-60">
          <div
            data-tooltip-place="top"
            data-tooltip-id="max-embedding-chunk-length-tooltip"
            className="flex gap-x-1 items-center mb-3"
          >
            <label className="text-white text-sm font-semibold block">
              {t("lmStudioEmbedding.maxChunkLengthLabel")}
            </label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
            <Tooltip id="max-embedding-chunk-length-tooltip">
              {t("lmStudioEmbedding.maxChunkLengthTooltip")}
            </Tooltip>
          </div>
          <input
            type="number"
            name="EmbeddingModelMaxChunkLength"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="8192" /* eslint-disable-line i18next/no-literal-string */
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
              ? t("lmStudioEmbedding.hideManualEndpointAria")
              : t("lmStudioEmbedding.showManualEndpointAria")
          }
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls
            ? t("lmStudioEmbedding.hideManualEndpoint")
            : t("lmStudioEmbedding.showManualEndpoint")}{" "}
          {t("lmStudioEmbedding.manualEndpointInput")}
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
                  {t("lmStudioEmbedding.baseUrlLabel")}
                </label>
                <Info
                  size={18}
                  className="text-theme-text-secondary cursor-pointer"
                  data-tooltip-id="lmstudio-base-url"
                  data-tooltip-content={t("lmStudioEmbedding.baseUrlTooltip")}
                />
                <Tooltip
                  id="lmstudio-base-url"
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
                      aria-label={t("lmStudioEmbedding.autoDetectAria")}
                      onClick={handleAutoDetectClick}
                      className="border-none bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      {t("lmStudioEmbedding.autoDetect")}
                    </button>
                  )}
                </>
              )}
            </div>
            <input
              type="url"
              name="EmbeddingBasePath"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("lmStudioEmbedding.baseUrlPlaceholder")}
              value={basePathValue.value}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
          </div>
          <div className="flex flex-col w-60">
            <div className="flex items-center mb-2 gap-x-1">
              <label className="text-white text-sm font-semibold">
                {t("lmStudioEmbedding.authTokenLabel")}
              </label>
              <Info
                size={18}
                className="text-theme-text-secondary cursor-pointer"
                data-tooltip-id="lmstudio-authentication-token"
              />
              <Tooltip
                id="lmstudio-authentication-token"
                place="top"
                delayShow={300}
                delayHide={400}
                clickable={true}
                className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
              >
                <p className="text-xs leading-[18px] font-base">
                  {t("lmStudioEmbedding.authTokenTooltipPart1")}{" "}
                  <code>{t("lmStudioEmbedding.authTokenTooltipBearer")}</code>{" "}
                  {t("lmStudioEmbedding.authTokenTooltipPart2")}
                  <br /> <br />
                  {t("lmStudioEmbedding.authTokenTooltipPart3")}
                </p>
              </Tooltip>
            </div>
            <input
              type="password"
              name="LMStudioAuthToken"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5 focus:outline-primary-button active:outline-primary-button"
              placeholder={t("lmStudioEmbedding.authTokenPlaceholder")}
              defaultValue={settings?.LMStudioAuthToken ? "*".repeat(20) : ""}
              value={authTokenValue.value}
              onChange={authToken.onChange}
              onBlur={authToken.onBlur}
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

function LMStudioModelSelection({
  settings,
  basePath = null,
  apiKey = null,
}: any) {
  const { t } = useTranslation();
  const { customModels, isLoading: loading } = useProviderModels(
    basePath ? "lmstudio" : null,
    apiKey,
    basePath,
  );

  if (loading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <div className="flex items-center mb-2 gap-x-1">
          <label className="text-white text-sm font-semibold">
            {t("lmStudioEmbedding.modelLabel")}
          </label>
          {!loading && !!basePath && (
            <>
              <Warning
                size={18}
                className="text-red-400 cursor-pointer"
                data-tooltip-id="lmstudio-embedding-model"
              />
              <Tooltip
                id="lmstudio-embedding-model"
                place="top"
                delayShow={300}
                delayHide={400}
                clickable={true}
                className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
              >
                <p className="text-xs leading-[18px] font-base">
                  {t("lmStudioEmbedding.modelErrorTooltip")}
                </p>
              </Tooltip>
            </>
          )}
        </div>
        <select
          name="EmbeddingModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {loading
              ? t("lmStudioEmbedding.loadingModels")
              : !!basePath
                ? t("lmStudioEmbedding.noModelsFound")
                : t("lmStudioEmbedding.enterUrlFirst")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-2">
        {t("lmStudioEmbedding.modelLabelReady")}
      </label>
      <select
        name="EmbeddingModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("lmStudioEmbedding.yourLoadedModels")}>
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
      <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
        {t("lmStudioEmbedding.modelDescription")}
      </p>
    </div>
  );
}
