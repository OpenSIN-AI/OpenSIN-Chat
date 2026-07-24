// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
function recommendedSettings(provider: string | null = null) {
  switch (provider) {
    case "mistral":
      return { temp: 0 };
    default:
      return { temp: 0.7 };
  }
}

export default function ChatTemperatureSettings({
  settings,
  workspace,
  setHasChanges,
}: {
  settings?: { LLMProvider?: string };
  workspace?: { openAiTemp?: number };
  setHasChanges: (v: boolean) => void;
}) {
  const defaults = recommendedSettings(settings?.LLMProvider);
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-col">
        <label htmlFor="name" className="block input-label">
          {t("chat.temperature.title")}
        </label>
        <p className="text-theme-text-secondary text-xs font-medium py-1.5">
          {t("chat.temperature.desc-start")}
          <br />
          {t("chat.temperature.desc-end")}
          <br />
          <br />
          <i>{t("chat.temperature.hint")}</i>
        </p>
      </div>
      <input
        name="openAiTemp"
        type="number"
        min={0.0}
        max={1.0}
        step={0.1}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        defaultValue={workspace?.openAiTemp ?? defaults.temp}
        className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
        placeholder={String(defaults.temp)}
        required={true}
        autoComplete="off"
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          if (val > 1.0) e.target.value = "1.0";
          else if (val < 0.0) e.target.value = "0.0";
          setHasChanges(true);
        }}
      />
    </div>
  );
}
