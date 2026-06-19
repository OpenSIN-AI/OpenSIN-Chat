// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, CaretDown, CaretUp } from "@phosphor-icons/react";
import paths from "@/utils/paths";
import PreLoader from "@/components/Preloader";
import { LOCALAI_COMMON_URLS } from "@/utils/constants";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import useProviderModels from "@/hooks/useProviderModels";

export default function LocalAiOptions({ settings, showAlert = false }: any) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "localai",
    initialBasePath: settings?.LocalAiBasePath,
    ENDPOINTS: LOCALAI_COMMON_URLS,
  });
  const [apiKeyValue, setApiKeyValue] = useState(settings?.LocalAiApiKey);
  const [apiKey, setApiKey] = useState(settings?.LocalAiApiKey);

  return (
    <div className="w-full flex flex-col gap-y-7">
      {showAlert && (
        <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-white mb-6 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
          <div className="gap-x-2 flex items-center">
            <Info size={12} className="hidden md:visible" />
            <p className="text-sm md:text-base">
              {t("localAiLlm.alertMessage")}
            </p>
          </div>
          <a
            href={paths.settings.embedder.modelPreference()}
            className="text-sm md:text-base my-2 underline"
          >
            {t("localAiLlm.manageEmbedding")}
          </a>
        </div>
      )}
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        {!settings?.credentialsOnly && (
          <>
            <LocalAIModelSelection
              settings={settings}
              basePath={basePath.value}
              apiKey={apiKey}
            />
            <div className="flex flex-col w-60">
              <label className="text-white text-sm font-semibold block mb-2">
                {t("localAiLlm.contextWindowLabel")}
              </label>
              <input
                type="number"
                name="LocalAiTokenLimit"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("localAiLlm.contextWindowPlaceholder")}
                min={1}
                onScroll={(e) => (e.target as HTMLElement).blur()}
                defaultValue={settings?.LocalAiTokenLimit}
                required={true}
                autoComplete="off"
              />
            </div>
          </>
        )}
        <div className="flex flex-col w-60">
          <div className="flex flex-col gap-y-1 mb-2">
            <label className="text-white text-sm font-semibold flex items-center gap-x-2">
              {t("localAiLlm.apiKeyLabel")}{" "}
              <p className="!text-xs !italic !font-thin">
                {t("localAiLlm.optional")}
              </p>
            </label>
          </div>
          <input
            type="password"
            name="LocalAiApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("localAiLlm.apiKeyPlaceholder")}
            defaultValue={settings?.LocalAiApiKey ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) =>
              setApiKeyValue((e.target as unknown as any)?.value)
            }
            onBlur={() => setApiKey(apiKeyValue)}
          />
        </div>
      </div>
      <div className="flex justify-start mt-4">
        <button type="button"
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls
            ? t("localAiLlm.hideAdvanced")
            : t("localAiLlm.showAdvanced")}{" "}
          {t("localAiLlm.advancedSettings")}
          {showAdvancedControls ? (
            <CaretUp size={14} className="ml-1" />
          ) : (
            <CaretDown size={14} className="ml-1" />
          )}
        </button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-center gap-4">
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <label className="text-white text-sm font-semibold">
                {t("localAiLlm.baseUrlLabel")}
              </label>
              {loading ? (
                <PreLoader size="6" />
              ) : (
                <>
                  {!basePathValue.value && (
                    <button type="button"
                      onClick={handleAutoDetectClick}
                      className="bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      {t("localAiLlm.autoDetect")}
                    </button>
                  )}
                </>
              )}
            </div>
            <input
              type="url"
              name="LocalAiBasePath"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("localAiLlm.baseUrlPlaceholder")}
              value={basePathValue.value}
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

function LocalAIModelSelection({
  settings,
  basePath = null,
  apiKey = null,
}: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels(
    "localai",
    apiKey,
    basePath,
  );
  if (isLoading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-2">
          {t("localAiLlm.modelLabel")}
        </label>
        <select
          name="LocalAiModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {basePath?.includes("/v1")
              ? t("localAiLlm.loadingModels")
              : t("localAiLlm.waitingUrl")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-2">
        {t("localAiLlm.modelLabel")}
      </label>
      <select
        name="LocalAiModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("localAiLlm.yourLoadedModels")}>
            {(customModels as any).map((model) => {
              return (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings.LocalAiModelPref === model.id}
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
