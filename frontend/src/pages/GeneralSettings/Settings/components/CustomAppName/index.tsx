// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import Admin from "@/models/admin";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useCustomAppName from "@/hooks/useCustomAppName";
import useSystemSettings from "@/hooks/useSystemSettings";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";

export default function CustomAppName(): JSX.Element {
  const { t } = useTranslation();
  const { appName: fetchedAppName, isLoading: appNameLoading } =
    useCustomAppName();
  const { settings, loading: settingsLoading } = useSystemSettings();
  const [hasChanges, setHasChanges] = useState(false);
  const blocker = useUnsavedChanges(hasChanges);
  const [customAppName, setCustomAppName] = useState("");
  const [originalAppName, setOriginalAppName] = useState("");
  const [canCustomize, setCanCustomize] = useState(false);

  // Sync SWR data into local state once loaded.
  // Using useEffect avoids the setState-during-render anti-pattern that
  // forces React to discard the in-progress render and immediately re-render.
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (settingsLoading || appNameLoading || synced) return;
    if (!settings?.MultiUserMode && !settings?.RequiresAuth) {
      setCanCustomize(false);
      setSynced(true);
    } else {
      setCustomAppName(fetchedAppName);
      setOriginalAppName(fetchedAppName);
      setCanCustomize(true);
      setSynced(true);
    }
  }, [settingsLoading, appNameLoading, synced, settings, fetchedAppName]);

  const updateCustomAppName = async (
    e: React.FormEvent<HTMLFormElement>,
    newValue: string | null = null,
  ) => {
    e.preventDefault();
    let custom_app_name = newValue;
    if (newValue === null) {
      const form = new FormData(e.currentTarget);
      custom_app_name = form.get("customAppName") as string;
    }
    const { success, error } = await Admin.updateSystemPreferences({
      custom_app_name,
    });
    if (!success) {
      showToast(t("settings.customAppName.updateFailed", { error }), "error");
      return;
    } else {
      showToast(t("settings.customAppName.updateSuccess"), "success");
      window.localStorage.removeItem(System.cacheKeys.customAppName);
      setCustomAppName(custom_app_name as string);
      setOriginalAppName(custom_app_name as string);
      setHasChanges(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAppName(e.target.value);
    setHasChanges(true);
  };

  if (!canCustomize || settingsLoading || appNameLoading) return null;

  return (
    <form
      className="flex flex-col gap-y-0.5 mt-4"
      onSubmit={updateCustomAppName}
    >
      <p className="text-sm leading-6 font-semibold text-white">
        {t("customization.items.app-name.title")}
      </p>
      <p className="text-xs text-theme-text-secondary">
        {t("customization.items.app-name.description")}
      </p>
      <div className="flex items-center gap-x-4">
        <input
          name="customAppName"
          type="text"
          className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
          placeholder={t("settings.customAppName.placeholder")}
          required={true}
          autoComplete="off"
          onChange={handleChange}
          value={customAppName}
        />
        {originalAppName !== "" && (
          <button
            type="button"
            onClick={(e) => updateCustomAppName(e as any, "")}
            className="text-white text-base font-medium hover:text-opacity-60"
          >
            {t("settings.customAppName.clear")}
          </button>
        )}
      </div>
      {hasChanges && (
        <button
          type="submit"
          className="transition-all mt-2 w-fit duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
        >
          {t("settings.customAppName.save")}
        </button>
      )}
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  );
}
