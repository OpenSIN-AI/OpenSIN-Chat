// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

export default function OpencodeZenOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.opencodeZen.baseUrl")}
          </label>
          <input
            type="url"
            name="OpencodeZenBasePath"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.opencodeZen.baseUrlPlaceholder")}
            defaultValue={
              settings?.OpencodeZenBasePath || "https://opencode.ai/zen/v1"
            }
            onChange={() => {}}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.opencodeZen.apiKey")}
          </label>
          <input
            type="password"
            name="OpencodeZenApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.opencodeZen.apiKeyPlaceholder")}
            defaultValue={settings?.OpencodeZenApiKey ? "*".repeat(20) : ""}
            onChange={() => {}}
            required={false}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.opencodeZen.modelId")}
          </label>
          <input
            type="text"
            name="OpencodeZenModelPref"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.opencodeZen.modelIdPlaceholder")}
            defaultValue={
              settings?.OpencodeZenModelPref || "nemotron-3-ultra-free"
            }
            onChange={() => {}}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="flex gap-[36px] flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.opencodeZen.modelContextWindow")}
          </label>
          <input
            type="number"
            name="OpencodeZenTokenLimit"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t(
              "providerSettings.opencodeZen.tokenLimitPlaceholder",
            )}
            min={1}
            onScroll={(e) => (e.target as HTMLElement).blur()}
            defaultValue={settings?.OpencodeZenTokenLimit || 1000000}
            required={true}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
