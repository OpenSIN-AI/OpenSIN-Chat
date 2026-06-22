// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
export default function OpenAiOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.openAiEmbedding.apiKey")}
          </label>
          <input
            type="password"
            name="OpenAiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t(
              "providerSettings.openAiEmbedding.apiKeyPlaceholder",
            )}
            defaultValue={settings?.OpenAiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.openAiEmbedding.modelPreference")}
          </label>
          <select
            name="EmbeddingModelPref"
            required={true}
            defaultValue={
              settings?.EmbeddingModelPref || "text-embedding-ada-002"
            }
            className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
          >
            <optgroup
              label={t("providerSettings.openAiEmbedding.availableModels")}
            >
              {/* eslint-disable i18next/no-literal-string */}
              {[
                "text-embedding-ada-002",
                "text-embedding-3-small",
                "text-embedding-3-large",
              ].map((model) => {
                return (
                  <option key={model} value={model}>
                    {model}
                  </option>
                );
              })}
              {/* eslint-enable i18next/no-literal-string */}
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  );
}
