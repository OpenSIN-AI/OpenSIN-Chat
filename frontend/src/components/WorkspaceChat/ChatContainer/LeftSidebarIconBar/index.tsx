// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import { SidebarSimple, Person } from "@phosphor-icons/react";
import { useSidebarToggle } from "@/components/Sidebar/SidebarToggle";
import useLoginMode from "@/hooks/useLoginMode";
import usePfp from "@/hooks/usePfp";
import { userFromStorage } from "@/utils/request";
import { useState, useRef, useEffect } from "react";
import AccountModal from "@/components/UserMenu/AccountModal";
import useSupportEmail from "@/hooks/useSupportEmail";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  LAST_VISITED_WORKSPACE,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";

export default function LeftSidebarIconBar() {
  const { showSidebar, setShowSidebar, canToggleSidebar } = useSidebarToggle();

  if (!canToggleSidebar) return null;

  return (
    <div className="fixed left-0 top-0 h-screen flex flex-col items-center justify-between py-3 px-1 bg-zinc-900 light:bg-white flex-shrink-0 w-[44px] z-30">
      <div className="flex flex-col items-center gap-1">
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

      <ProfileButton />
    </div>
  );
}

function ProfileButton() {
  const { t } = useTranslation();
  const mode = useLoginMode();
  const { pfp } = usePfp();
  const { email } = useSupportEmail();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const user = userFromStorage();

  const supportEmail = email ? `mailto:${email}` : paths.mailToSupport();

  useEffect(() => {
    if (showMenu) {
      const handleClose = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          setShowMenu(false);
        }
      };
      document.addEventListener("mousedown", handleClose);
      return () => document.removeEventListener("mousedown", handleClose);
    }
  }, [showMenu]);

  if (mode === null) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        type="button"
        className="uppercase transition-all duration-300 w-[32px] h-[32px] text-sm font-semibold rounded-full flex items-center justify-center bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover text-white p-1.5"
      >
        {mode === "multi" && pfp ? (
          <img src={pfp} alt="" className="w-full h-full object-cover rounded-full" />
        ) : mode === "multi" && user?.username ? (
          user.username.slice(0, 2).toUpperCase()
        ) : (
          <Person size={14} />
        )}
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-12 left-0 w-48 rounded-lg bg-theme-action-menu-bg p-2 flex flex-col gap-y-1 shadow-lg"
        >
          {mode === "multi" && !!user && (
            <button
              onClick={() => { setShowAccountSettings(true); setShowMenu(false); }}
              className="border-none text-white hover:bg-theme-action-menu-item-hover w-full text-left px-3 py-1.5 rounded-md text-sm"
            >
              {t("profile_settings.account")}
            </button>
          )}
          <a
            href={supportEmail}
            className="text-white hover:bg-theme-action-menu-item-hover w-full text-left px-3 py-1.5 rounded-md text-sm"
          >
            {t("profile_settings.support")}
          </a>
          <button
            onClick={() => {
              window.localStorage.removeItem(AUTH_USER);
              window.localStorage.removeItem(AUTH_TOKEN);
              window.localStorage.removeItem(AUTH_TIMESTAMP);
              window.localStorage.removeItem(LAST_VISITED_WORKSPACE);
              window.localStorage.removeItem(USER_PROMPT_INPUT_MAP);
              window.location.replace(paths.home());
            }}
            type="button"
            className="text-white hover:bg-theme-action-menu-item-hover w-full text-left px-3 py-1.5 rounded-md text-sm"
          >
            {t("profile_settings.signout")}
          </button>
        </div>
      )}

      {user && showAccountSettings && (
        <AccountModal user={user} hideModal={() => setShowAccountSettings(false)} />
      )}
    </div>
  );
}
