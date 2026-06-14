// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CaretUpDown,
  ChatCircleText,
  Desktop,
  Gear,
  Moon,
  SignIn,
  SignOut,
  Sun,
  UserCircle,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import useUser from "@/hooks/useUser";
import usePfp from "@/hooks/usePfp";
import useLoginMode from "@/hooks/useLoginMode";
import { useTheme } from "@/hooks/useTheme";
import { useLanguageOptions } from "@/hooks/useLanguageOptions";
import AccountModal from "../UserMenu/AccountModal";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  LAST_VISITED_WORKSPACE,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";

const FEEDBACK_URL = `${paths.github()}/issues/new`;

const ITEM_CLASSES =
  "group flex items-center gap-x-3 w-full text-left px-2.5 py-2 rounded-lg text-sm text-white light:text-slate-700 hover:bg-theme-action-menu-item-hover transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

const ICON_CLASSES = "h-[18px] w-[18px] shrink-0 opacity-80";

function handleSignOut() {
  window.localStorage.removeItem(AUTH_USER);
  window.localStorage.removeItem(AUTH_TOKEN);
  window.localStorage.removeItem(AUTH_TIMESTAMP);
  window.localStorage.removeItem(LAST_VISITED_WORKSPACE);
  window.localStorage.removeItem(USER_PROMPT_INPUT_MAP);
  window.location.replace(paths.home());
}

function Avatar({ pfp, initials }: { pfp?: string | null; initials: string }) {
  if (pfp) {
    return (
      <img
        src={pfp}
        alt=""
        aria-hidden="true"
        className="h-8 w-8 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-theme-sidebar-footer-icon text-white light:text-slate-700 text-xs font-semibold uppercase"
    >
      {initials}
    </div>
  );
}

function ThemeSegment() {
  const { theme, setTheme } = useTheme();
  const options: {
    key: "system" | "light" | "dark";
    label: string;
    Icon: React.ComponentType<{ className?: string; weight?: string }>;
  }[] = [
    { key: "system", label: "System", Icon: Desktop },
    { key: "light", label: "Hell", Icon: Sun },
    { key: "dark", label: "Dunkel", Icon: Moon },
  ];

  return (
    <div className="flex items-center justify-between px-2.5 py-1.5">
      <span className="text-sm text-white light:text-slate-700">Design</span>
      <div className="flex items-center gap-0.5 rounded-lg bg-black/20 light:bg-black/5 p-0.5">
        {options.map(({ key, label, Icon }) => {
          const active = theme === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              aria-label={label}
              aria-pressed={active}
              title={label}
              className={`flex items-center justify-center h-6 w-7 rounded-md transition-colors duration-150 ${
                active
                  ? "bg-white text-slate-900 light:bg-white"
                  : "text-white/70 light:text-slate-500 hover:text-white light:hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" weight={active ? "fill" : "regular"} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LanguageRow() {
  const { currentLanguage, supportedLanguages, getLanguageName, changeLanguage } =
    useLanguageOptions();
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5">
      <span className="text-sm text-white light:text-slate-700">Sprache</span>
      <select
        aria-label="Sprache"
        value={currentLanguage || "en"}
        onChange={(e) => changeLanguage(e.target.value)}
        className="border-none bg-black/20 light:bg-black/5 text-white light:text-slate-700 text-xs rounded-md py-1.5 pl-2.5 pr-6 outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {getLanguageName(lang)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AccountMenu() {
  const { user } = useUser();
  const { pfp } = usePfp();
  const mode = useLoginMode();
  const [open, setOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const displayName = user?.username || "OpenAfD";
  const subtitle = user?.email || "Demo-Konto";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isLoggedIn = mode !== null;

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative w-full px-2">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-x-2.5 w-full px-2 py-2 rounded-xl hover:bg-theme-action-menu-item-hover transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <Avatar pfp={pfp} initials={initials} />
        <div className="flex flex-col items-start min-w-0 flex-grow">
          <span className="text-sm font-semibold text-white light:text-slate-800 truncate max-w-full">
            {displayName}
          </span>
          <span className="text-xs text-white/55 light:text-slate-500 truncate max-w-full">
            {subtitle}
          </span>
        </div>
        <CaretUpDown
          className="h-4 w-4 text-white/55 light:text-slate-500 shrink-0"
          aria-hidden="true"
        />
      </button>

      {/* Popup (opens upward) */}
      {open && (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 rounded-xl border border-theme-sidebar-border light:border-slate-200 bg-theme-action-menu-bg shadow-xl shadow-black/30 p-1.5 max-h-[70vh] overflow-y-auto no-scroll"
        >
          {/* Identity header */}
          <div className="flex items-center gap-x-2.5 px-2.5 py-2">
            <Avatar pfp={pfp} initials={initials} />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white light:text-slate-800 truncate">
                {displayName}
              </span>
              <span className="text-xs text-white/55 light:text-slate-500 truncate">
                {subtitle}
              </span>
            </div>
          </div>

          <div className="my-1 h-px bg-white/10 light:bg-slate-200" />

          {/* Navigation items */}
          {!!user && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setShowAccountModal(true);
                setOpen(false);
              }}
              className={ITEM_CLASSES}
            >
              <UserCircle className={ICON_CLASSES} />
              <span className="flex-grow">Profil</span>
            </button>
          )}

          <Link
            to={paths.settings.interface()}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={ITEM_CLASSES}
          >
            <Gear className={ICON_CLASSES} />
            <span className="flex-grow">Einstellungen</span>
          </Link>

          <Link
            to={paths.appDocs()}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={ITEM_CLASSES}
          >
            <BookOpen className={ICON_CLASSES} />
            <span className="flex-grow">Dokumentation</span>
          </Link>

          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={ITEM_CLASSES}
          >
            <ChatCircleText className={ICON_CLASSES} />
            <span className="flex-grow">Feedback</span>
            <ArrowUpRight
              className="h-4 w-4 text-white/45 light:text-slate-400"
              aria-hidden="true"
            />
          </a>

          <div className="my-1 h-px bg-white/10 light:bg-slate-200" />

          {/* Preferences */}
          <p className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">
            Einstellungen
          </p>
          <ThemeSegment />
          <LanguageRow />

          <div className="my-1 h-px bg-white/10 light:bg-slate-200" />

          {/* Auth */}
          {isLoggedIn ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className={ITEM_CLASSES}
            >
              <SignOut className={ICON_CLASSES} />
              <span className="flex-grow">Abmelden</span>
            </button>
          ) : (
            <Link
              to={paths.login()}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={ITEM_CLASSES}
            >
              <SignIn className={ICON_CLASSES} />
              <span className="flex-grow">Anmelden</span>
            </Link>
          )}
        </div>
      )}

      {user && showAccountModal && (
        <AccountModal
          user={user}
          hideModal={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}
