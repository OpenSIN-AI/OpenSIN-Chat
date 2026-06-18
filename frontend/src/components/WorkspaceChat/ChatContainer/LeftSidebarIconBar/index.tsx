// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import { SidebarSimple } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useSidebarToggle } from "@/components/Sidebar/SidebarToggle";
import AccountMenu from "@/components/Footer/AccountMenu";

export default function LeftSidebarIconBar() {
  const { showSidebar, setShowSidebar, canToggleSidebar } = useSidebarToggle();
  const { t } = useTranslation();

  if (!canToggleSidebar) return null;

  return (
    <div className="fixed left-0 top-2 h-[calc(100vh-16px)] flex flex-col items-center justify-between py-2 px-1 bg-zinc-900 light:bg-white flex-shrink-0 w-[44px] ml-2 rounded-2xl z-30">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setShowSidebar((prev) => !prev)}
          data-tooltip-id="lsib-toggle"
          data-tooltip-content={showSidebar ? t("common.hideSidebar") : t("common.showSidebar")}
          aria-label={showSidebar ? t("common.hideSidebar") : t("common.showSidebar")}
          className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all ${
            showSidebar
              ? "bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
              : "text-zinc-400 light:text-slate-500 hover:bg-zinc-800 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
          }`}
        >
          <SidebarSimple size={18} weight={showSidebar ? "fill" : "regular"} />
        </button>
        <Tooltip
          id="lsib-toggle"
          place="right"
          delayShow={300}
          className="tooltip !text-xs z-99"
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <AccountMenu compact />
        <Tooltip
          id="lsib-profile"
          place="right"
          delayShow={300}
          className="tooltip !text-xs z-99"
        />
      </div>
    </div>
  );
}
