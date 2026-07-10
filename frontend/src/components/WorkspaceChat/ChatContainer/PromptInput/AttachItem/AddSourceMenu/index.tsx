// SPDX-License-Identifier: MIT
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
import { GithubLogo } from "@phosphor-icons/react/dist/csr/GithubLogo";
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
 * Simple Bitbucket logo SVG used as a stand-in for the official brand icon.
 * Kept self-contained so we do not add a new dependency.
 */
function BitbucketIcon({ size = 16, className = "" }) {
  return (
    <svg
      data-testid="bitbucket-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" />
    </svg>
  );
}

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
 * Returns all focusable descendants of a menu container, excluding the
 * container itself when it has tabindex="-1".
 */
function getFocusableMenuItems(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

/**
 * The "+" attach menu shown in the chat composer, styled like the v0 prompt
 * input dropdown. Provides the existing upload/source actions plus v0-style
 * placeholder rows for future integrations.
 *
 * The component can be used in two modes:
 *  - Controlled/open content: when no `trigger` is passed, the menu content is
 *    rendered directly and the parent handles visibility (this is how AttachItem
 *    uses it).
 *  - Self-contained dropdown: pass a `trigger` element and the component manages
 *    open/close state, keyboard focus, and click-outside dismissal.
 *
 * @param {Object} props
 * @param {string} props.workspaceSlug
 * @param {Function} props.onClose - close the menu
 * @param {Function} props.onAddLocalFiles - trigger the local file uploader
 * @param {ReactElement} [props.trigger] - element that toggles the menu
 * @param {boolean} [props.disabled] - disables the trigger when provided
 * @param {boolean} [props.isOpen] - controlled open state
 */
export default function AddSourceMenu({
  workspaceSlug,
  onClose: onCloseProp,
  onAddLocalFiles,
  trigger,
  disabled = false,
  isOpen: isOpenProp,
}: {
  workspaceSlug: string;
  onClose?: () => void;
  onAddLocalFiles?: () => void;
  trigger?: ReactElement;
  disabled?: boolean;
  isOpen?: boolean;
}) {
  const { t } = useTranslation();

  function handleGitHub() {
    showToast(t("chat_window.attach_menu.github_coming_soon"), "info");
  }

  function handleBitbucket() {
    showToast(t("chat_window.attach_menu.bitbucket_coming_soon"), "info");
  }

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
        trigger.props.onClick?.(e);
      },
      onMouseDown: (e) => {
        e.stopPropagation();
        trigger.props.onMouseDown?.(e);
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
        className="flex flex-col gap-1 p-2 min-w-[240px]"
        onKeyDown={handleMenuKeyDown}
      >
        {view === "root" && (
          <RootView
            t={t}
            onGitHub={handleGitHub}
            onBitbucket={handleBitbucket}
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
            onBack={() => setView("root")}
            onClose={closeMenu}
          />
        )}
        {view === "url" && (
          <UrlView
            t={t}
            workspaceSlug={workspaceSlug}
            onBack={() => setView("root")}
            onClose={closeMenu}
          />
        )}
      </div>
    </>
  );
}

function MenuRow({ icon: Icon, label, onClick, hasSubmenu = false }) {
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
      <span className="flex-1 text-sm font-medium text-zinc-100 light:text-slate-800">
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

function RootView({
  t,
  onGitHub,
  onBitbucket,
  onAddLocalFiles,
  onOpenSources,
  onOpenUrl,
}) {
  return (
    <>
      <MenuRow
        icon={GithubLogo}
        label={t("chat_window.attach_menu.import_from_github")}
        onClick={onGitHub}
      />
      <MenuRow
        icon={BitbucketIcon}
        label={t("chat_window.attach_menu.create_from_bitbucket")}
        onClick={onBitbucket}
      />
      <MenuRow
        icon={UploadSimple}
        label={t("chat_window.attach_menu.upload_from_computer")}
        onClick={onAddLocalFiles}
      />
      <MenuRow
        icon={Files}
        label={t("chat_window.attach_menu.current_sources")}
        onClick={onOpenSources}
        hasSubmenu
      />
      <MenuRow
        icon={Globe}
        label={t("chat_window.attach_menu.add_from_url")}
        onClick={onOpenUrl}
        hasSubmenu
      />
    </>
  );
}

function SourcesView({ t, workspaceSlug, onBack, onClose }) {
  const {
    documents: localFiles,
    isLoading: loading,
    mutate: mutateDocuments,
  } = useDocuments();
  const files = useMemo(() => flattenLocalFiles(localFiles), [localFiles]);
  const [addingId, setAddingId] = useState<any>(null);

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
    await mutateDocuments();
    window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT));
    onClose?.();
  }

  return (
    <div className="min-w-[260px]">
      <BackHeader
        label={t("chat_window.attach_menu.current_sources")}
        onBack={onBack}
        t={t}
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
                aria-label={file.name || t("common.addFile", "Add file")}
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

function UrlView({ t, workspaceSlug, onBack, onClose }) {
  const inputRef = useRef<any>(null);
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { mutate: refreshDocuments } = useDocuments();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function isValidUrl(value) {
    // Auto-add protocol if missing
    let candidate = value;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = "https://" + candidate;
    }
    try {
      const url = new URL(candidate);
      // Reject anything that isn't http(s)
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

    // ==========================================
    // <-- VERBESSERUNG: Client-seitige URL-Validierung
    // ==========================================
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
      // Snapshot existing docpaths so we can detect the freshly scraped document.
      const before = new Set(
        flattenLocalFiles(await refreshDocuments()).map((f) => f.docpath),
      );

      const { response, data } = await Workspace.uploadLink(
        workspaceSlug,
        normalizedUrl,
      );
      if (!response.ok) {
        const errMsg =
          data?.error ||
          data?.message ||
          t("chat_window.attach_menu.url_server_error", {
            status: response.status,
            statusText: response.statusText,
          });
        setError(errMsg);
        showToast(errMsg, "error", { clear: true });
        return;
      }

      // Find and embed the newly created document(s) into the current workspace.
      const after = flattenLocalFiles(await refreshDocuments());
      const newDocpaths = after
        .map((f) => f.docpath)
        .filter((docpath) => !before.has(docpath));
      if (newDocpaths.length > 0) {
        await Workspace.modifyEmbeddings(workspaceSlug, {
          adds: newDocpaths,
          deletes: [],
        });
        await refreshDocuments();
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
    <form onSubmit={handleSubmit} noValidate className="min-w-[280px]">
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
            placeholder="https://..." // eslint-disable-line i18next/no-literal-string
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
