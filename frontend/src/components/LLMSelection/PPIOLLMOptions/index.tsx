import useProviderModels from "@/hooks/useProviderModels"; // SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
export default function PPIOLLMOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("providerSettings.ppio.apiKey")}
          </label>
          <input
            type="password"
            name="PPIOApiKey"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.ppio.apiKeyPlaceholder")}
            defaultValue={settings?.PPIOApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {!settings?.credentialsOnly && (
          <PPIOModelSelection settings={settings} />
        )}
      </div>
    </div>
  );
}

function PPIOModelSelection({ settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels("ppio");
  if (isLoading || Object.keys(customModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.ppio.modelSelection")}
        </label>
        <select
          name="PPIOModelPref"
          required={true}
          disabled={true}
          className="bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:ring-primary-button focus:border-primary-button block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("providerSettings.ppio.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <label className="text-theme-text-primary text-sm font-semibold block mb-3">
        {t("providerSettings.ppio.modelSelection")}
      </label>
      <select
        name="PPIOModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg text-theme-text-primary border-theme-border text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(customModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {customModels[organization].map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.PPIOModelPref === model.id}
                >
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
    </div>
  );
}
