// SPDX-License-Identifier: MIT
// Tab button for switching between PDF analysis panels
import React from "react";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
          : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-100 text-zinc-400 light:text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
