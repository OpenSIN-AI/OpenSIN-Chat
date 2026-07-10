// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

interface ToolsButtonProps {
  showTools: boolean;
  setShowTools: (show: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  autoOpenedToolsRef: React.MutableRefObject<boolean>;
}

export default function ToolsButton({
  showTools,
  setShowTools,
  textareaRef,
  autoOpenedToolsRef,
}: ToolsButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      id="tools-btn"
      type="button"
      onClick={() => {
        autoOpenedToolsRef.current = false;
        setShowTools(!showTools);
        textareaRef.current?.focus();
      }}
      className={`group border cursor-pointer flex items-center justify-center h-6 px-2 rounded-full transition-colors duration-150 ${
        showTools
          ? "bg-white/[0.06] light:bg-zinc-100 border-white/[0.08] light:border-zinc-200"
          : "border-transparent hover:bg-white/[0.04] light:hover:bg-zinc-100 hover:border-white/[0.06] light:hover:border-zinc-200"
      }`}
    >
      <span
        className={`text-sm font-medium ${
          showTools
            ? "text-[#e4e4e7] light:text-zinc-900"
            : "text-[#a1a1aa] light:text-zinc-600 group-hover:text-[#e4e4e7] light:group-hover:text-zinc-900"
        }`}
      >
        {t("chat_window.tools")}
      </span>
    </button>
  );
}
