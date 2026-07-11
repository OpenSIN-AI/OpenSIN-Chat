// SPDX-License-Identifier: MIT
import { useState, useRef, useEffect, useMemo } from "react";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import useLoginMode from "@/hooks/useLoginMode";
import { useTranslation } from "react-i18next";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";

const VALID_TEXT_SIZES = ["small", "normal", "large"];

function getTextSizes(t: any) {
  return [
    { key: "small", label: t("chat_window.small"), textClass: "text-xs" },
    { key: "normal", label: t("chat_window.normal"), textClass: "text-sm" },
    { key: "large", label: t("chat_window.large"), textClass: "text-base" },
  ];
}

export default function TextSizeMenu() {
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const TEXT_SIZES = useMemo(() => getTextSizes(t), [t]);
  const mode = useLoginMode();
  const [showMenu, setShowMenu] = useState(false as any);
  const [selectedSize, setSelectedSize] = useState(() => {
    const stored = safeGetItem("opensin_text_size");
    return VALID_TEXT_SIZES.includes(stored as any) ? stored : "normal";
  });
  const menuRef: any = useRef<any>(null);
  const buttonRef = useRef<any>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  function handleTextSizeChange(size: any) {
    setSelectedSize(size);
    safeSetItem("opensin_text_size", size);
    window.dispatchEvent(new CustomEvent("textSizeChange", { detail: size }));
  }

  // User icon is visible when login mode is active (single with password or multi-user)
  const hasUserIcon = mode !== null;

  if (isMobile) return null;
  return (
    <div
      className={`absolute top-3 md:top-5 z-30 ${hasUserIcon ? "right-[55px] md:right-[67px]" : "right-4 md:right-6"}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        aria-label={t("chat_window.text_size")}
        aria-expanded={showMenu}
        className={`group border-none cursor-pointer flex items-center justify-center w-[35px] h-[35px] rounded-full transition-all ${
          showMenu ? "bg-theme-bg-tertiary" : "hover:bg-theme-bg-tertiary"
        }`}
      >
        <SlidersHorizontal
          size={18}
          className={
            showMenu
              ? "text-theme-text-primary"
              : "text-theme-text-secondary group-hover:text-theme-text-primary"
          }
        />
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-[42px] bg-theme-bg-sidebar border border-theme-sidebar-border rounded-lg p-3 w-[200px] flex flex-col gap-1 shadow-lg"
        >
          <p className="text-[10px] font-medium text-theme-text-secondary px-2 mb-0.5">
            {t("chat_window.text_size_label")}
          </p>
          {(TEXT_SIZES as any).map(({ key, label, textClass }: any) => (
            <div
              key={key}
              onClick={() => handleTextSizeChange(key)}
              className={`flex items-center px-2 py-1 rounded cursor-pointer ${
                selectedSize === key
                  ? "bg-theme-bg-tertiary"
                  : "hover:bg-theme-bg-tertiary"
              }`}
            >
              <span
                className={`${textClass} text-theme-text-primary light:text-theme-text-primary`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
