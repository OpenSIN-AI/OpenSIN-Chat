// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function GroqAiOptions({ settings }: any) {
  const [inputValue, setInputValue] = useState(settings?.GroqApiKey);
  const [apiKey, setApiKey] = useState(settings?.GroqApiKey);
  const { t } = useTranslation();

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.groqAi.apiKey")}
        </label>
        <input
          type="password"
          name="GroqApiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.groqAi.apiKeyPlaceholder")}
          defaultValue={settings?.GroqApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>

      {!settings?.credentialsOnly && (
        <GroqAIModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

function GroqAIModelSelection({ apiKey, settings }: any) {
  const { customModels, isLoading } = useProviderModels("groq", apiKey);
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.groqAi.modelSelection")}
        </label>
        <select
          name="GroqModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("providerSettings.groqAi.loadingModels")}
          </option>
        </select>
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          {t("providerSettings.groqAi.enterApiKeyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("providerSettings.groqAi.modelSelection")}
      </label>
      <select
        name="GroqModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("providerSettings.groqAi.availableModels")}>
            {(customModels as any).map((model) => {
              return (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.GroqModelPref === model.id}
                >
                  {model.id}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
      <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
        {t("providerSettings.groqAi.selectModelHint")}
      </p>
    </div>
  );
}
