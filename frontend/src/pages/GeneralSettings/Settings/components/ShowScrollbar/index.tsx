// SPDX-License-Identifier: MIT
import React, { useState, useEffect } from "react";
import Appearance from "@/models/appearance";
import { useTranslation } from "react-i18next";
import Toggle from "@/components/lib/Toggle";
import logger from "@/utils/logger";

export default function ShowScrollbar() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);

  const handleChange = async (checked: boolean) => {
    setShowScrollbar(checked);
    setSaving(true);
    try {
      Appearance.updateSettings({ showScrollbar: checked });
    } catch (error) {
      logger.error("Failed to update appearance settings:", error);
      setShowScrollbar(!checked);
    }
    setSaving(false);
  };

  useEffect(() => {
    function fetchSettings() {
      const settings = Appearance.getSettings();
      setShowScrollbar(settings.showScrollbar);
    }
    fetchSettings();
  }, []);

  return (
    <div className="my-4">
      <Toggle
        size="md"
        variant="horizontal"
        enabled={showScrollbar}
        onChange={handleChange}
        disabled={saving}
        label={t("customization.items.show-scrollbar.title")}
        description={t("customization.items.show-scrollbar.description")}
      />
    </div>
  );
}
