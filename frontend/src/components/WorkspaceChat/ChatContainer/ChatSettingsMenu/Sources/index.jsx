import { useTranslation } from "react-i18next";
import { useSourcesSidebar } from "../../ChatSidebar";

export default function SourcesRow({ onClose }) {
  const { t } = useTranslation();
  const { sidebarOpen, closeSidebar, openSidebar } = useSourcesSidebar();

  function handleClick() {
    if (sidebarOpen) {
      closeSidebar();
    } else {
      // Open sources sidebar — will show all connected sources
      openSidebar([]);
    }
    onClose();
  }

  return (
    <div
      onClick={handleClick}
      className="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-zinc-700 light:hover:bg-slate-200"
    >
      <span className="text-sm font-normal text-white light:text-slate-800">
        {t("chat_window.sources")}
      </span>
    </div>
  );
}