// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Curated German voices from cvoice.ai. These IDs are stable and verified by
 * the cvoice.ai team. Users can also enter any custom voice_id from the
 * dataset (https://cvoice.ai/dataset_voices.json) via the "Custom voice id"
 * field below.
 */
export const GERMAN_VOICES = [
  {
    id: "625332f3-27a9-4ecf-9a90-25265d901e72",
    name: "Gronkh",
  },
  {
    id: "158f678a-f9b5-4451-b553-db840da665be",
    name: "Dieter Bohlen",
  },
  {
    id: "57898756-03e1-4f65-8ccc-41a48a18f35d",
    name: "Joko Winterscheidt",
  },
  {
    id: "35cfc98d-c746-4d0e-9cc2-d3cd1852f56b",
    name: "Julien Bam",
  },
  {
    id: "539d4adb-81ac-4b8d-bf01-365ff69dc5b7",
    name: "Daniela Katzenberger",
  },
  {
    id: "bushido-official",
    name: "Bushido",
  },
] as const;

export default function CvoiceOptions({ settings }: any) {
  const { t } = useTranslation();
  const [voice, setVoice] = useState(
    settings?.TTSCvoiceVoiceModel || GERMAN_VOICES[0].id,
  );
  const [customVoice, setCustomVoice] = useState(
    settings?.TTSCvoiceCustomVoiceModel || "",
  );
  const [personName, setPersonName] = useState(
    settings?.TTSCvoicePersonName || "",
  );
  const [personSlug, setPersonSlug] = useState(
    settings?.TTSCvoicePersonSlug || "",
  );

  useEffect(() => {
    setVoice(settings?.TTSCvoiceVoiceModel || GERMAN_VOICES[0].id);
    setCustomVoice(settings?.TTSCvoiceCustomVoiceModel || "");
    setPersonName(settings?.TTSCvoicePersonName || "");
    setPersonSlug(settings?.TTSCvoicePersonSlug || "");
  }, [
    settings?.TTSCvoiceVoiceModel,
    settings?.TTSCvoiceCustomVoiceModel,
    settings?.TTSCvoicePersonName,
    settings?.TTSCvoicePersonSlug,
  ]);

  const isCustom = !GERMAN_VOICES.some((v) => v.id === voice);

  return (
    <div className="w-full flex flex-col gap-y-4">
      <p className="text-sm font-base text-white text-opacity-60">
        {t("textToSpeech.cvoice.description")}{" "}
        <a
          href="https://cvoice.ai/api-docs"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {t("textToSpeech.cvoice.docsLink")}
        </a>
      </p>

      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            {t("textToSpeech.cvoice.voiceModel.label")}
          </label>
          <select
            name="TTSCvoiceVoiceModel"
            required={true}
            value={isCustom ? "__custom__" : voice}
            onChange={(e) => {
              const v = (e.target as unknown as any)?.value;
              if (v === "__custom__") {
                setVoice(customVoice || "");
              } else {
                setVoice(v);
                setCustomVoice("");
              }
            }}
            className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
          >
            <optgroup label={t("textToSpeech.cvoice.voiceModel.germanGroup")}>
              {GERMAN_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </optgroup>
            <option value="__custom__">
              {t("textToSpeech.cvoice.voiceModel.customOption")}
            </option>
          </select>
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            {t("textToSpeech.cvoice.voiceModel.help")}
          </p>
        </div>
      </div>

      {isCustom && (
        <div className="flex gap-x-4">
          <div className="flex flex-col w-60">
            <label className="text-white text-sm font-semibold block mb-2">
              {t("textToSpeech.cvoice.customVoiceId.label")}
            </label>
            <input
              type="text"
              name="TTSCvoiceCustomVoiceModel"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("textToSpeech.cvoice.customVoiceId.placeholder")}
              defaultValue={customVoice}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setCustomVoice((e.target as unknown as any)?.value);
                setVoice((e.target as unknown as any)?.value);
              }}
            />
            <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
              {t("textToSpeech.cvoice.customVoiceId.help")}
            </p>
          </div>
        </div>
      )}

      <details className="text-xs text-white text-opacity-60">
        <summary className="cursor-pointer hover:text-white">
          {t("textToSpeech.cvoice.advanced.toggle")}
        </summary>
        <div className="flex gap-x-4 mt-3">
          <div className="flex flex-col w-60">
            <label className="text-white text-sm font-semibold block mb-2">
              {t("textToSpeech.cvoice.advanced.personName.label")}
            </label>
            <input
              type="text"
              name="TTSCvoicePersonName"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("textToSpeech.cvoice.advanced.personName.placeholder")}
              defaultValue={personName}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setPersonName((e.target as unknown as any)?.value)}
            />
          </div>
          <div className="flex flex-col w-60">
            <label className="text-white text-sm font-semibold block mb-2">
              {t("textToSpeech.cvoice.advanced.personSlug.label")}
            </label>
            <input
              type="text"
              name="TTSCvoicePersonSlug"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("textToSpeech.cvoice.advanced.personSlug.placeholder")}
              defaultValue={personSlug}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setPersonSlug((e.target as unknown as any)?.value)}
            />
          </div>
        </div>
        <p className="mt-2">
          {t("textToSpeech.cvoice.advanced.help")}
        </p>
      </details>

      <p className="text-xs leading-[18px] font-base text-white text-opacity-60">
        {t("textToSpeech.cvoice.rateLimitNotice")}
      </p>
    </div>
  );
}
