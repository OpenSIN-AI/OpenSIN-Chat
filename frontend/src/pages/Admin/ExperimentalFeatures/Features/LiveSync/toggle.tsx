// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import System from "@/models/system";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Toggle from "@/components/lib/Toggle";

export default function LiveSyncToggle({ enabled = false, onToggle }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(enabled);

  async function toggleFeatureFlag() {
    const updated =
      await System.experimentalFeatures.liveSync.toggleFeature(!status);
    if (!updated) {
      showToast(t("experimentalFeatures.toggleFailed"), "error", {
        clear: true,
      });
      return false;
    }

    setStatus(!status);
    showToast(
      !status
        ? t("experimentalFeatures.toggleEnabled")
        : t("experimentalFeatures.toggleDisabled"),
      "success",
      { clear: true },
    );
    onToggle();
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-y-6 max-w-[500px]">
        <div className="flex items-center justify-between">
          <h2 className="text-theme-text-primary text-md font-bold">
            {t("experimentalFeatures.autoSyncTitle")}
          </h2>
          <Toggle size="lg" enabled={status} onChange={toggleFeatureFlag} />
        </div>
        <div className="flex flex-col space-y-4">
          <p className="text-theme-text-secondary text-sm">
            {t("experimentalFeatures.autoSyncDesc1")}
          </p>
          <p className="text-theme-text-secondary text-sm">
            {t("experimentalFeatures.autoSyncDesc2")}
          </p>
          <p className="text-theme-text-secondary text-xs italic">
            {t("experimentalFeatures.autoSyncDesc3")}
          </p>
        </div>
      </div>
      <div className="mt-8">
        <ul className="space-y-2">
          <li>
            <a
              href={paths.appDocs()}
              target="_blank"
              className="text-sm text-blue-400 light:text-blue-500 hover:underline flex items-center gap-x-1"
              rel="noreferrer"
            >
              <ArrowSquareOut size={14} />
              <span>{t("experimentalFeatures.featureDocs")}</span>
            </a>
          </li>
          <li>
            <Link
              to={paths.experimental.liveDocumentSync.manage()}
              className="text-sm text-blue-400 light:text-blue-500 hover:underline"
            >
              {t("experimentalFeatures.manageWatched")}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
