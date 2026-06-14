// SPDX-License-Identifier: MIT
import { Info } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";

const DEFAULT_MODELS = [
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001",
  },
];

export default function GeminiOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-6">
      <div className="w-full flex flex-col gap-y-4">
        <div className="w-full flex items-center gap-[36px] mt-1.5">
          <div className="flex flex-col w-60">
            <label className="text-white text-sm font-semibold block mb-3">
              {t("providerSettings.geminiEmbedding.apiKey")}
            </label>
            <input
              type="password"
              name="GeminiEmbeddingApiKey"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t(
                "providerSettings.geminiEmbedding.apiKeyPlaceholder",
              )}
              defaultValue={
                settings?.GeminiEmbeddingApiKey ? "*".repeat(20) : ""
              }
              required={true}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col w-60">
            <label className="text-white text-sm font-semibold block mb-3">
              {t("providerSettings.geminiEmbedding.modelPreference")}
            </label>
            <select
              name="EmbeddingModelPref"
              required={true}
              className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
            >
              <optgroup
                label={t("providerSettings.geminiEmbedding.availableModels")}
              >
                {(DEFAULT_MODELS as any).map((model) => {
                  return (
                    <option
                      key={model.id}
                      value={model.id}
                      selected={settings?.EmbeddingModelPref === model.id}
                    >
                      {model.name}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-60">
        <div
          data-tooltip-id="embedding-output-dimensions-tooltip"
          className="flex gap-x-1 items-center mb-3"
        >
          <label className="text-white text-sm font-semibold block">
            {t("providerSettings.geminiEmbedding.outputDimensions")}
          </label>
          <Info
            size={16}
            className="text-theme-text-secondary cursor-pointer"
          />
          <Tooltip
            id="embedding-output-dimensions-tooltip"
            place="top"
            delayShow={300}
            className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
          >
            {t("providerSettings.geminiEmbedding.outputDimensionsTooltip")}
            <br />
            <br />{" "}
            {t("providerSettings.geminiEmbedding.outputDimensionsTooltip2")}
          </Tooltip>
        </div>
        <input
          type="number"
          name="EmbeddingOutputDimensions"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t(
            "providerSettings.geminiEmbedding.outputDimensionsPlaceholder",
          )}
          min={1}
          onScroll={(e) => (e.target as HTMLElement).blur()}
          defaultValue={settings?.EmbeddingOutputDimensions}
          required={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
