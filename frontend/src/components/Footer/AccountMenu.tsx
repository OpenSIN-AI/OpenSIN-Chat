// SPDX-License-Identifier: MIT
import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowUpRight } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { CaretUpDown } from "@phosphor-icons/react/dist/csr/CaretUpDown";
import { ChatCircleText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { Desktop } from "@phosphor-icons/react/dist/csr/Desktop";
import { Gear } from "@phosphor-icons/react/dist/csr/Gear";
import { Moon } from "@phosphor-icons/react/dist/csr/Moon";
import { SignIn } from "@phosphor-icons/react/dist/csr/SignIn";
import { SignOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { Sun } from "@phosphor-icons/react/dist/csr/Sun";
import { UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";
import { Link } from "react-router";
import { createPortal } from "react-dom";
import paths from "@/utils/paths";
import useUser from "@/hooks/useUser";
import usePfp from "@/hooks/usePfp";
import useLoginMode from "@/hooks/useLoginMode";
import { useThemeContext } from "@/ThemeContext";
import { useLanguageOptions } from "@/hooks/useLanguageOptions";
import { useTranslation } from "react-i18next";
import AccountModal from "../UserMenu/AccountModal";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  LAST_VISITED_WORKSPACE,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";
import { safeRemoveItem } from "@/utils/safeStorage";

const FEEDBACK_URL = `${paths.github()}/issues/new`;

const ITEM_CLASSES =
  "group flex items-center gap-x-3 w-full text-left px-2.5 py-2 rounded-lg text-sm text-theme-text-primary light:text-zinc-800 hover:bg-theme-action-menu-item-hover light:hover:bg-zinc-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

const ICON_CLASSES = "h-[18px] w-[18px] shrink-0 opacity-80";

function handleSignOut() {
  safeRemoveItem(AUTH_USER);
  safeRemoveItem(AUTH_TOKEN);
  safeRemoveItem(AUTH_TIMESTAMP);
  safeRemoveItem(LAST_VISITED_WORKSPACE);
  safeRemoveItem(USER_PROMPT_INPUT_MAP);
  window.location.replace(paths.home());
}

function Avatar({
  pfp,
  initials,
  size = 32,
}: {
  pfp?: string | null;
  initials: string;
  size?: number;
}) {
  const cls = `rounded-full object-cover shrink-0`;
  const style = { width: size, height: size };
  if (pfp) {
    return (
      <img src={pfp} alt="" aria-hidden="true" className={cls} style={style} />
    );
  }
  const fontSize = size <= 24 ? "text-[10px]" : "text-xs";
  return (
    <div
      aria-hidden="true"
      className={`rounded-full shrink-0 flex items-center justify-center bg-white light:bg-zinc-900 text-zinc-900 light:text-white ${fontSize} font-semibold uppercase ${cls}`}
      style={style}
    >
      {initials}
    </div>
  );
}

function ThemeSegment() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeContext();
  const options: {
    key: "system" | "light" | "dark";
    label: string;
    Icon: React.ComponentType<{ className?: string; weight?: any }>;
  }[] = [
    { key: "system", label: t("common.themeSystem"), Icon: Desktop },
    { key: "light", label: t("common.themeLight"), Icon: Sun },
    { key: "dark", label: t("common.themeDark"), Icon: Moon },
  ];

  return (
    <div className="flex items-center justify-between px-2.5 py-1.5">
      <span className="text-sm text-theme-text-primary light:text-zinc-800">
        {t("common.theme")}
      </span>
      <div className="flex items-center gap-0.5 rounded-md bg-white/[0.06] light:bg-zinc-100 p-0.5">
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
              className={`flex items-center justify-center h-5.5 w-6 rounded-[5px] transition-colors duration-150 ${
                active
                  ? "bg-[#fafafa] light:bg-white text-zinc-900 light:text-zinc-900 shadow-sm"
                  : "text-[#71717a] light:text-zinc-400 hover:text-[#a1a1aa] light:hover:text-zinc-700"
              }`}
            >
              <Icon
                className="h-3.5 w-3.5"
                weight={active ? "fill" : "regular"}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LanguageRow() {
  const { t } = useTranslation();
  const {
    currentLanguage,
    supportedLanguages,
    getLanguageName,
    changeLanguage,
  } = useLanguageOptions();
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5">
      <span className="text-sm text-theme-text-primary light:text-zinc-800">
        {t("common.language")}
      </span>
      <select
        aria-label={t("common.language")}
        value={currentLanguage || "en"}
        onChange={(e) => changeLanguage(e.target.value)}
        className="border-none bg-black/20 light:bg-zinc-100 text-theme-text-primary light:text-zinc-800 text-xs rounded-md py-1.5 pl-2.5 pr-6 outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer"
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

type PopupPosition = { left: number; bottom: number; width: number };

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { pfp } = usePfp();
  const mode = useLoginMode();
  const [open, setOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [pos, setPos] = useState<PopupPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const displayName = user?.username || "OpenSIN";
  const subtitle =
    user?.email || (import.meta.env.DEV ? t("common.demoAccount") : "");
  const initials = displayName.slice(0, 2).toUpperCase();
  const isLoggedIn = mode !== null;

  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(300, Math.max(rect.width, 248));
      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - width - 8),
      );
      setPos({
        left,
        bottom: window.innerHeight - rect.top + 8,
        width,
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    popupRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={
        compact
          ? ""
          : "w-full px-2 pt-2 border-t border-white/[0.05] light:border-zinc-200"
      }
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={compact ? t("common.profile") : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        data-tooltip-id={compact ? "lsib-profile" : undefined}
        data-tooltip-content={compact ? t("common.profile") : undefined}
        className={
          compact
            ? "flex items-center justify-center w-8 h-8 rounded-full border border-white/[0.08] light:border-slate-200 cursor-pointer transition-all bg-white/[0.04] hover:bg-white/[0.08] text-theme-text-primary"
            : "flex items-center gap-x-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-white/[0.04] light:hover:bg-zinc-50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        }
      >
        {compact ? (
          <Avatar pfp={pfp} initials={initials} size={28} />
        ) : (
          <>
            <Avatar pfp={pfp} initials={initials} />
            <div className="flex flex-col items-start min-w-0 flex-grow">
              <span className="text-sm font-semibold text-theme-text-primary light:text-theme-text-primary truncate max-w-full">
                {displayName}
              </span>
              <span className="text-xs text-theme-text-secondary light:text-slate-500 truncate max-w-full">
                {subtitle}
              </span>
            </div>
            <CaretUpDown
              className="h-4 w-4 text-theme-text-secondary light:text-slate-500 shrink-0"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {/* Popup (portaled, opens upward, never clipped) */}
      {open &&
        pos &&
        createPortal(
          <div
            ref={popupRef}
            role="menu"
            tabIndex={-1}
            style={{
              position: "fixed",
              left: pos.left,
              bottom: pos.bottom,
              width: pos.width,
            }}
            className="z-[60] rounded-xl border border-white/[0.07] light:border-zinc-200 bg-theme-bg-secondary light:bg-white shadow-2xl shadow-black/60 p-1.5 max-h-[70vh] overflow-y-auto no-scroll"
          >
            {/* Identity header */}
            <div className="flex items-center gap-x-2.5 px-2.5 py-2">
              <Avatar pfp={pfp} initials={initials} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-theme-text-primary light:text-zinc-900 truncate">
                  {displayName}
                </span>
                {!!subtitle && (
                  <span className="text-xs text-theme-text-secondary light:text-slate-500 truncate">
                    {subtitle}
                  </span>
                )}
              </div>
            </div>

            <div className="my-1 h-px bg-white/10 light:bg-slate-200" />

            {/* Navigation items */}
            {user && (
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
                <span className="flex-grow">{t("common.profile")}</span>
              </button>
            )}

            <Link
              to={paths.settings.interface()}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={ITEM_CLASSES}
            >
              <Gear className={ICON_CLASSES} />
              <span className="flex-grow">{t("common.settings")}</span>
            </Link>

            <Link
              to={paths.appDocs()}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={ITEM_CLASSES}
            >
              <BookOpen className={ICON_CLASSES} />
              <span className="flex-grow">{t("common.documentation")}</span>
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
              <span className="flex-grow">{t("common.feedback")}</span>
              <ArrowUpRight
                className="h-4 w-4 text-theme-text-secondary light:text-slate-400"
                aria-hidden="true"
              />
            </a>

            <div className="my-1 h-px bg-white/10 light:bg-slate-200" />

            {/* Preferences */}
            <p className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium uppercase tracking-wide text-theme-placeholder light:text-zinc-400">
              {t("common.preferences")}
            </p>
            <ThemeSegment />
            <LanguageRow />

            <div className="my-1 h-px bg-white/10 light:bg-slate-200" />

            {/* Auth */}
            {isLoggedIn ? (
              <button
                type="button"
                role="menuitem"
                aria-label={t("common.signOut")}
                onClick={handleSignOut}
                className={ITEM_CLASSES}
              >
                <SignOut className={ICON_CLASSES} />
                <span className="flex-grow">{t("common.signOut")}</span>
              </button>
            ) : (
              <Link
                to={paths.login()}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={ITEM_CLASSES}
              >
                <SignIn className={ICON_CLASSES} />
                <span className="flex-grow">{t("common.signIn")}</span>
              </Link>
            )}
          </div>,
          document.body,
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

export default memo(AccountMenu);
