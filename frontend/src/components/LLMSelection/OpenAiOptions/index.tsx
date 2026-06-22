// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function OpenAiOptions({ settings }: any) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.OpenAiKey);
  const [openAIKey, setOpenAIKey] = useState(settings?.OpenAiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.openAi.apiKey")}
        </label>
        <input
          type="password"
          name="OpenAiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.openAi.apiKeyPlaceholder")}
          defaultValue={settings?.OpenAiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setOpenAIKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <OpenAIModelSelection settings={settings} apiKey={openAIKey} />
      )}
    </div>
  );
}

function OpenAIModelSelection({ apiKey, settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels("openai", apiKey);
  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.openAi.modelSelection")}
        </label>
        <select
          name="OpenAiModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {t("providerSettings.openAi.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("providerSettings.openAi.modelSelection")}
      </label>
      <select
        name="OpenAiModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
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
