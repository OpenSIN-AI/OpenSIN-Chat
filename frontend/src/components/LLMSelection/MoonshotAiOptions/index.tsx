// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function MoonshotAiOptions({ settings }: any) {
  const [inputValue, setInputValue] = useState(settings?.MoonshotAiApiKey);
  const [moonshotAiKey, setMoonshotAiKey] = useState(
    settings?.MoonshotAiApiKey,
  );
  const { t } = useTranslation();

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.moonshotAi.apiKey")}
        </label>
        <input
          type="password"
          name="MoonshotAiApiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.moonshotAi.apiKeyPlaceholder")}
          defaultValue={settings?.MoonshotAiApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setMoonshotAiKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <MoonshotAiModelSelection settings={settings} apiKey={moonshotAiKey} />
      )}
    </div>
  );
}

function MoonshotAiModelSelection({ apiKey, settings }: any) {
  const { customModels, isLoading } = useProviderModels("moonshotai", apiKey);
  const { t } = useTranslation();
  if (!apiKey) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.moonshotAi.modelSelection")}
        </label>
        <select
          name="MoonshotAiModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("providerSettings.moonshotAi.enterApiKey")}
          </option>
        </select>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.moonshotAi.modelSelection")}
        </label>
        <select
          name="MoonshotAiModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("providerSettings.moonshotAi.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("providerSettings.moonshotAi.modelSelection")}
      </label>
      <select
        name="MoonshotAiModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {(customModels as any).map((model) => (
          <option
            key={model.id}
            value={model.id}
            selected={settings?.MoonshotAiModelPref === model.id}
          >
            {model.id}
          </option>
        ))}
      </select>
    </div>
  );
}
