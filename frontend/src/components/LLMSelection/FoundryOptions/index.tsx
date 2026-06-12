// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import System from "@/models/system";
import { useTranslation } from "react-i18next";

export default function FoundryOptions({ settings }: any) {
  const { t } = useTranslation();
  const [models, setModels] = useState([] as any);
  const [loading, setLoading] = useState(!!settings?.FoundryBasePath);
  const [basePath, setBasePath] = useState(settings?.FoundryBasePath);
  const [model, setModel] = useState(settings?.FoundryModelPref || "");

  useEffect(() => {
    setModel(settings?.FoundryModelPref || "");
  }, [settings?.FoundryModelPref]);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        if (!basePath) throw new Error("Base path is required");
        const { models, error } = await System.customModels(
          "foundry",
          null,
          basePath,
        );
        if (error) throw new Error(error);
        setModels(models);
      } catch (error) {
        console.error("Error fetching Foundry models:", error);
        setModels([]);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [basePath]);

  return (
    <div className="flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.foundry.baseUrl")}
          </label>
          <input
            type="url"
            name="FoundryBasePath"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.foundry.baseUrlPlaceholder")}
            defaultValue={settings?.FoundryBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setBasePath((e.target as unknown as any)?.value)}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.foundry.chatModel")}
          </label>
          {loading ? (
            <select
              name="FoundryModelPref"
              required={true}
              disabled={true}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            >
              <option>{t("providerSettings.foundry.loading")}</option>
            </select>
          ) : (
            <select
              name="FoundryModelPref"
              value={model}
              onChange={(e) => setModel((e.target as unknown as any)?.value)}
              required={true}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            >
              {models.length > 0 ? (
                <>
                  <option value="">{t("providerSettings.foundry.selectModel")}</option>
                  {(models as any).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
                </>
              ) : (
                <option disabled value="">
                  {t("providerSettings.foundry.noModelsFound")}
                </option>
              )}
            </select>
          )}
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.foundry.modelContextWindow")}
          </label>
          <input
            type="number"
            name="FoundryModelTokenLimit"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.foundry.tokenLimitPlaceholder")}
            defaultValue={settings?.FoundryModelTokenLimit}
            autoComplete="off"
            min={0}
          />
        </div>
      </div>
    </div>
  );
}
