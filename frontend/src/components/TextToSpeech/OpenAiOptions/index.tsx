// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

export default function OpenAiTextToSpeechOptions({ settings }: any) {
  const { t } = useTranslation();
  const apiKey = settings?.TTSOpenAIKey;

  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("textToSpeech.openAi.apiKey")}
        </label>
        <input
          type="password"
          name="TTSOpenAIKey"
          className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("textToSpeech.openAi.apiKeyPlaceholder")}
          defaultValue={apiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("textToSpeech.openAi.voiceModel")}
        </label>
        <select
          name="TTSOpenAIVoiceModel"
          defaultValue={settings?.TTSOpenAIVoiceModel ?? "alloy"}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
        >
          {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(
            (voice) => {
              return (
                <option key={voice} value={voice}>
                  {t(`textToSpeech.openAi.voices.${voice}`)}
                </option>
              );
            },
          )}
          {/* eslint-enable i18next/no-literal-string */}
        </select>
      </div>
    </div>
  );
}
