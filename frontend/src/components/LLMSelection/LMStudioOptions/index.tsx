// SPDX-License-Identifier: MIT
import { useState } from "react";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import paths from "@/utils/paths";
import { LMSTUDIO_COMMON_URLS } from "@/utils/constants";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { Tooltip } from "react-tooltip";
import useProviderModels from "@/hooks/useProviderModels";

export default function LMStudioOptions({ settings, showAlert = false }: any) {
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
    initialBasePath: settings?.LMStudioBasePath,
    ENDPOINTS: LMSTUDIO_COMMON_URLS,
  });

  const [maxTokens, setMaxTokens] = useState(
    settings?.LMStudioTokenLimit || "",
  );

  const handleMaxTokensChange: any = (e) => {
    setMaxTokens(
      (e.target as unknown as any)?.value
        ? Number((e.target as unknown as any)?.value)
        : "",
    );
  };

  return (
    <div className="w-full flex flex-col gap-y-7">
      {showAlert && (
        <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-white mb-6 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
          <div className="gap-x-2 flex items-center">
            <Info size={12} className="hidden md:visible" />
            <p className="text-sm md:text-base">
              {t("lmStudio.embeddingAlert")}
            </p>
          </div>
          <a
            href={paths.settings.embedder.modelPreference()}
            className="text-sm md:text-base my-2 underline"
          >
            {t("lmStudio.manageEmbedding")}
          </a>
        </div>
      )}
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <LMStudioModelSelection
          settings={settings}
          basePath={basePath.value}
          apiKey={authTokenValue.value}
        />
      </div>
      <div className="flex justify-start mt-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls
            ? t("lmStudio.hideAdvanced")
            : t("lmStudio.showAdvanced")}{" "}
          {t("lmStudio.advancedSettings")}
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
                <label className="text-theme-text-primary text-sm font-semibold">
                  {t("lmStudio.baseUrlLabel")}
                </label>
                <Info
                  size={18}
                  className="text-theme-text-secondary cursor-pointer"
                  data-tooltip-id="lmstudio-base-url"
                  data-tooltip-content={t("lmStudio.baseUrlTooltip")}
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
                      onClick={handleAutoDetectClick}
                      className="border-none bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      {t("lmStudio.autoDetect")}
                    </button>
                  )}
                </>
              )}
            </div>
            <input
              type="url"
              name="LMStudioBasePath"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("lmStudio.baseUrlPlaceholder")}
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
              <label className="text-theme-text-primary text-sm font-semibold">
                {t("lmStudio.contextWindowLabel")}
              </label>
              <Info
                size={18}
                className="text-theme-text-secondary cursor-pointer"
                data-tooltip-id="lmstudio-max-tokens"
                data-tooltip-content={t("lmStudio.contextWindowTooltip")}
              />
              <Tooltip
                id="lmstudio-max-tokens"
                className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
              />
            </div>
            <input
              type="number"
              name="LMStudioTokenLimit"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("lmStudio.contextWindowPlaceholder")}
              min={1}
              value={maxTokens}
              onChange={handleMaxTokensChange}
              onScroll={(e) => (e.target as HTMLElement).blur()}
              required={false}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex items-start gap-4 mt-4">
          <div className="flex flex-col w-60">
            <div className="flex items-center mb-2 gap-x-1">
              <label className="text-theme-text-primary text-sm font-semibold">
                {t("lmStudio.authTokenLabel")}
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
                  {t("lmStudio.authTokenTooltipPart1")}{" "}
                  <code>{t("lmStudio.authTokenTooltipBearer")}</code>{" "}
                  {t("lmStudio.authTokenTooltipPart2")}
                  <br /> <br />
                  {t("lmStudio.authTokenTooltipPart3")}
                </p>
              </Tooltip>
            </div>
            <input
              type="password"
              name="LMStudioAuthToken"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5 focus:outline-primary-button active:outline-primary-button"
              placeholder={t("lmStudio.authTokenPlaceholder")}
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
  const { customModels, isLoading } = useProviderModels(
    "lmstudio",
    apiKey,
    basePath,
  );
  if (isLoading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <div className="flex items-center mb-2 gap-x-1">
          <label className="text-theme-text-primary text-sm font-semibold">
            {t("lmStudio.modelLabel")}
          </label>
          {!isLoading && !!basePath && (
            <>
              <Warning
                size={18}
                className="text-red-400 cursor-pointer"
                data-tooltip-id="lmstudio-selected-model"
              />
              <Tooltip
                id="lmstudio-selected-model"
                place="top"
                delayShow={300}
                delayHide={400}
                clickable={true}
                className="tooltip !text-xs !opacity-100 z-[99] !max-w-[250px] !whitespace-normal !break-words"
              >
                <p className="text-xs leading-[18px] font-base">
                  {t("lmStudio.modelErrorTooltip")}
                </p>
              </Tooltip>
            </>
          )}
        </div>
        <select
          name="LMStudioModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {isLoading
              ? t("lmStudio.loadingModels")
              : !!basePath
                ? t("lmStudio.noModelsFound")
                : t("lmStudio.enterUrlFirst")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-2">
        {t("lmStudio.modelLabel")}
      </label>
      <select
        name="LMStudioModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("lmStudio.yourLoadedModels")}>
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
    </div>
  );
}
