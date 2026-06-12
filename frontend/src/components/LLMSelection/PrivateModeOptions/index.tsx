// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { Info } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import System from "@/models/system";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PrivateModeOptions({ settings }: any) {
  const { t } = useTranslation();
  const [models, setModels] = useState([] as any);
  const [loading, setLoading] = useState(!!settings?.PrivateModeBasePath);
  const [basePath, setBasePath] = useState(settings?.PrivateModeBasePath);
  const [model, setModel] = useState(settings?.PrivateModeModelPref || "");

  useEffect(() => {
    setModel(settings?.PrivateModeModelPref || "");
  }, [settings?.PrivateModeModelPref]);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        if (!basePath) throw new Error("Base path is required");
        const { models, error } = await System.customModels(
          "privatemode",
          null,
          basePath,
        );
        if (error) throw new Error(error);
        setModels(models);
      } catch (error) {
        console.error("Error fetching Private Mode models:", error);
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
          <div className="flex items-center gap-1 mb-2">
            <label className="text-white text-sm font-semibold">
              {t("providerSettings.privateMode.proxyUrl")}
            </label>
            <Info
              size={18}
              className="text-theme-text-secondary cursor-pointer"
              data-tooltip-id="private-mode-base-url"
            />
            <Tooltip
              id="private-mode-base-url"
              place="top"
              delayShow={300}
              clickable={true}
              className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
            >
              {t("providerSettings.privateMode.tooltipEnterUrl")}
              <br />
              <br />
              <Link
                to="https://docs.privatemode.ai/quickstart#2-run-the-proxy"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                {t("providerSettings.privateMode.learnMore")}
              </Link>
            </Tooltip>
          </div>
          <input
            type="url"
            name="PrivateModeBasePath"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.privateMode.baseUrlPlaceholder")}
            defaultValue={settings?.PrivateModeBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setBasePath((e.target as unknown as any)?.value)}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            {t("providerSettings.privateMode.chatModel")}
          </label>
          {loading ? (
            <select
              name="PrivateModeModelPref"
              required={true}
              disabled={true}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            >
              <option>{t("providerSettings.privateMode.loading")}</option>
            </select>
          ) : (
            <select
              name="PrivateModeModelPref"
              value={model}
              onChange={(e) => setModel((e.target as unknown as any)?.value)}
              required={true}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            >
              {models.length > 0 ? (
                <>
                  <option value="">{t("providerSettings.privateMode.selectModel")}</option>
                  {(models as any).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </>
              ) : (
                <option disabled value="">
                  {t("providerSettings.privateMode.noModelsFound")}
                </option>
              )}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
