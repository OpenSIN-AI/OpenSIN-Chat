// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import { useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import useCustomSiteSettings from "@/hooks/useCustomSiteSettings";

export default function CustomSiteSettings(): JSX.Element {
  const { t } = useTranslation();
  const { title: remoteTitle, faviconUrl: remoteFavicon } =
    useCustomSiteSettings();
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<{
    title: string | null;
    faviconUrl: string | null;
  }>({
    title: null,
    faviconUrl: null,
  });

  // Keep local state in sync with SWR data on first load
  const title = settings.title ?? remoteTitle;
  const faviconUrl = settings.faviconUrl ?? remoteFavicon;

  async function handleSiteSettingUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await Admin.updateSystemPreferences({
      meta_page_title: title ?? null,
      meta_page_favicon: faviconUrl ?? null,
    });
    showToast(t("customSiteSettings.updateSuccess"), "success", {
      clear: true,
    });
    setHasChanges(false);
    return;
  }

  return (
    <form
      className="flex flex-col gap-y-0.5 my-4 border-t border-white border-opacity-20 light:border-black/20 pt-6"
      onChange={() => setHasChanges(true)}
      onSubmit={handleSiteSettingUpdate}
    >
      <p className="text-sm leading-6 font-semibold text-white">
        {t("customization.items.browser-appearance.title")}
      </p>
      <p className="text-xs text-white/60">
        {t("customization.items.browser-appearance.description")}
      </p>

      <div className="w-fit">
        <p className="text-sm leading-6 font-medium text-white mt-2">
          {t("customization.items.browser-appearance.tab.title")}
        </p>
        <p className="text-xs text-white/60">
          {t("customization.items.browser-appearance.tab.description")}
        </p>
        <div className="flex items-center gap-x-4">
          <input
            name="meta_page_title"
            type="text"
            className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
            placeholder={t("customSiteSettings.titlePlaceholder")}
            autoComplete="off"
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, title: e.target.value }))
            }
            value={title ?? t("customSiteSettings.titleDefault")}
          />
        </div>
      </div>

      <div className="w-fit">
        <p className="text-sm leading-6 font-medium text-white mt-2">
          {t("customization.items.browser-appearance.favicon.title")}
        </p>
        <p className="text-xs text-white/60">
          {t("customization.items.browser-appearance.favicon.description")}
        </p>
        <div className="flex items-center gap-x-2">
          <img
            src={faviconUrl ?? "/favicon.png"}
            onError={(e) => ((e.target as HTMLImageElement).src = "/favicon.png")}
            className="h-10 w-10 rounded-lg mt-2"
            alt={t("customSiteSettings.faviconAlt")}
          />
          <input
            name="meta_page_favicon"
            type="url"
            className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
            placeholder={t("customSiteSettings.faviconPlaceholder")}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, faviconUrl: e.target.value }))
            }
            autoComplete="off"
            value={faviconUrl ?? ""}
          />
        </div>
      </div>

      {hasChanges && (
        <button
          type="submit"
          className="transition-all mt-2 w-fit duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
        >
          {t("customSiteSettings.save")}
        </button>
      )}
    </form>
  );
}