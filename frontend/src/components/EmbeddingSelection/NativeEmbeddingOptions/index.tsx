// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useProviderModels from "@/hooks/useProviderModels";

export default function NativeEmbeddingOptions({ settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading: loading } =
    useProviderModels("native-embedder");
  const availableModels = customModels as any[];
  const [selectedModel, setSelectedModel] = useState(
    settings?.EmbeddingModelPref,
  );
  const selectedModelInfo = availableModels.find(
    (model: any) => model.id === selectedModel,
  );

  // Pick the first available model on initial load when no saved preference exists.
  useEffect(() => {
    if (!availableModels?.length || selectedModel) return;
    const defaultModel = availableModels[0];
    setSelectedModel(defaultModel.id);
  }, [availableModels, selectedModel]);

  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex flex-col mt-1.5">
        <div className="flex flex-col w-96">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.nativeEmbedding.modelPreference")}
          </label>
          <select
            name="EmbeddingModelPref"
            required={true}
            defaultValue={selectedModel}
            className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-60 p-2.5"
            onChange={(e) =>
              setSelectedModel((e.target as unknown as any)?.value)
            }
          >
            {loading ? (
              <option value="--loading-available-models--" disabled={true}>
                {t("providerSettings.nativeEmbedding.loadingModels")}
              </option>
            ) : (
              <optgroup
                label={t("providerSettings.nativeEmbedding.availableModels")}
              >
                {(availableModels as any).map((model) => {
                  return (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  );
                })}
              </optgroup>
            )}
          </select>
        </div>
        {selectedModelInfo && (
          <div className="flex flex-col gap-y-2 mt-2">
            <p className="text-theme-text-secondary text-xs font-normal block">
              {selectedModelInfo?.description}
            </p>
            <p className="text-theme-text-secondary text-xs font-normal block">
              {t("providerSettings.nativeEmbedding.trainedOn")}{" "}
              {selectedModelInfo?.lang}
            </p>
            <p className="text-theme-text-secondary text-xs font-normal block">
              {t("providerSettings.nativeEmbedding.downloadSize")}{" "}
              {selectedModelInfo?.size}
            </p>
            <Link
              to={selectedModelInfo?.modelCard}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-text-secondary text-xs font-normal block underline hover:text-theme-text-primary"
            >
              {t("providerSettings.nativeEmbedding.viewModelCard")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
