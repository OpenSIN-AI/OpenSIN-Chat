// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import { ArrowUUpLeft, Wrench } from "@phosphor-icons/react";
import { Link, useMatch } from "react-router-dom";

export default function SettingsButton() {
  const { t } = useTranslation();
  const isInSettings = !!useMatch("/settings/*");
  const { user } = useUser();

  if (user && user?.role === "default") return null;

  if (isInSettings)
    return (
      <div className="flex w-fit">
        <Link
          to={paths.home()}
          className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
          aria-label={t("sidebar.home")}
          data-tooltip-id="footer-item"
          data-tooltip-content={t("sidebar.backToWorkspaces")}
        >
          <ArrowUUpLeft
            className="h-5 w-5 text-white light:text-slate-800"
            weight="fill"
            aria-hidden="true"
          />
        </Link>
      </div>
    );

  return (
    <div className="flex w-fit">
      <Link
        to={paths.settings.interface()}
        className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
        aria-label={t("sidebar.settings")}
        data-tooltip-id="footer-item"
        data-tooltip-content={t("sidebar.openSettings")}
      >
        <Wrench
          className="h-5 w-5 text-white light:text-slate-800"
          weight="fill"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
