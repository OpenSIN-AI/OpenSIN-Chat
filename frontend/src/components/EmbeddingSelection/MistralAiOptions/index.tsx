// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
export default function MistralAiOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("mistralAiOptions.apiKey")}
          </label>
          <input
            type="password"
            name="MistralApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("mistralAiOptions.apiKeyPlaceholder")}
            defaultValue={settings?.MistralApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("mistralAiOptions.modelPreference")}
          </label>
          <select
            name="EmbeddingModelPref"
            required={true}
            defaultValue={settings?.EmbeddingModelPref}
            className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
          >
             <optgroup label={t("mistralAiOptions.availableModels")}>
              {["mistral-embed"].map((model) => { // eslint-disable-line i18next/no-literal-string
                return (
                  <option key={model} value={model}>
                    {model}
                  </option>
                );
              })}
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  );
}
