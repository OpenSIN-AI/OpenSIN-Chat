// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import System from "@/models/system";
import { useTranslation } from "react-i18next";

export default function DeepgramSpeechToTextOptions({ settings }: any) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.STTDeepgramApiKey);
  const [deepgramApiKey, setDeepgramApiKey] = useState(
    settings?.STTDeepgramApiKey,
  );

  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("speechToText.deepgram.apiKey")}
        </label>
        <input
          type="password"
          name="STTDeepgramApiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("speechToText.deepgram.apiKeyPlaceholder")}
          defaultValue={settings?.STTDeepgramApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setDeepgramApiKey(inputValue)}
        />
      </div>
      <DeepgramSttModelSelection apiKey={deepgramApiKey} settings={settings} />
    </div>
  );
}

function DeepgramSttModelSelection({ apiKey, settings }: any) {
  const { t } = useTranslation();
  const [models, setModels] = useState([] as any);
  const [loading, setLoading] = useState(true as any);

  useEffect(() => {
    async function findModels() {
      setLoading(true);
      const { models } = await System.customModels(
        "deepgram-stt",
        typeof apiKey === "boolean" ? null : apiKey,
      );
      setModels(models || []);
      setLoading(false);
    }
    findModels();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("speechToText.deepgram.modelSelection")}
        </label>
        <select
          name="STTDeepgramModel"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("speechToText.deepgram.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("speechToText.deepgram.modelSelection")}
      </label>
      <select
        name="STTDeepgramModel"
        required={true}
        defaultValue={settings?.STTDeepgramModel ?? "nova-3"}
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
