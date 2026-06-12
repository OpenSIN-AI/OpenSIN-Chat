// SPDX-License-Identifier: MIT
import { LEMONADE_COMMON_URLS } from "@/utils/constants";
import { CircleNotch, Info } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { cleanBasePath } from "@/components/LLMSelection/LemonadeOptions";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function LemonadeSpeechToTextOptions({ settings }: any) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lemonade",
    initialBasePath: settings?.STTLemonadeBasePath,
    ENDPOINTS: LEMONADE_COMMON_URLS,
  });

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <div className="flex justify-between items-center gap-x-2">
              <label className="text-white text-sm font-semibold">
                {t("speechToText.lemonade.baseUrl")}
              </label>
              {loading ? (
                <CircleNotch className="w-4 h-4 text-theme-text-secondary animate-spin" />
              ) : (
                <>
                  {!basePathValue.value && (
                    <button
                      type="button"
                      onClick={handleAutoDetectClick}
                      className="border-none bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      {t("speechToText.lemonade.autoDetect")}
                    </button>
                  )}
                </>
              )}
            </div>
            <Tooltip
              id="lemonade-stt-base-url"
              place="top"
              delayShow={300}
              delayHide={800}
              clickable={true}
              className="tooltip !text-xs !opacity-100 z-99 !max-w-[250px] !whitespace-normal !break-words"
            >
              {t("speechToText.lemonade.baseUrlTooltip")}
            </Tooltip>
            <div
              className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full"
              data-tooltip-id="lemonade-stt-base-url"
              data-tooltip-place="top"
              data-tooltip-delay-hide={800}
            >
              <Info size={18} className="text-theme-text-secondary" />
            </div>
          </div>
          <input
            type="url"
            name="STTLemonadeBasePath"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("speechToText.lemonade.baseUrlPlaceholder")}
            value={cleanBasePath(basePathValue.value)}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={basePath.onChange}
            onBlur={basePath.onBlur}
          />
        </div>
        <LemonadeSTTModelSelection
          settings={settings}
          basePath={basePathValue.value}
        />
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <label className="text-white text-sm font-semibold block">
              {t("speechToText.lemonade.apiKeyOptional")}
            </label>
            <Tooltip
              id="lemonade-stt-api-key"
              place="top"
              delayShow={300}
              delayHide={800}
              clickable={true}
              className="tooltip !text-xs !opacity-100 z-99 !max-w-[350px] !whitespace-normal !break-words"
            >
              {t("speechToText.lemonade.apiKeyTooltip")}
            </Tooltip>
            <div
              className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full"
              data-tooltip-id="lemonade-stt-api-key"
              data-tooltip-place="top"
              data-tooltip-delay-hide={800}
            >
              <Info size={18} className="text-theme-text-secondary" />
            </div>
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
    </div>
  );
}

function LemonadeSTTModelSelection({ settings, basePath = null }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading: loading } = useProviderModels(
    basePath ? "lemonade-stt" : null,
    null,
    basePath,
  );

  if (loading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("speechToText.lemonade.transcriptionModel")}
        </label>
        <select
          name="STTLemonadeModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {basePath
              ? t("speechToText.lemonade.noModelsFound")
              : t("speechToText.lemonade.enterUrlFirst")}
          </option>
        </select>
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          {t("speechToText.lemonade.modelHelp")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("speechToText.lemonade.transcriptionModel")}
      </label>
      <select
        name="STTLemonadeModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        <optgroup label={t("speechToText.lemonade.loadedModels")}>
          {(customModels as any).map((model) => (
            <option
              key={model.id}
              value={model.id}
              selected={settings?.STTLemonadeModelPref === model.id}
            >
              {model.id}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
