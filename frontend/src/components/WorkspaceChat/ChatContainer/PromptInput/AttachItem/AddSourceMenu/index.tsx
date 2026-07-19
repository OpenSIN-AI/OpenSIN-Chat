// SPDX-License-Identifier: MIT
// Purpose: "+" attach menu — attach files/URLs as *chat* context (thread-scoped).
// Docs: Existing workspace docs and URLs become fixed selected context for this chat,
//       not permanent workspace embeddings.
import {
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactElement } from "react";
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";
import { Files } from "@phosphor-icons/react/dist/csr/Files";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import useDocuments from "@/hooks/useDocuments";
import showToast from "@/utils/toast";
import { ATTACHMENTS_PROCESSED_EVENT } from "../../../DnDWrapper";
import logger from "@/utils/logger";

/**
 * Recursively flattens the local-files directory tree into a single list of
 * files with their workspace docpath.
 */
function flattenLocalFiles(localFiles, parentPath = "") {
  if (!localFiles?.items) return [];
  const out = [];
  for (const node of localFiles.items) {
    if (!node) continue;
    if (node.type === "folder" && Array.isArray(node.items)) {
      const folderPath = parentPath
        ? `${parentPath}/${node.name}`
        : node.name;
      out.push(...flattenLocalFiles({ items: node.items }, folderPath));
      continue;
    }
    if (node.type === "file") {
      const docpath = parentPath ? `${parentPath}/${node.name}` : node.name;
      out.push({
        id: node.id || docpath,
        title: node.title || node.name,
        docpath,
        isUrl: (node.title || node.name || "").startsWith("http"),
      });
    }
  }
  return out;
}

function getFocusableMenuItems(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

/**
 * The "+" attach menu shown in the chat composer.
 * Everything here attaches to **this chat** (thread context), not permanent
 * workspace knowledge — pick existing workspace docs or paste a URL as fixed
 * selected context until the user removes it.
 */
export default function AddSourceMenu({
  workspaceSlug,
  threadSlug = null,
  onClose: onCloseProp,
  onAddLocalFiles,
  trigger,
  disabled = false,
  isOpen: isOpenProp,
}: {
  workspaceSlug: string;
  threadSlug?: string | null;
  onClose?: () => void;
  onAddLocalFiles?: () => void;
  trigger?: ReactElement<any>;
  disabled?: boolean;
  isOpen?: boolean;
}) {
  const { t } = useTranslation();

  const [view, setView] = useState("root"); // "root" | "sources" | "url"
  const [open, setOpen] = useState(isOpenProp ?? !trigger);
  const menuRef = useRef<any>(null);

  const isControlled = isOpenProp !== undefined;
  const isTriggerMode = !isControlled && !!trigger;
  const isOpen = isControlled ? isOpenProp : isTriggerMode ? open : true;

  const closeMenu = useCallback(() => {
    if (isTriggerMode) setOpen(false);
    onCloseProp?.();
  }, [isTriggerMode, onCloseProp]);

  useEffect(() => {
    if (isOpenProp !== undefined) setOpen(isOpenProp);
  }, [isOpenProp]);

  useEffect(() => {
    if (!isOpen) setView("root");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isTriggerMode || !menuRef.current) return;
    const first = getFocusableMenuItems(menuRef.current)[0];
    first?.focus();
  }, [isOpen, isTriggerMode]);

  useEffect(() => {
    if (!isOpen || !isTriggerMode) return;
    function handleMouseDown(e) {
      if (!menuRef.current?.contains(e.target)) {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen, isTriggerMode, closeMenu]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMenu]);

  function handleToggle() {
    if (disabled || !isTriggerMode) return;
    if (open) {
      closeMenu();
    } else {
      setOpen(true);
    }
  }

  function handleMenuKeyDown(e) {
    if (!menuRef.current) return;
    const items = getFocusableMenuItems(menuRef.current);
    if (items.length === 0) return;
    const index = items.findIndex((el) => el === document.activeElement);

    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      const nextIndex = index < 0 ? 0 : (index + 1) % items.length;
      items[nextIndex].focus();
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      const prevIndex =
        index < 0
          ? items.length - 1
          : (index - 1 + items.length) % items.length;
      items[prevIndex].focus();
    }
  }

  function renderTrigger() {
    if (!trigger) return null;
    return cloneElement(trigger, {
      disabled,
      onClick: (e) => {
        handleToggle();
        (trigger.props as any)?.onClick?.(e);
      },
      onMouseDown: (e) => {
        e.stopPropagation();
        (trigger.props as any)?.onMouseDown?.(e);
      },
      "aria-haspopup": "true",
      "aria-expanded": isOpen,
    });
  }

  if (!isOpen) return trigger ? renderTrigger() : null;

  return (
    <>
      {trigger && renderTrigger()}
      <div
        ref={menuRef}
        role="menu"
        aria-label={t("chat_window.attach_menu.add_files")}
        tabIndex={-1}
        className="flex flex-col gap-1 p-2 min-w-[280px]"
        onKeyDown={handleMenuKeyDown}
      >
        {view === "root" && (
          <RootView
            t={t}
            onAddLocalFiles={() => {
              onAddLocalFiles?.();
              closeMenu();
            }}
            onOpenSources={() => setView("sources")}
            onOpenUrl={() => setView("url")}
          />
        )}
        {view === "sources" && (
          <SourcesView
            t={t}
            workspaceSlug={workspaceSlug}
            threadSlug={threadSlug}
            onBack={() => setView("root")}
            onClose={closeMenu}
          />
        )}
        {view === "url" && (
          <UrlView
            t={t}
            workspaceSlug={workspaceSlug}
            threadSlug={threadSlug}
            onBack={() => setView("root")}
            onClose={closeMenu}
          />
        )}
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 light:text-slate-400">
      {children}
    </p>
  );
}

function MenuRow({ icon: Icon, label, hint, onClick, hasSubmenu = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-haspopup={hasSubmenu ? "true" : undefined}
      onClick={onClick}
      className="border-none bg-transparent w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-left hover:bg-zinc-700/60 light:hover:bg-slate-200 transition-colors duration-200"
    >
      <Icon
        size={16}
        className="text-zinc-400 light:text-slate-500 flex-shrink-0"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-zinc-100 light:text-slate-800">
          {label}
        </span>
        {hint ? (
          <span className="block text-[10px] text-zinc-400 light:text-slate-500 leading-snug mt-0.5">
            {hint}
          </span>
        ) : null}
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

function BackHeader({ label, onBack, t }) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-label={t("common.back")}
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

function RootView({ t, onAddLocalFiles, onOpenSources, onOpenUrl }) {
  return (
    <>
      <SectionLabel>
        {t("chat_window.attach_menu.section_chat")}
      </SectionLabel>
      <MenuRow
        icon={UploadSimple}
        label={t("chat_window.attach_menu.upload_from_computer")}
        hint={t("chat_window.attach_menu.upload_hint")}
        onClick={onAddLocalFiles}
      />
      <MenuRow
        icon={Files}
        label={t("chat_window.attach_menu.current_sources")}
        hint={t("chat_window.attach_menu.current_sources_hint")}
        onClick={onOpenSources}
        hasSubmenu
      />
      <MenuRow
        icon={Globe}
        label={t("chat_window.attach_menu.add_from_url")}
        hint={t("chat_window.attach_menu.url_menu_hint")}
        onClick={onOpenUrl}
        hasSubmenu
      />
    </>
  );
}

function SourcesView({ t, workspaceSlug, threadSlug, onBack, onClose }) {
  const {
    documents: localFiles,
    isLoading: loading,
  } = useDocuments();
  const [workspaceDocs, setWorkspaceDocs] = useState<any[] | null>(null);
  const [loadingWs, setLoadingWs] = useState(true);
  const [addingId, setAddingId] = useState<any>(null);
  const [query, setQuery] = useState("");

  // Prefer documents already in this workspace; fall back to all local files.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingWs(true);
      try {
        const ws = await Workspace.bySlug(workspaceSlug);
        if (cancelled) return;
        const docs = (ws?.documents || []).map((d) => ({
          id: d.id || d.docpath,
          title: d.filename || d.name || d.title || d.docpath,
          docpath: d.docpath,
          isUrl: String(d.docpath || "").includes("http"),
        }));
        setWorkspaceDocs(docs);
      } catch {
        if (!cancelled) setWorkspaceDocs([]);
      } finally {
        if (!cancelled) setLoadingWs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug]);

  const allLocal = useMemo(() => flattenLocalFiles(localFiles), [localFiles]);
  const files = useMemo(() => {
    if (workspaceDocs && workspaceDocs.length > 0) return workspaceDocs;
    // Fall back: show local files that can be attached as context
    return allLocal;
  }, [workspaceDocs, allLocal]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        (f.title || "").toLowerCase().includes(q) ||
        (f.docpath || "").toLowerCase().includes(q),
    );
  }, [files, query]);

  async function handleAdd(file) {
    if (!workspaceSlug) {
      showToast(t("chat_window.attach_menu.no_workspace"), "error");
      return;
    }
    setAddingId(file.id);
    const result = await Workspace.attachDocumentContext(
      workspaceSlug,
      file.docpath,
      threadSlug,
    );
    setAddingId(null);
    if (!result.success) {
      showToast(result.error || t("chat_window.attach_menu.add_failed"), "error");
      return;
    }
    showToast(t("chat_window.attach_menu.add_success"), "success");
    window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT));
    onClose?.();
  }

  const isLoading = loading || loadingWs;

  return (
    <div className="min-w-[280px]">
      <BackHeader
        label={t("chat_window.attach_menu.current_sources")}
        onBack={onBack}
        t={t}
      />
      <p className="px-2 pb-1.5 text-[10px] text-zinc-400 light:text-slate-500 leading-snug">
        {t("chat_window.attach_menu.current_sources_hint")}
      </p>
      {files.length > 6 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search")}
          className="mx-1 mb-1.5 w-[calc(100%-8px)] rounded-md border border-zinc-700 light:border-slate-300 bg-zinc-900 light:bg-white px-2 py-1.5 text-xs text-theme-text-primary outline-none"
        />
      )}
      <div className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto no-scroll">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400 light:text-slate-500">
            <CircleNotch size={14} className="animate-spin" />
            {t("chat_window.attach_menu.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-zinc-400 light:text-slate-500 text-center py-4">
            {t("chat_window.attach_menu.no_sources")}
          </p>
        ) : (
          filtered.map((file) => {
            const Icon = file.isUrl ? Globe : FileText;
            return (
              <button
                key={file.id}
                type="button"
                aria-label={file.title || t("common.addFile", "Add file")}
                disabled={addingId === file.id}
                onClick={() => handleAdd(file)}
                className="border-none bg-transparent w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-left hover:bg-zinc-700 light:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <Icon
                  size={15}
                  className="text-zinc-300 light:text-slate-600 flex-shrink-0"
                />
                <span className="flex-1 text-sm text-theme-text-primary light:text-theme-text-primary truncate">
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

function UrlView({ t, workspaceSlug, threadSlug, onBack, onClose }) {
  const inputRef = useRef<any>(null);
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function isValidUrl(value) {
    let candidate = value;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = "https://" + candidate;
    }
    try {
      const url = new URL(candidate);
      if (!/^https?:$/.test(url.protocol)) return null;
      return url.toString();
    } catch {
      return null;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = link.trim();
    if (!trimmed || submitting) return;
    if (!workspaceSlug) {
      const msg = t("chat_window.attach_menu.no_workspace");
      setError(msg);
      showToast(msg, "error");
      return;
    }

    if (!trimmed.includes(".") && !trimmed.includes("localhost")) {
      const msg = t("chat_window.attach_menu.url_incomplete");
      setError(msg);
      showToast(msg, "error");
      return;
    }
    const normalizedUrl = isValidUrl(trimmed);
    if (!normalizedUrl) {
      const msg = t("chat_window.attach_menu.url_invalid");
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await Workspace.attachLinkContext(
        workspaceSlug,
        normalizedUrl,
        threadSlug,
      );
      if (!result.success) {
        const errMsg =
          result.error || t("chat_window.attach_menu.url_failed");
        setError(errMsg);
        showToast(errMsg, "error", { clear: true });
        return;
      }

      showToast(t("chat_window.attach_menu.url_success"), "success");
      window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT));
      setLink("");
      onClose?.();
    } catch (err) {
      logger.error(err);
      const msg = t("chat_window.attach_menu.url_server_error", {
        status: 0,
        statusText: "client",
      });
      setError(msg);
      showToast(msg, "error", { clear: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-[min(300px,calc(100vw-24px))] min-w-0"
    >
      <BackHeader
        label={t("chat_window.attach_menu.add_from_url")}
        onBack={onBack}
        t={t}
      />
      <div className="flex flex-col gap-2 p-1">
        <p className="text-xs text-zinc-400 light:text-slate-500 leading-snug">
          {t("chat_window.attach_menu.url_hint")}
        </p>
        <div
          className={`flex items-center gap-1.5 bg-zinc-900 light:bg-white border rounded-md px-2 transition-colors ${
            error
              ? "border-red-500 light:border-red-500"
              : "border-zinc-700 light:border-slate-300"
          }`}
        >
          <Globe
            size={15}
            className="text-zinc-400 light:text-slate-500 flex-shrink-0"
          />
          <input
            ref={inputRef}
            type="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              if (error) setError("");
            }}
            placeholder="https://..."
            disabled={submitting}
            aria-invalid={!!error}
            className="flex-1 bg-transparent border-none outline-none text-sm text-theme-text-primary light:text-theme-text-primary py-2 placeholder:text-zinc-500 light:placeholder:text-slate-400"
          />
          {link && !submitting && (
            <button
              type="button"
              onClick={() => {
                setLink("");
                setError("");
              }}
              className="border-none bg-transparent cursor-pointer text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary flex-shrink-0"
              aria-label={t("common.clearUrl")}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {error && (
          <p
            className="text-xs text-red-400 light:text-red-600 leading-snug"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!link.trim() || submitting}
          className="border-none flex items-center justify-center gap-2 px-3 py-2 text-sm bg-primary-button hover:bg-theme-button-primary-hover text-theme-text-primary font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer"
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
