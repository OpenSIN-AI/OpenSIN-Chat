// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useUser from "@/hooks/useUser";
import useSystemSettings from "@/hooks/useSystemSettings";
import { useMemoriesSidebar, useSourcesSidebar } from "../../ChatSidebar";

export default function MemoriesRow({ onClose }: any) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toggleSidebar } = useMemoriesSidebar();
  const { closeSidebar } = useSourcesSidebar();
  const { settings, loading } = useSystemSettings();

  const isAdmin = !user || user?.role === "admin";
  const memoryEnabled = useMemo(() => !!settings?.MemoryEnabled, [settings]);

  function handleClick() {
    closeSidebar();
    toggleSidebar();
    onClose();
  }

  if (loading) return null;
  if (!isAdmin && !memoryEnabled) return null;

  return (
    <div
      onClick={handleClick}
      className="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-zinc-700 light:hover:bg-slate-200"
    >
      <span className="text-sm font-normal text-white light:text-slate-800">
        {t("chat_window.memories.title")}
      </span>
    </div>
  );
}
