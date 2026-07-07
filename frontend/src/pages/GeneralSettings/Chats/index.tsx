// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import useQuery from "@/hooks/useQuery";
import ChatRow from "./ChatRow";
import showToast from "@/utils/toast";
import System from "@/models/system";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Download } from "@phosphor-icons/react/dist/csr/Download";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";
import { CanViewChatHistory } from "@/components/CanViewChatHistory";

interface ExportOption {
  name: string;
  mimeType: string;
  fileExtension: string;
  filenameFunc: () => string;
}

const exportOptions: Record<string, ExportOption> = {
  csv: {
    name: "CSV",
    mimeType: "text/csv",
    fileExtension: "csv",
    filenameFunc: () => {
      return `opensin-chats-${new Date().toISOString().slice(0, 10)}`;
    },
  },
  json: {
    name: "JSON",
    mimeType: "application/json",
    fileExtension: "json",
    filenameFunc: () => {
      return `opensin-chats-${new Date().toISOString().slice(0, 10)}`;
    },
  },
  jsonl: {
    name: "JSONL",
    mimeType: "application/jsonl",
    fileExtension: "jsonl",
    filenameFunc: () => {
      return `opensin-chats-${new Date().toISOString().slice(0, 10)}-lines`;
    },
  },
  jsonAlpaca: {
    name: "JSON (Alpaca)",
    mimeType: "application/json",
    fileExtension: "json",
    filenameFunc: () => {
      return `opensin-chats-${new Date().toISOString().slice(0, 10)}-alpaca`;
    },
  },
};

export default function WorkspaceChats() {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const openMenuButton = useRef<HTMLButtonElement>(null);
  const query = useQuery();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [offset, setOffset] = useState(Number(query.get("offset") || 0));
  const [canNext, setCanNext] = useState(false);
  const { t } = useTranslation();

  const handleDumpChats = async (exportType: keyof typeof exportOptions) => {
    try {
      const chats = await System.exportChats(exportType, "workspace");
      if (!!chats) {
        const { name, mimeType, fileExtension, filenameFunc } =
          exportOptions[exportType];
        const blob = new Blob([chats], { type: mimeType });
        saveAs(blob, `${filenameFunc()}.${fileExtension}`);
        showToast(t("recorded.exportSuccess", { name }), "success");
      } else {
        showToast(t("recorded.exportFailed"), "error");
      }
    } catch (e) {
      showToast(t("recorded.exportFailed"), "error");
    }
  };

  const handleClearAllChats = async () => {
    if (!window.confirm(t("recorded.clearConfirm"))) return false;
    try {
      await System.deleteChat(-1);
      setChats([]);
      showToast(t("recorded.clearedAll"), "success");
    } catch (e) {
      showToast(String(e), "error");
    }
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !openMenuButton.current?.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchChats() {
      setLoading(true);
      try {
        const { chats: _chats = [], hasPages = false } =
          await System.chats(offset);
        if (cancelled) return;
        setChats(_chats);
        setCanNext(hasPages);
      } catch (err: any) {
        if (cancelled) return;
        setChats([]);
        setCanNext(false);
        showToast(
          t("recorded.loadFailed", { error: err?.message || String(err) }),
          "error",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchChats();
    return () => {
      cancelled = true;
    };
  }, [offset]);

  return (
    <CanViewChatHistory>
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
        <Sidebar />
        <div
          style={
            {
              "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
            } as React.CSSProperties
          }
          className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
        >
          <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
            <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
              <div className="flex flex-wrap gap-4 items-center">
                <p className="text-lg leading-6 font-bold text-theme-text-primary">
                  {t("recorded.title")}
                </p>
                <div className="relative">
                  <button
                    type="button"
                    ref={openMenuButton}
                    onClick={toggleMenu}
                    className="flex items-center gap-x-2 px-4 py-1 rounded-lg bg-primary-button hover:light:bg-theme-bg-primary hover:text-theme-text-primary text-xs font-semibold hover:bg-secondary shadow-[0_4px_14px_rgba(0,0,0,0.25)] h-[34px] w-fit"
                  >
                    <Download size={18} weight="bold" />
                    {t("recorded.export")}
                    <CaretDown size={18} weight="bold" />
                  </button>
                  <div
                    ref={menuRef}
                    className={`${
                      showMenu ? "slide-down" : "slide-up hidden"
                    } z-20 w-fit rounded-lg absolute top-full right-0 bg-secondary light:bg-theme-bg-secondary mt-2 shadow-md`}
                  >
                    <div className="py-2">
                      {Object.entries(exportOptions).map(([key, data]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => {
                            handleDumpChats(key as keyof typeof exportOptions);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#3D4147] light:hover:bg-theme-sidebar-item-hover"
                        >
                          {data.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {chats.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllChats}
                    className="flex items-center gap-x-2 px-4 py-1 border hover:border-transparent light:border-theme-sidebar-border border-white/40 text-theme-placeholder light:text-theme-text-secondary rounded-lg bg-transparent hover:light:text-theme-bg-primary hover:text-theme-text-primary text-xs font-semibold hover:bg-red-500 shadow-[0_4px_14px_rgba(0,0,0,0.25)] h-[34px] w-fit"
                  >
                    <Trash size={18} weight="bold" />
                    {t("chats.clearChats")}
                  </button>
                )}
              </div>
              <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
                {t("recorded.description")}
              </p>
            </div>
            <div className="overflow-x-auto">
              <ChatsContainer
                loading={loading}
                chats={chats}
                setChats={setChats}
                offset={offset}
                setOffset={setOffset}
                canNext={canNext}
                t={t}
              />
            </div>
          </div>
        </div>
      </div>
    </CanViewChatHistory>
  );
}

function ChatsContainer({
  loading,
  chats,
  setChats,
  offset,
  setOffset,
  canNext,
  t,
}: {
  loading: boolean;
  chats: any[];
  setChats: React.Dispatch<React.SetStateAction<any[]>>;
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  canNext: boolean;
  t: any;
}) {
  const handlePrevious = () => {
    setOffset(Math.max(offset - 1, 0));
  };
  const handleNext = () => {
    setOffset(offset + 1);
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await System.deleteChat(chatId);
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
    } catch (e) {
      showToast(String(e), "error");
    }
  };

  if (loading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <>
      <table className="w-full text-xs text-left rounded-lg min-w-[640px] border-spacing-0">
        <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
          <tr>
            <th scope="col" className="px-6 py-3 rounded-tl-lg">
              {t("recorded.table.id")}
            </th>
            <th scope="col" className="px-6 py-3">
              {t("recorded.table.by")}
            </th>
            <th scope="col" className="px-6 py-3">
              {t("recorded.table.workspace")}
            </th>
            <th scope="col" className="px-6 py-3">
              {t("recorded.table.prompt")}
            </th>
            <th scope="col" className="px-6 py-3">
              {t("recorded.table.response")}
            </th>
            <th scope="col" className="px-6 py-3">
              {t("recorded.table.at")}
            </th>
            <th scope="col" className="px-6 py-3 rounded-tr-lg">
              {" "}
            </th>
          </tr>
        </thead>
        <tbody>
          {!!chats &&
            chats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                onDelete={handleDeleteChat as any}
              />
            ))}
        </tbody>
      </table>
      <div className="flex w-full justify-between items-center mt-6">
        <button
          type="button"
          onClick={handlePrevious}
          className="px-4 py-2 rounded-lg border border-theme-text-secondary text-theme-text-secondary text-sm items-center flex gap-x-2 hover:bg-theme-text-secondary hover:text-theme-bg-secondary disabled:invisible"
          disabled={offset === 0}
        >
          {" "}
          {t("chats.previousPage")}
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-200 light:text-theme-text-secondary light:border-theme-sidebar-border text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 disabled:invisible"
          disabled={!canNext}
        >
          {t("chats.nextPage")}
        </button>
      </div>
    </>
  );
}
