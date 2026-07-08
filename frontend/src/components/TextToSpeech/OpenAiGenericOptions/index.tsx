// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

export default function OpenAiGenericTextToSpeechOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <div className="flex justify-between items-start mb-2">
            <label className="text-theme-text-primary text-sm font-semibold">
              {t("textToSpeech.openAiGeneric.baseUrl")}
            </label>
          </div>
          <input
            type="url"
            name="TTSOpenAICompatibleEndpoint"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("textToSpeech.openAiGeneric.baseUrlPlaceholder")}
            defaultValue={settings?.TTSOpenAICompatibleEndpoint}
            required={false}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("textToSpeech.openAiGeneric.baseUrlDescription")}
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-2">
            {t("textToSpeech.openAiGeneric.apiKey")}
          </label>
          <input
            type="password"
            name="TTSOpenAICompatibleKey"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("textToSpeech.openAiGeneric.apiKeyPlaceholder")}
            defaultValue={
              settings?.TTSOpenAICompatibleKey ? "*".repeat(20) : ""
            }
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("textToSpeech.openAiGeneric.apiKeyDescription")}
          </p>
        </div>
      </div>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("textToSpeech.openAiGeneric.ttsModel")}
          </label>
          <input
            type="text"
            name="TTSOpenAICompatibleModel"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("textToSpeech.openAiGeneric.ttsModelPlaceholder")}
            defaultValue={settings?.TTSOpenAICompatibleModel}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
          {/* eslint-disable i18next/no-literal-string */}
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("textToSpeech.openAiGeneric.ttsModelDescriptionPart1")}
            <code>model</code>
            {t("textToSpeech.openAiGeneric.ttsModelDescriptionPart2")}
          </p>
          {/* eslint-enable i18next/no-literal-string */}
        </div>
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("textToSpeech.openAiGeneric.voiceModel")}
          </label>
          <input
            type="text"
            name="TTSOpenAICompatibleVoiceModel"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("textToSpeech.openAiGeneric.voiceModelPlaceholder")}
            defaultValue={settings?.TTSOpenAICompatibleVoiceModel}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("textToSpeech.openAiGeneric.voiceModelDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
