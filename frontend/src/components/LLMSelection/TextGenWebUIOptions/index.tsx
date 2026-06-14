// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

export default function TextGenWebUIOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-[36px] mt-1.5 flex-wrap">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.textGenWebui.baseUrl")}
        </label>
        <input
          type="url"
          name="TextGenWebUIBasePath"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.textGenWebui.baseUrlPlaceholder")}
          defaultValue={settings?.TextGenWebUIBasePath}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.textGenWebui.modelContextWindow")}
        </label>
        <input
          type="number"
          name="TextGenWebUITokenLimit"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t(
            "providerSettings.textGenWebui.contextWindowPlaceholder",
          )}
          min={1}
          onScroll={(e) => (e.target as HTMLElement).blur()}
          defaultValue={settings?.TextGenWebUITokenLimit}
          required={true}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.textGenWebui.apiKeyOptional")}
        </label>
        <input
          type="password"
          name="TextGenWebUIAPIKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.textGenWebui.apiKeyPlaceholder")}
          defaultValue={settings?.TextGenWebUIAPIKey ? "*".repeat(20) : ""}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
