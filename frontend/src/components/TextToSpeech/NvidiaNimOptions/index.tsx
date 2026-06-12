// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";

export default function NvidiaNimTTSOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            {t("nvidiaNim.apiKeyLabel")}
          </label>
          <input
            type="password"
            name="TTSNvidiaNimApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("nvidiaNim.apiKeyPlaceholder")}
            defaultValue={settings?.TTSNvidiaNimApiKey ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
            required={true}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            {t("nvidiaNim.apiKeyHelp1")}{" "}
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {t("nvidiaNim.apiKeyHelpLink")}
            </a>
            {t("nvidiaNim.apiKeyHelp2")}
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            {t("nvidiaNim.baseUrlLabel")}{" "}
            <span className="text-white text-opacity-40 font-normal">
              {t("nvidiaNim.optional")}
            </span>
          </label>
          <input
            type="url"
            name="TTSNvidiaNimEndpoint"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("nvidiaNim.baseUrlPlaceholder")}
            defaultValue={settings?.TTSNvidiaNimEndpoint}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            {t("nvidiaNim.baseUrlHelp")}
          </p>
        </div>
      </div>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("nvidiaNim.modelLabel")}{" "}
            <span className="text-white text-opacity-40 font-normal">
              {t("nvidiaNim.optional")}
            </span>
          </label>
          <input
            type="text"
            name="TTSNvidiaNimModel"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("nvidiaNim.modelPlaceholder")}
            defaultValue={settings?.TTSNvidiaNimModel}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            {t("nvidiaNim.modelHelp1")}{" "}
            {/* eslint-disable i18next/no-literal-string */}
            <code className="bg-theme-settings-input-bg rounded px-1">
              ai-magnify/arctic-tts
            </code>
            {/* eslint-enable i18next/no-literal-string */}
            {t("nvidiaNim.modelHelp2")}
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("nvidiaNim.voiceLabel")}{" "}
            <span className="text-white text-opacity-40 font-normal">
              {t("nvidiaNim.optional")}
            </span>
          </label>
          <input
            type="text"
            name="TTSNvidiaNimVoiceModel"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("nvidiaNim.voicePlaceholder")}
            defaultValue={settings?.TTSNvidiaNimVoiceModel}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            {t("nvidiaNim.voiceHelp1")}{" "}
            {/* eslint-disable i18next/no-literal-string */}
            <code className="bg-theme-settings-input-bg rounded px-1">
              English-US.Female-1
            </code>
            {/* eslint-enable i18next/no-literal-string */}
            {t("nvidiaNim.voiceHelp2")}
          </p>
        </div>
      </div>
    </div>
  );
}
