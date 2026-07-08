// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useProviderModels from "@/hooks/useProviderModels";

export default function MistralOptions({ settings }: any) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.MistralApiKey);
  const [mistralKey, setMistralKey] = useState(settings?.MistralApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.mistral.apiKey")}
        </label>
        <input
          type="password"
          name="MistralApiKey"
          className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.mistral.apiKeyPlaceholder")}
          defaultValue={settings?.MistralApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setMistralKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <MistralModelSelection settings={settings} apiKey={mistralKey} />
      )}
    </div>
  );
}

function MistralModelSelection({ apiKey, settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels("mistral", apiKey);
  if (isLoading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.mistral.modelSelection")}
        </label>
        <select
          name="MistralModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {!!apiKey
              ? t("providerSettings.mistral.loadingModels")
              : t("providerSettings.mistral.waitingForApiKey")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-3">
        {t("providerSettings.mistral.modelSelection")}
      </label>
      <select
        name="MistralModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("providerSettings.mistral.availableModels")}>
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
