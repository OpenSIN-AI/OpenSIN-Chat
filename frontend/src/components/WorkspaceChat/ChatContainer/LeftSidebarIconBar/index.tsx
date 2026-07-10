// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { useTranslation } from "react-i18next";
import { useSidebarToggle } from "@/components/Sidebar/SidebarToggle";
import AccountMenu from "@/components/Footer/AccountMenu";

export default function LeftSidebarIconBar() {
  const { showSidebar, setShowSidebar, canToggleSidebar } = useSidebarToggle();
  const { t } = useTranslation();

  if (!canToggleSidebar) return null;

  return (
    <div className="hidden md:flex flex-col items-center justify-between py-2 px-1 bg-[#111111] light:bg-white border border-white/[0.05] light:border-zinc-200 flex-shrink-0 w-[44px] mx-2 my-2 rounded-xl z-30 self-stretch">
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
          className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all ${
            showSidebar
              ? "bg-white/[0.08] light:bg-zinc-100 text-[#e4e4e7] light:text-zinc-900"
              : "text-[#52525b] light:text-zinc-400 hover:bg-white/[0.05] light:hover:bg-zinc-50 hover:text-[#a1a1aa] light:hover:text-zinc-700"
          }`}
        >
          <SidebarSimple size={16} weight={showSidebar ? "fill" : "regular"} />
        </button>
        <Tooltip
          id="lsib-toggle"
          place="right"
          delayShow={300}
          className="tooltip !text-xs z-99"
        />
      </div>

      {!showSidebar && (
        <div className="flex flex-col items-center gap-1">
          <AccountMenu compact />
          <Tooltip
            id="lsib-profile"
            place="right"
            delayShow={300}
            className="tooltip !text-xs z-99"
          />
        </div>
      )}
    </div>
  );
}
