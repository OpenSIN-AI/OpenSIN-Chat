// SPDX-License-Identifier: MIT
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useProviderModels from "@/hooks/useProviderModels";

export default function NovitaLLMOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("novita.apiKey")}
          </label>
          <input
            type="password"
            name="NovitaLLMApiKey"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("novita.apiKey")}
            defaultValue={settings?.NovitaLLMApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {!settings?.credentialsOnly && (
          <NovitaModelSelection settings={settings} />
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
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setShowAdvancedControls(!showAdvancedControls)}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls ? t("common.hide") : t("common.show")}{" "}
          {t("novita.advancedSettings")}
          {showAdvancedControls ? (
            <CaretUp size={14} className="ml-1" />
          ) : (
            <CaretDown size={14} className="ml-1" />
          )}
        </button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("novita.streamTimeout")}
          </label>
          <input
            type="number"
            name="NovitaLLMTimeout"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("novita.timeoutDescription")}
            defaultValue={settings?.NovitaLLMTimeout ?? 3_000}
            autoComplete="off"
            onScroll={(e) => (e.target as HTMLElement).blur()}
            min={500}
            step={1}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
            {t("novita.timeoutDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}

function NovitaModelSelection({ settings }: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels("novita");
  if (isLoading || Object.keys(customModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("novita.modelSelection")}
        </label>
        <select
          name="NovitaLLMModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg text-theme-text-primary border-theme-border text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("novita.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-3">
        {t("novita.modelSelection")}
      </label>
      <select
        name="NovitaLLMModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg text-theme-text-primary border-theme-border text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(customModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {customModels[organization].map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.NovitaLLMModelPref === model.id}
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
