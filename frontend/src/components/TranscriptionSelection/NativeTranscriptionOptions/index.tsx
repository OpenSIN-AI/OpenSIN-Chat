// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gauge } from "@phosphor-icons/react/dist/csr/Gauge";

export default function NativeTranscriptionOptions({ settings }: any) {
  const { t } = useTranslation();
  const [model, setModel] = useState(settings?.WhisperModelPref);

  return (
    <div className="w-full flex flex-col gap-y-4">
      <LocalWarning model={model} />
      <div className="w-full flex items-center gap-4">
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("transcriptionSelection.model")}
          </label>
          <select
            name="WhisperModelPref"
            defaultValue={model}
            onChange={(e) => setModel((e.target as unknown as any)?.value)}
            className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
          >
            {/* Model identifiers are technical tokens, not user-facing copy. */}
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {["Xenova/whisper-small", "Xenova/whisper-large"].map(
              (value, i) => {
                return (
                  <option key={value} value={value}>
                    {value}
                  </option>
                );
              },
            )}
          </select>
        </div>
      </div>
    </div>
  );
}

function LocalWarning({ model }: any) {
  switch (model) {
    case "Xenova/whisper-small":
      return <WhisperSmall />;
    case "Xenova/whisper-large":
      return <WhisperLarge />;
    default:
      return <WhisperSmall />;
  }
}

function WhisperSmall() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-white mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
      <div className="gap-x-2 flex items-center">
        <Gauge size={25} />
        <p className="text-sm">
          {t("transcription.warn-start")}
          <br />
          {t("transcription.warn-recommend")}
          <br />
          <br />
          <i>
            {t("transcription.warn-end")} {t("transcription.sizeMb")}
          </i>
        </p>
      </div>
    </div>
  );
}

function WhisperLarge() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-white mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
      <div className="gap-x-2 flex items-center">
        <Gauge size={25} />
        <p className="text-sm">
          {t("transcription.warn-start")}
          <br />
          {t("transcription.warn-recommend")}
          <br />
          <br />
          <i>
            {t("transcription.warn-end")} {t("transcription.sizeGb")}
          </i>
        </p>
      </div>
    </div>
  );
}
