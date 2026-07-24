// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { useTranslation } from "react-i18next";
import { useSidebarToggle } from "@/components/Sidebar/SidebarToggle";
import AccountMenu from "@/components/Footer/AccountMenu";

export default function LeftSidebarIconBar() {
  const { showSidebar, setShowSidebar, canToggleSidebar } = useSidebarToggle();
  const { t } = useTranslation();

  if (!canToggleSidebar || showSidebar) return null;

  return (
    <aside
      aria-label={t("common.showSidebar")}
      className="z-30 hidden w-14 flex-shrink-0 flex-col items-center justify-between border-r border-theme-modal-border bg-theme-bg-sidebar py-3 md:flex"
    >
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setShowSidebar((prev) => !prev)}
          data-tooltip-id="lsib-toggle"
          data-tooltip-content={
            showSidebar ? t("common.hideSidebar") : t("common.showSidebar")
          }
          aria-label={
            showSidebar ? t("common.hideSidebar") : t("common.showSidebar")
          }
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <SidebarSimple size={18} weight="regular" />
        </button>
        <Tooltip
          id="lsib-toggle"
          place="right"
          delayShow={300}
          className="tooltip !text-xs z-[99]"
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <AccountMenu compact />
        <Tooltip
          id="lsib-profile"
          place="right"
          delayShow={300}
          className="tooltip !text-xs z-[99]"
        />
      </div>
    </aside>
  );
}
