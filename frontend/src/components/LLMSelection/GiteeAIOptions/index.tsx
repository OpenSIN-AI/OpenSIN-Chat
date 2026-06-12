import useProviderModels from "@/hooks/useProviderModels"; // SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
export default function GiteeAIOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.giteeAi.apiKey")}
        </label>
        <input
          type="password"
          name="GiteeAIApiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.giteeAi.apiKeyPlaceholder")}
          defaultValue={settings?.GiteeAIApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {!settings?.credentialsOnly && (
        <>
          <GiteeAIModelSelection settings={settings} />
          <div className="flex flex-col w-60">
            <label className="text-white text-sm font-semibold block mb-2">
              {t("providerSettings.giteeAi.modelContextWindow")}
            </label>
            <input
              type="number"
              name="GiteeAITokenLimit"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("providerSettings.giteeAi.contextWindowPlaceholder")}
              min={1}
              onScroll={(e) => (e.target as HTMLElement).blur()}
              defaultValue={settings?.GiteeAITokenLimit}
              required={true}
              autoComplete="off"
            />
          </div>
        </>
      )}
    </div>
  );
}

function GiteeAIModelSelection({ settings }: any) {
  const { t } = useTranslation();
  const { customModels: groupedModels, isLoading } =
    useProviderModels("giteeai");
  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.giteeAi.modelSelection")}
        </label>
        <select
          name="GiteeAIModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("providerSettings.giteeAi.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("providerSettings.giteeAi.modelSelection")}
      </label>
      <select
        name="GiteeAIModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(groupedModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {groupedModels[organization].map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.GiteeAIModelPref === model.id}
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
