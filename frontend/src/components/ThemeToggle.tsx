// SPDX-License-Identifier: MIT
import React from "react";
import { Sun } from "@phosphor-icons/react/dist/csr/Sun";
import { Moon } from "@phosphor-icons/react/dist/csr/Moon";
import { useTranslation } from "react-i18next";
import { useThemeContext } from "@/ThemeContext";

const DEFAULT_BUTTON_CLASSES =
  "flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all bg-transparent hover:bg-zinc-700 light:hover:bg-slate-200 text-white flex-shrink-0 relative z-10";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const ctx = useThemeContext();

  if (!ctx) return null;

  const { theme, setTheme, isLight } = ctx;
  const next =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label =
    t("common.theme") +
    " — " +
    t(`common.theme${next.charAt(0).toUpperCase() + next.slice(1)}`);

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={className ?? DEFAULT_BUTTON_CLASSES}
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
