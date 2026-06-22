// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import useProviderModels from "@/hooks/useProviderModels";

export default function AnthropicAiOptions({ settings }: any) {
  const { t } = useTranslation();
  const [showAdvancedControls, setShowAdvancedControls] = useState(
    false as any,
  );
  const [inputValue, setInputValue] = useState(settings?.AnthropicApiKey);
  const [anthropicApiKey, setAnthropicApiKey] = useState(
    settings?.AnthropicApiKey,
  );

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("anthropic.apiKey")}
          </label>
          <input
            type="password"
            name="AnthropicApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("anthropic.apiKey")}
            defaultValue={settings?.AnthropicApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
            onBlur={() => setAnthropicApiKey(inputValue)}
          />
        </div>
        {!settings?.credentialsOnly && (
          <AnthropicModelSelection
            apiKey={anthropicApiKey}
            settings={settings}
          />
        )}
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
          {showAdvancedControls ? t("common.hide") : t("common.show")}{" "}
          {t("anthropic.advancedSettings")}
          {showAdvancedControls ? (
            <CaretUp size={14} className="ml-1" />
          ) : (
            <CaretDown size={14} className="ml-1" />
          )}
        </button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-start gap-4 mt-1.5">
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <label className="text-white text-sm font-semibold">
                {t("anthropic.promptCaching")}
              </label>
            </div>
            <select
              name="AnthropicCacheControl"
              className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
            >
              <option value="none">{t("anthropic.noCaching")}</option>
              <option value="5m">{t("anthropic.fiveMinutes")}</option>
              <option value="1h">{t("anthropic.oneHour")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnthropicModelSelection({ apiKey, settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels("anthropic", apiKey);
  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("anthropic.modelSelection")}
        </label>
        <select
          name="AnthropicModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {t("anthropic.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("anthropic.modelSelection")}
      </label>
      <select
        name="AnthropicModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {(customModels as any).map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
