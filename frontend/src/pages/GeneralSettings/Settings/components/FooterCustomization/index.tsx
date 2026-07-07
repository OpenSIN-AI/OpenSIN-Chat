// SPDX-License-Identifier: MIT
import React, { useState, useEffect } from "react";
import showToast from "@/utils/toast";
import NewIconForm from "./NewIconForm";
import Admin from "@/models/admin";
import System from "@/models/system";
import { useTranslation } from "react-i18next";
import useFooterSettings from "@/hooks/useFooterSettings";

export default function FooterCustomization() {
  const { footerIcons: initialIcons, isLoading } = useFooterSettings();
  const [footerIcons, setFooterIcons] = useState(() => Array(3).fill(null));
  const { t } = useTranslation();

  // Sync SWR data into local state once loaded.
  // Using useEffect avoids the setState-during-render anti-pattern that
  // forces React to discard the in-progress render and immediately re-render.
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (isLoading || synced) return;
    const updatedIcons = Array(3).fill(null);
    if (Array.isArray(initialIcons)) {
      initialIcons.forEach((icon, index) => {
        if (index < 3) updatedIcons[index] = icon;
      });
    }
    setFooterIcons(updatedIcons);
    setSynced(true);
  }, [isLoading, synced, initialIcons]);

  const updateFooterIcons = async (updatedIcons: any[]) => {
    const { success, error } = await Admin.updateSystemPreferences({
      footer_data: JSON.stringify(updatedIcons.filter((icon) => icon !== null)),
    });

    if (!success) {
      showToast(t("footerCustomization.updateFailed", { error }), "error", {
        clear: true,
      });
      return;
    }

    window.localStorage.removeItem(System.cacheKeys.footerIcons);
    setFooterIcons(updatedIcons);
    showToast(t("footerCustomization.updateSuccess"), "success", {
      clear: true,
    });
  };

  const handleRemoveIcon = (index: number) => {
    const updatedIcons = [...footerIcons];
    updatedIcons[index] = null;
    updateFooterIcons(updatedIcons);
  };

  return (
    <div className="flex flex-col gap-y-0.5 my-4">
      <p className="text-sm leading-6 font-semibold text-white">
        {t("customization.items.sidebar-footer.title")}
      </p>
      <p className="text-xs text-theme-text-secondary">
        {t("customization.items.sidebar-footer.description")}
      </p>
      <div className="mt-2 flex gap-x-3 font-medium text-white text-sm">
        <div>{t("customization.items.sidebar-footer.icon")}</div>
        <div>{t("customization.items.sidebar-footer.link")}</div>
      </div>
      <div className="mt-2 flex flex-col gap-y-[10px]">
        {footerIcons.map((icon, index) => (
          <NewIconForm
            key={index}
            icon={icon?.icon}
            url={icon?.url}
            onSave={(newIcon, newUrl) => {
              const updatedIcons = [...footerIcons];
              updatedIcons[index] = { icon: newIcon, url: newUrl };
              updateFooterIcons(updatedIcons);
            }}
            onRemove={() => handleRemoveIcon(index)}
          />
        ))}
      </div>
    </div>
  );
}
