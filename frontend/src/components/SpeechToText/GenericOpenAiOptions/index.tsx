// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

export default function GenericOpenAiSpeechToTextOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-2">
            {t("speechToText.genericOpenAi.baseUrl")}
          </label>
          <input
            type="url"
            name="STTOpenAICompatibleEndpoint"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("speechToText.genericOpenAi.baseUrlPlaceholder")}
            defaultValue={settings?.STTOpenAICompatibleEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("speechToText.genericOpenAi.baseUrlDescription")}
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-2">
            {t("speechToText.genericOpenAi.apiKey")}
          </label>
          <input
            type="password"
            name="STTOpenAICompatibleKey"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("speechToText.genericOpenAi.apiKeyPlaceholder")}
            defaultValue={
              settings?.STTOpenAICompatibleKey ? "*".repeat(20) : ""
            }
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("speechToText.genericOpenAi.apiKeyDescription")}
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-2">
            {t("speechToText.genericOpenAi.transcriptionModel")}
          </label>
          <input
            type="text"
            name="STTOpenAICompatibleModel"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("speechToText.genericOpenAi.modelPlaceholder")}
            defaultValue={settings?.STTOpenAICompatibleModel}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("speechToText.genericOpenAi.modelDescriptionPart1")}
            <code>model</code>
            {t("speechToText.genericOpenAi.modelDescriptionPart2")}
            <code>whisper-1</code>
            {t("speechToText.genericOpenAi.modelDescriptionPart3")}
          </p>
          {}
        </div>
      </div>
    </div>
  );
}
