// SPDX-License-Identifier: MIT
// Purpose: Placeholder panel for Workspace Settings (Phase 4).
//          Shows "Coming Soon" until full implementation.
import { useTranslation } from "react-i18next";
import { Gear } from "@phosphor-icons/react/dist/csr/Gear";

export default function WorkspaceSettingsSidebar({
  workspace,
}: {
  workspace: any;
}) {
  const { t } = useTranslation();
  return (
    <div className="h-full w-[340px] flex flex-col p-3 overflow-y-auto">
      <h3 className="text-sm font-bold text-theme-text-primary mb-2 flex items-center gap-2">
        <Gear size={16} />
        {t("right_sidebar.workspace_settings_title", "Workspace-Einstellungen")}
      </h3>
      <p className="text-xs text-theme-text-secondary mt-4 text-center">
        {t("right_sidebar.coming_soon", "Coming Soon")}
      </p>
    </div>
  );
}
