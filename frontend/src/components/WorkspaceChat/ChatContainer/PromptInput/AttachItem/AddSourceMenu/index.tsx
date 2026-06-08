// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FilePlus,
  Files,
  Link as LinkIcon,
  CaretRight,
  CircleNotch,
  Globe,
  FileText,
  X,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import useDocuments from "@/hooks/useDocuments";
import showToast from "@/utils/toast";
import { ATTACHMENTS_PROCESSED_EVENT } from "../../../DnDWrapper";

/**
 * Flattens the nested local-files directory tree into a single list of files
 * with their workspace docpath so they can be added to the current workspace.
 */
function flattenLocalFiles(localFiles) {
  if (!localFiles?.items) return [];
  const out = [];
  for (const folder of localFiles.items) {
    if (folder?.type !== "folder" || !Array.isArray(folder.items)) continue;
    for (const file of folder.items) {
      if (file?.type !== "file") continue;
      out.push({
        id: file.id || `${folder.name}/${file.name}`,
        title: file.title || file.name,
        docpath: `${folder.name}/${file.name}`,
        isUrl: (file.title || file.name || "").startsWith("http"),
      });
    }
  }
  return out;
}

/**
 * The "+" attach menu shown in the chat composer.
 * Provides three actions (ChatGPT-style):
 *  - Add local files
 *  - Pick from existing sources (files/urls uploaded across workspaces)
 *  - Add a source from a URL (website or YouTube video)
 *
 * @param {Object} props
 * @param {string} props.workspaceSlug
 * @param {Function} props.onClose - close the menu
 * @param {Function} props.onAddLocalFiles - trigger the local file uploader
 */
export default function AddSourceMenu({
  workspaceSlug,
  onClose,
  onAddLocalFiles,
}) {
  const { t } = useTranslation();
  const [view, setView] = useState("root"); // "root" | "sources" | "url"

  return (
    <div className="flex flex-col gap-1 p-1 min-w-[240px]">
      {view === "root" && (
        <RootView
          t={t}
          onAddLocalFiles={() => {
            onAddLocalFiles?.();
            onClose?.();
          }}
          onOpenSources={() => setView("sources")}
          onOpenUrl={() => setView("url")}
        />
      )}
      {view === "sources" && (
        <SourcesView
          t={t}
          workspaceSlug={workspaceSlug}
          onBack={() => setView("root")}
          onClose={onClose}
        />
      )}
      {view === "url" && (
        <UrlView
          t={t}
          workspaceSlug={workspaceSlug}
          onBack={() => setView("root")}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function MenuRow({ icon: Icon, label, onClick, hasSubmenu = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-none bg-transparent w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-left hover:bg-zinc-700 light:hover:bg-slate-200 transition-colors"
    >
      <Icon
        size={16}
        className="text-zinc-300 light:text-slate-600 flex-shrink-0"
      />
      <span className="flex-1 text-sm text-white light:text-slate-800">
        {label}
      </span>
      {hasSubmenu && (
        <CaretRight
          size={13}
          weight="bold"
          className="text-zinc-400 light:text-slate-500 flex-shrink-0"
        />
      )}
    </button>
  );
}

function RootView({ t, onAddLocalFiles, onOpenSources, onOpenUrl }) {
  return (
    <>
      <MenuRow
        icon={FilePlus}
        label={t("chat_window.attach_menu.add_files")}
        onClick={onAddLocalFiles}
      />
      <MenuRow
        icon={Files}
        label={t("chat_window.attach_menu.current_sources")}
        onClick={onOpenSources}
        hasSubmenu
      />
      <MenuRow
        icon={LinkIcon}
        label={t("chat_window.attach_menu.add_from_url")}
        onClick={onOpenUrl}
        hasSubmenu
      />
    </>
  );
}

function BackHeader({ label, onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="border-none bg-transparent w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-left hover:bg-zinc-700 light:hover:bg-slate-200 transition-colors mb-1"
    >
      <CaretRight
        size={13}
        weight="bold"
        className="rotate-180 text-zinc-400 light:text-slate-500"
      />
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 light:text-slate-500">
        {label}
      </span>
    </button>
  );
}

function SourcesView({ t, workspaceSlug, onBack, onClose }) {
  const { documents: localFiles, isLoading: loading } = useDocuments();
  const files = useMemo(() => flattenLocalFiles(localFiles), [localFiles]);
  const [addingId, setAddingId] = useState(null);

  async function handleAdd(file) {
    if (!workspaceSlug) {
      showToast(t("chat_window.attach_menu.no_workspace"), "error");
      return;
    }
    setAddingId(file.id);
    const { workspace, message } = await Workspace.modifyEmbeddings(
      workspaceSlug,
      { adds: [file.docpath], deletes: [] },
    );
    setAddingId(null);
    if (!workspace) {
      showToast(message || t("chat_window.attach_menu.add_failed"), "error");
      return;
    }
    showToast(t("chat_window.attach_menu.add_success"), "success");
    window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT));
    onClose?.();
  }

  return (
    <div className="min-w-[260px]">
      <BackHeader
        label={t("chat_window.attach_menu.current_sources")}
        onBack={onBack}
      />
      <div className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto no-scroll">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400 light:text-slate-500">
            <CircleNotch size={14} className="animate-spin" />
            {t("chat_window.attach_menu.loading")}
          </div>
        ) : files.length === 0 ? (
          <p className="text-xs text-zinc-400 light:text-slate-500 text-center py-4">
            {t("chat_window.attach_menu.no_sources")}
          </p>
        ) : (
          files.map((file) => {
            const Icon = file.isUrl ? Globe : FileText;
            return (
              <button
                key={file.id}
                type="button"
                disabled={addingId === file.id}
                onClick={() => handleAdd(file)}
                className="border-none bg-transparent w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-left hover:bg-zinc-700 light:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <Icon
                  size={15}
                  className="text-zinc-300 light:text-slate-600 flex-shrink-0"
                />
                <span className="flex-1 text-sm text-white light:text-slate-800 truncate">
                  {file.title}
                </span>
                {addingId === file.id && (
                  <CircleNotch
                    size={14}
                    className="animate-spin text-zinc-400 light:text-slate-500 flex-shrink-0"
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function UrlView({ t, workspaceSlug, onBack, onClose }) {
  const inputRef = useRef(null);
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = link.trim();
    if (!trimmed || submitting) return;
    if (!workspaceSlug) {
      showToast(t("chat_window.attach_menu.no_workspace"), "error");
      return;
    }
    setSubmitting(true);

    // Snapshot existing docpaths so we can detect the freshly scraped document.
    const before = new Set(
      flattenLocalFiles(await System.localFiles()).map((f) => f.docpath),
    );

    const { response, data } = await Workspace.uploadLink(
      workspaceSlug,
      trimmed,
    );
    if (!response.ok) {
      setSubmitting(false);
      showToast(
        data?.error || t("chat_window.attach_menu.url_failed"),
        "error",
      );
      return;
    }

    // Find and embed the newly created document(s) into the current workspace.
    const after = flattenLocalFiles(await System.localFiles());
    const newDocpaths = after
      .map((f) => f.docpath)
      .filter((docpath) => !before.has(docpath));
    if (newDocpaths.length > 0) {
      await Workspace.modifyEmbeddings(workspaceSlug, {
        adds: newDocpaths,
        deletes: [],
      });
    }

    setSubmitting(false);
    showToast(t("chat_window.attach_menu.url_success"), "success");
    window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT));
    setLink("");
    onClose?.();
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-[280px]">
      <BackHeader
        label={t("chat_window.attach_menu.add_from_url")}
        onBack={onBack}
      />
      <div className="flex flex-col gap-2 p-1">
        <p className="text-xs text-zinc-400 light:text-slate-500 leading-snug">
          {t("chat_window.attach_menu.url_hint")}
        </p>
        <div className="flex items-center gap-1.5 bg-zinc-900 light:bg-white border border-zinc-700 light:border-slate-300 rounded-md px-2">
          <Globe
            size={15}
            className="text-zinc-400 light:text-slate-500 flex-shrink-0"
          />
          <input
            ref={inputRef}
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            disabled={submitting}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white light:text-slate-800 py-2 placeholder:text-zinc-500 light:placeholder:text-slate-400"
          />
          {link && !submitting && (
            <button
              type="button"
              onClick={() => setLink("")}
              className="border-none bg-transparent cursor-pointer text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-800 flex-shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!link.trim() || submitting}
          className="border-none flex items-center justify-center gap-2 px-3 py-2 text-sm bg-primary-button hover:bg-theme-button-primary-hover text-white font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <CircleNotch size={14} className="animate-spin" />
              {t("chat_window.attach_menu.url_submitting")}
            </>
          ) : (
            t("chat_window.attach_menu.url_submit")
          )}
        </button>
      </div>
    </form>
  );
}
