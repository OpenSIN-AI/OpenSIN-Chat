import { useTranslation } from "react-i18next";

export default function ToolsButton({
  showTools,
  setShowTools,
  textareaRef,
  autoOpenedToolsRef,
}) {
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
      className={`group border-none cursor-pointer flex items-center justify-center h-6 px-2 rounded-full ${
        showTools
          ? "bg-zinc-700 light:bg-slate-200"
          : "hover:bg-zinc-700 light:hover:bg-slate-200"
      }`}
    >
      <span
        className={`text-sm font-medium ${
          showTools
            ? "text-white light:text-slate-800"
            : "text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-800"
        }`}
      >
        {t("chat_window.tools")}
      </span>
    </button>
  );
}
