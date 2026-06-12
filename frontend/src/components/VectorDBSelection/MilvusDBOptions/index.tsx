// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

export default function MilvusDBOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.milvusDb.addressLabel")}
          </label>
          <input
            type="text"
            name="MilvusAddress"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.milvusDb.addressPlaceholder")}
            defaultValue={settings?.MilvusAddress}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.milvusDb.username")}
          </label>
          <input
            type="text"
            name="MilvusUsername"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.milvusDb.usernamePlaceholder")}
            defaultValue={settings?.MilvusUsername}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.milvusDb.password")}
          </label>
          <input
            type="password"
            name="MilvusPassword"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.milvusDb.passwordPlaceholder")}
            defaultValue={settings?.MilvusPassword ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
