// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function XAILLMOptions({ settings }: any) {
  const [inputValue, setInputValue] = useState(settings?.XAIApiKey);
  const [apiKey, setApiKey] = useState(settings?.XAIApiKey);
  const { t } = useTranslation();

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.xAi.apiKey")}
        </label>
        <input
          type="password"
          name="XAIApiKey"
          className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.xAi.apiKeyPlaceholder")}
          defaultValue={settings?.XAIApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>

      {!settings?.credentialsOnly && (
        <XAIModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

function XAIModelSelection({ apiKey, settings }: any) {
  const { customModels, isLoading } = useProviderModels("xai", apiKey);
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.xAi.modelSelection")}
        </label>
        <select
          name="XAIModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg text-theme-text-primary border-theme-border text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {t("providerSettings.xAi.loadingModels")}
          </option>
        </select>
        <p className="text-xs leading-[18px] font-base text-theme-text-primary opacity-60 mt-2">
          {t("providerSettings.xAi.enterApiKeyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-3">
        {t("providerSettings.xAi.modelSelection")}
      </label>
      <select
        name="XAIModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg text-theme-text-primary border-theme-border text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("providerSettings.xAi.availableModels")}>
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
      <p className="text-xs leading-[18px] font-base text-theme-text-primary opacity-60 mt-2">
        {t("providerSettings.xAi.selectModelHint")}
      </p>
    </div>
  );
}
