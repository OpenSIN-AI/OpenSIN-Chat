// SPDX-License-Identifier: MIT
import { useThemeContext } from "@/ThemeContext";
import { useTranslation } from "react-i18next";

export default function ThemePreference() {
  const { t } = useTranslation();
  const { theme, setTheme, availableThemes } = useThemeContext();

  return (
    <div className="flex flex-col gap-y-0.5 my-4">
      <p className="text-sm leading-6 font-semibold text-theme-text-primary">
        {t("customization.items.theme.title")}
      </p>
      <p className="text-xs text-theme-text-secondary">
        {t("customization.items.theme.description")}
      </p>
      <div className="flex items-center gap-x-4">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="border-none bg-theme-settings-input-bg mt-2 text-theme-settings-input-text placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
        >
          {Object.entries(availableThemes).map(([key, value]) => (
            <option key={key} value={key}>
              {String(value)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
