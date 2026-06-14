// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

export default function HuggingFaceOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.huggingFace.endpointLabel")}
          </label>
          <input
            type="url"
            name="HuggingFaceLLMEndpoint"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.huggingFace.endpointPlaceholder")}
            defaultValue={settings?.HuggingFaceLLMEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.huggingFace.accessTokenLabel")}
          </label>
          <input
            type="password"
            name="HuggingFaceLLMAccessToken"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t(
              "providerSettings.huggingFace.accessTokenPlaceholder",
            )}
            defaultValue={
              settings?.HuggingFaceLLMAccessToken ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.huggingFace.tokenLimitLabel")}
          </label>
          <input
            type="number"
            name="HuggingFaceLLMTokenLimit"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t(
              "providerSettings.huggingFace.tokenLimitPlaceholder",
            )}
            min={1}
            onScroll={(e) => (e.target as HTMLElement).blur()}
            defaultValue={settings?.HuggingFaceLLMTokenLimit}
            required={true}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
