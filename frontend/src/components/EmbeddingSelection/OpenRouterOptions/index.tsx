// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useProviderModels from "@/hooks/useProviderModels";

export default function OpenRouterOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.openRouterEmbedding.apiKey")}
          </label>
          <input
            type="password"
            name="OpenRouterApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t(
              "providerSettings.openRouterEmbedding.apiKeyPlaceholder",
            )}
            defaultValue={settings?.OpenRouterApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <OpenRouterEmbeddingModelSelection settings={settings} />
      </div>
    </div>
  );
}

function OpenRouterEmbeddingModelSelection({ settings }: any) {
  const { t } = useTranslation();
  const { customModels: models, isLoading: loading } = useProviderModels(
    "openrouter-embedder",
  );
  const [selectedModel, setSelectedModel] = useState(
    settings?.EmbeddingModelPref || "",
  );

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.openRouterEmbedding.modelPreference")}
        </label>
        <select
          name="EmbeddingModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("providerSettings.openRouterEmbedding.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("providerSettings.openRouterEmbedding.modelPreference")}
      </label>
      <select
        name="EmbeddingModelPref"
        required={true}
        value={selectedModel}
        onChange={(e) => setSelectedModel((e.target as unknown as any)?.value)}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {(models as any).map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
