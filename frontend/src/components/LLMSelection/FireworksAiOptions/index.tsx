// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useProviderModels from "@/hooks/useProviderModels";

export default function FireworksAiOptions({ settings }: any) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.FireworksAiLLMApiKey);
  const [fireworksAiApiKey, setFireworksAiApiKey] = useState(
    settings?.FireworksAiLLMApiKey,
  );

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.fireworksAi.apiKey")}
        </label>
        <input
          type="password"
          name="FireworksAiLLMApiKey"
          className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.fireworksAi.apiKeyPlaceholder")}
          defaultValue={settings?.FireworksAiLLMApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setFireworksAiApiKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <FireworksAiModelSelection
          apiKey={fireworksAiApiKey}
          settings={settings}
        />
      )}
    </div>
  );
}
function FireworksAiModelSelection({ apiKey, settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels("fireworksai", apiKey);
  if (isLoading || Object.keys(customModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.fireworksAi.modelSelection")}
        </label>
        <select
          name="FireworksAiLLMModelPref"
          disabled={true}
          defaultValue=""
          className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {t("providerSettings.fireworksAi.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-3">
        {t("providerSettings.fireworksAi.modelSelection")}
      </label>
      <select
        name="FireworksAiLLMModelPref"
        required={true}
        defaultValue={settings?.FireworksAiLLMModelPref ?? ""}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(customModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {customModels[organization].map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
    </div>
  );
}
