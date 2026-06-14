// SPDX-License-Identifier: MIT
import { useState, useMemo } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function ElevenLabsOptions({ settings }: any) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.TTSElevenLabsKey);
  const [elevenLabsKey, setElevenLabsKey] = useState(
    settings?.TTSElevenLabsKey,
  );

  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("textToSpeech.elevenLabs.apiKey")}
        </label>
        <input
          type="password"
          name="TTSElevenLabsKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("textToSpeech.elevenLabs.apiKeyPlaceholder")}
          defaultValue={settings?.TTSElevenLabsKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setElevenLabsKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <ElevenLabsModelSelection settings={settings} apiKey={elevenLabsKey} />
      )}
    </div>
  );
}

function groupByOrganization(models: any[] = []) {
  return models.reduce((acc, model) => {
    acc[model.organization] = acc[model.organization] || [];
    acc[model.organization].push(model);
    return acc;
  }, {});
}

function ElevenLabsModelSelection({ apiKey, settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading: loading } = useProviderModels(
    apiKey ? "elevenlabs-tts" : null,
    apiKey,
  );
  const models = customModels as any[];
  const groupedModels = useMemo(() => groupByOrganization(models), [models]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("textToSpeech.elevenLabs.modelSelection")}
        </label>
        <select
          name="TTSElevenLabsVoiceModel"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("textToSpeech.elevenLabs.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("textToSpeech.elevenLabs.modelSelection")}
      </label>
      <select
        name="TTSElevenLabsVoiceModel"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(groupedModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {groupedModels[organization].map((model: any) => (
                <option
                  key={model.id}
                  value={model.id}
                  selected={model.id === settings?.TTSElevenLabsVoiceModel}
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
