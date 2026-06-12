// SPDX-License-Identifier: MIT
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";

export default function OpenRouterOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-4 mt-1.5">
      <div className="flex gap-[36px]">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.openRouter.apiKey")}
          </label>
          <input
            type="password"
            name="OpenRouterApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.openRouter.apiKeyPlaceholder")}
            defaultValue={settings?.OpenRouterApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {!settings?.credentialsOnly && (
          <OpenRouterModelSelection settings={settings} />
        )}
      </div>
      <AdvancedControls settings={settings} />
    </div>
  );
}

function AdvancedControls({ settings }: any) {
  const { t } = useTranslation();
  const [showAdvancedControls, setShowAdvancedControls] = useState(
    false as any,
  );

  return (
    <div className="flex flex-col gap-y-4">
      <button
        type="button"
        onClick={() => setShowAdvancedControls(!showAdvancedControls)}
        className="border-none text-white hover:text-white/70 flex items-center text-sm"
      >
        {showAdvancedControls ? t("providerSettings.openRouter.hide") : t("providerSettings.openRouter.show")} {t("providerSettings.openRouter.advancedControls")}
        {showAdvancedControls ? (
          <CaretUp size={14} className="ml-1" />
        ) : (
          <CaretDown size={14} className="ml-1" />
        )}
      </button>
      <div hidden={!showAdvancedControls}>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("providerSettings.openRouter.streamTimeout")}
          </label>
          <input
            type="number"
            name="OpenRouterTimeout"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("providerSettings.openRouter.streamTimeoutPlaceholder")}
            defaultValue={settings?.OpenRouterTimeout ?? 3_000}
            autoComplete="off"
            onScroll={(e) => (e.target as HTMLElement).blur()}
            min={500}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}

function OpenRouterModelSelection({ settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels("openrouter");
  if (isLoading || Object.keys(customModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("providerSettings.openRouter.chatModelSelection")}
        </label>
        <select
          name="OpenRouterModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("providerSettings.openRouter.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        {t("providerSettings.openRouter.chatModelSelection")}
      </label>
      <select
        name="OpenRouterModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(customModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {customModels[organization].map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.OpenRouterModelPref === model.id}
                >
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
    </div>
  );
}
