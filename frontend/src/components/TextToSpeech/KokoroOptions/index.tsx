// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function KokoroTTSOptions({ settings }: any) {
  const { t } = useTranslation();
  const [endpoint, setEndpoint] = useState(
    settings?.TTSKokoroEndpoint || "http://localhost:8880/v1",
  );
  const [inputEndpoint, setInputEndpoint] = useState(endpoint);
  const [apiKey, setApiKey] = useState(settings?.TTSKokoroKey);
  const [inputApiKey, setInputApiKey] = useState(apiKey);

  useEffect(() => {
    setEndpoint(settings?.TTSKokoroEndpoint || "http://localhost:8880/v1");
    setInputEndpoint(
      settings?.TTSKokoroEndpoint || "http://localhost:8880/v1",
    );
    setApiKey(settings?.TTSKokoroKey);
    setInputApiKey(settings?.TTSKokoroKey);
  }, [settings?.TTSKokoroEndpoint, settings?.TTSKokoroKey]);

  return (
    <div className="w-full flex flex-col gap-y-7">
      <p className="text-sm font-base text-white text-opacity-60">
        {t("kokoro.intro.part1")}{" "}
        <a
          href="https://github.com/remsky/Kokoro-FastAPI"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {t("kokoro.intro.linkText")}
        </a>{" "}
        {t("kokoro.intro.part2")}
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            {t("kokoro.baseUrl.label")}
          </label>
          <input
            type="url"
            name="TTSKokoroEndpoint"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("kokoro.baseUrl.placeholder")}
            defaultValue={settings?.TTSKokoroEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) =>
              setInputEndpoint((e.target as unknown as any)?.value)
            }
            onBlur={() => setEndpoint(inputEndpoint)}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            {t("kokoro.baseUrl.help", { service: "kokoro-fastapi" })}
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            {t("kokoro.apiKey.label")}
          </label>
          <input
            type="password"
            name="TTSKokoroKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("kokoro.apiKey.placeholder")}
            defaultValue={settings?.TTSKokoroKey ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) =>
              setInputApiKey((e.target as unknown as any)?.value)
            }
            onBlur={() => setApiKey(inputApiKey)}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            {t("kokoro.apiKey.help")}
          </p>
        </div>
      </div>
      <div className="flex gap-x-4">
        <KokoroVoiceSelection
          settings={settings}
          endpoint={endpoint}
          apiKey={apiKey}
        />
      </div>
    </div>
  );
}

function KokoroVoiceSelection({ settings, endpoint, apiKey = null }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading: loading } = useProviderModels(
    endpoint ? "kokoro-tts" : null,
    apiKey,
    endpoint,
  );
  const voices = customModels as any[];

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("kokoro.voiceModel.label")}
        </label>
        <select
          name="TTSKokoroVoiceModel"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("kokoro.voiceModel.loading")}
          </option>
        </select>
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("kokoro.voiceModel.label")}
        </label>
        <input
          type="text"
          name="TTSKokoroVoiceModel"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("kokoro.voiceModel.placeholder")}
          defaultValue={settings?.TTSKokoroVoiceModel ?? "af_bella"}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          {t("kokoro.voiceModel.unreachable")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("kokoro.voiceModel.label")}
      </label>
      <select
        name="TTSKokoroVoiceModel"
        required={true}
        defaultValue={settings?.TTSKokoroVoiceModel ?? "af_bella"}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  );
}
