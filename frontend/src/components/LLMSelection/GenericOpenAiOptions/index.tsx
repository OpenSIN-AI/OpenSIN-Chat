// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useProviderModels from "@/hooks/useProviderModels";

export default function GenericOpenAiOptions({ settings }: any) {
  const { t } = useTranslation();
  const [genericOpenAiBasePath, setGenericOpenAiBasePath] = useState(
    settings?.GenericOpenAiBasePath,
  );
  const [genericOpenAiApiKey, setGenericOpenAiApiKey] = useState(
    settings?.GenericOpenAiApiKey,
  );
  const [genericOpenAiModelPref, setGenericOpenAiModelPref] = useState(
    settings?.GenericOpenAiModelPref,
  );

  return (
    <div className="flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("genericOpenAi.baseUrl")}
          </label>
          <input
            type="url"
            name="GenericOpenAiBasePath"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAi.baseUrlPlaceholder")}
            defaultValue={settings?.GenericOpenAiBasePath}
            onChange={(e) =>
              setGenericOpenAiBasePath((e.target as unknown as any)?.value)
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("genericOpenAi.apiKey")}
          </label>
          <input
            type="password"
            name="GenericOpenAiKey"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAi.apiKeyPlaceholder")}
            defaultValue={settings?.GenericOpenAiKey ? "*".repeat(20) : ""}
            onChange={(e) =>
              setGenericOpenAiApiKey((e.target as unknown as any)?.value)
            }
            required={false}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <GenericOpenAiModelSelection
          settings={settings}
          basePath={genericOpenAiBasePath}
          apiKey={genericOpenAiApiKey}
          genericOpenAiModelPref={genericOpenAiModelPref}
          setGenericOpenAiModelPref={setGenericOpenAiModelPref}
        />
      </div>
      <div className="flex gap-[36px] flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("genericOpenAi.modelContextWindow")}
          </label>
          <input
            type="number"
            name="GenericOpenAiTokenLimit"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAi.contextWindowPlaceholder")}
            min={1}
            onScroll={(e) => (e.target as HTMLElement).blur()}
            defaultValue={settings?.GenericOpenAiTokenLimit}
            required={true}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("genericOpenAi.maxTokens")}
          </label>
          <input
            type="number"
            name="GenericOpenAiMaxTokens"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("genericOpenAi.maxTokensPlaceholder")}
            min={1}
            defaultValue={settings?.GenericOpenAiMaxTokens || 1024}
            required={true}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

function GenericOpenAiModelSelection({
  settings,
  basePath = null,
  apiKey = null,
  genericOpenAiModelPref,
  setGenericOpenAiModelPref,
}: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels(
    "generic-openai",
    apiKey,
    basePath,
  );
  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <div className="flex items-center mb-2 gap-x-1">
          <label className="text-theme-text-primary text-sm font-semibold">
            {t("genericOpenAi.selectedModel")}
          </label>
        </div>
        <select
          name="GenericOpenAiModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {t("genericOpenAi.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  // If no customModels are found, just show a free-form input field for the model name
  if (customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-2">
          {t("genericOpenAi.selectedModel")}
        </label>
        <input
          type="text"
          name="GenericOpenAiModelPref"
          className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("genericOpenAi.modelPlaceholder")}
          defaultValue={genericOpenAiModelPref}
          onChange={(e) =>
            setGenericOpenAiModelPref((e.target as unknown as any)?.value)
          }
          onBlur={() => setGenericOpenAiModelPref(genericOpenAiModelPref)}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-2">
        {t("genericOpenAi.selectedModel")}
      </label>
      <select
        name="GenericOpenAiModelPref"
        required={true}
        defaultValue={genericOpenAiModelPref}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("genericOpenAi.loadedModels")}>
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
