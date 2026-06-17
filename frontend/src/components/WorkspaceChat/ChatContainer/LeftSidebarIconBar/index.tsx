// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import { SidebarSimple } from "@phosphor-icons/react";
import { useSidebarToggle } from "@/components/Sidebar/SidebarToggle";
import UserButton from "@/components/UserMenu/UserButton";

export default function LeftSidebarIconBar() {
  const { showSidebar, setShowSidebar, canToggleSidebar } = useSidebarToggle();

  if (!canToggleSidebar) return null;

  return (
    <div className="flex flex-col items-center justify-between py-2 px-1 bg-zinc-900 light:bg-white h-full flex-shrink-0 w-[44px] my-2 ml-2 rounded-2xl overflow-hidden">
      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowSidebar((prev) => !prev)}
            data-tooltip-id="lsib-toggle"
            data-tooltip-content={showSidebar ? "Sidebar ausblenden" : "Sidebar einblenden"}
            aria-label={showSidebar ? "Sidebar ausblenden" : "Sidebar einblenden"}
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
      </div>

      <div className="flex flex-col items-center relative">
        <UserButton />
      </div>
    </div>
  );
}
