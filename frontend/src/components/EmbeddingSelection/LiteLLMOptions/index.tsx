// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";

export default function LiteLLMOptions({ settings }: any) {
  const { t } = useTranslation();
  const [basePathValue, setBasePathValue] = useState(settings?.LiteLLMBasePath);
  const [basePath, setBasePath] = useState(settings?.LiteLLMBasePath);
  const [apiKeyValue, setApiKeyValue] = useState(settings?.LiteLLMAPIKey);
  const [apiKey, setApiKey] = useState(settings?.LiteLLMAPIKey);

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("liteLLM.baseUrl.label")}
          </label>
          <input
            type="url"
            name="LiteLLMBasePath"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("liteLLM.baseUrl.placeholder")}
            defaultValue={settings?.LiteLLMBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) =>
              setBasePathValue((e.target as unknown as any)?.value)
            }
            onBlur={() => setBasePath(basePathValue)}
          />
        </div>
        <LiteLLMModelSelection
          settings={settings}
          basePath={basePath}
          apiKey={apiKey}
        />
        <div className="flex flex-col w-60">
          <div
            data-tooltip-place="top"
            data-tooltip-id="max-embedding-chunk-length-tooltip"
            className="flex gap-x-1 items-center mb-3"
          >
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
            <label className="text-white text-sm font-semibold block">
              {t("liteLLM.maxChunkLength.label")}
            </label>
            <Tooltip id="max-embedding-chunk-length-tooltip">
              {t("liteLLM.maxChunkLength.tooltip")}
            </Tooltip>
          </div>
          <input
            type="number"
            name="EmbeddingModelMaxChunkLength"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("liteLLM.maxChunkLength.placeholder")}
            min={1}
            onScroll={(e) => (e.target as HTMLElement).blur()}
            defaultValue={settings?.EmbeddingModelMaxChunkLength}
            required={false}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <div className="flex flex-col gap-y-1 mb-4">
            <label className="text-white text-sm font-semibold flex items-center gap-x-2">
              {t("liteLLM.apiKey.label")}{" "}
              <p className="!text-xs !italic !font-thin">
                {t("common.optional")}
              </p>
            </label>
          </div>
          <input
            type="password"
            name="LiteLLMAPIKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("liteLLM.apiKey.placeholder")}
            defaultValue={settings?.LiteLLMAPIKey ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) =>
              setApiKeyValue((e.target as unknown as any)?.value)
            }
            onBlur={() => setApiKey(apiKeyValue)}
          />
        </div>
      </div>
    </div>
  );
}

function LiteLLMModelSelection({
  settings,
  basePath = null,
  apiKey = null,
}: any) {
  const { t } = useTranslation();
  const { customModels, isLoading: loading } = useProviderModels(
    basePath ? "litellm" : null,
    apiKey,
    basePath,
  );
  const models = customModels as any[];

  if (loading || models.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("liteLLM.modelSelection.label")}
        </label>
        <select
          name="EmbeddingModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {basePath?.includes("/v1")
              ? t("liteLLM.modelSelection.loadingModels")
              : t("liteLLM.modelSelection.waitingForUrl")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <div className="flex items-center">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("liteLLM.modelSelection.label")}
        </label>
        <EmbeddingModelTooltip />
      </div>
      <select
        name="EmbeddingModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {models.length > 0 && (
          <optgroup label={t("liteLLM.modelSelection.yourLoadedModels")}>
            {models.map((model) => {
              return (
                <option
                  key={model.id}
                  value={model.id}
                >
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

function EmbeddingModelTooltip() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center -mt-3 ml-1">
      <Warning
        size={14}
        className="ml-1 text-orange-500 cursor-pointer"
        data-tooltip-id="model-tooltip"
        data-tooltip-place="right"
      />
      <Tooltip
        delayHide={300}
        id="model-tooltip"
        className="max-w-xs"
        clickable={true}
      >
        <p className="text-sm">
          {t("liteLLM.modelSelection.tooltip.intro") + " "}
          <a
            href="https://litellm.vercel.app/docs/embedding/supported_embedding"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {t("liteLLM.modelSelection.tooltip.linkText")}
          </a>{" "}
          {t("liteLLM.modelSelection.tooltip.outro")}
        </p>
      </Tooltip>
    </div>
  );
}
