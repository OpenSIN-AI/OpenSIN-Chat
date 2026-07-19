// SPDX-License-Identifier: MIT
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import {
  ATTACHMENTS_PROCESSED_EVENT,
  REMOVE_ATTACHMENT_EVENT,
} from "../../DnDWrapper";
import { useTheme } from "@/hooks/useTheme";
import ParsedFilesMenu from "./ParsedFilesMenu";
import AddSourceMenu from "./AddSourceMenu";
import useDocument from "@/hooks/useDocument";

/**
 * This is a simple proxy component that clicks on the DnD file uploader for the user.
 * @returns
 */
export default function AttachItem({
  workspaceSlug = null,
  workspaceThreadSlug = null,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const params = useParams();
  const slug = workspaceSlug || params.slug;
  const threadSlug = workspaceThreadSlug ?? params.threadSlug ?? null;
  const tooltipRef = useRef<any>(null);
  const menuRef = useRef<any>(null);
  const buttonRef = useRef<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    document: parsedFiles,
    isLoading,
    refresh,
  } = useDocument(slug, threadSlug);

  const files = parsedFiles?.files || [];
  const currentTokens = parsedFiles?.currentContextTokenCount || 0;
  const contextWindow = parsedFiles?.contextWindow || Infinity;

  useEffect(() => {
    setShowTooltip(files.length > 0);
  }, [files]);

  /**
   * Handles the removal of an attachment from the parsed files
   * and triggers a re-fetch of the parsed files.
   * This function handles when the user clicks the X on an Attachment via the AttachmentManager
   * so we need to sync the state in the ParsedFilesMenu picker here.
   */
  async function handleRemoveAttachment(e) {
    const { document } = e.detail;
    await Workspace.deleteParsedFiles(slug, [document.id]);
    refresh();
  }

  /**
   * Toggles the attach-source dropdown menu.
   * @param {MouseEvent} e - The click event.
   * @returns {void}
   */
  function handleClick(e) {
    e?.target?.blur();
    if (!showMenu && buttonRef.current) {
      const rect = (buttonRef.current as HTMLElement).getBoundingClientRect();
      setMenuPos({ top: rect.top, left: rect.left });
    }
    setShowMenu((prev) => !prev);
    return;
  }

  /**
   * Triggers the hidden local file uploader (DnD input).
   * Shows a warning toast if the document processor is offline.
   * @returns {void}
   */
  function triggerLocalUpload() {
    const input = document?.getElementById(
      "dnd-chat-file-uploader",
    ) as HTMLInputElement | null;
    if (input?.disabled) {
      showToast(t("dndWrapper.processorOffline"), "error");
      return;
    }
    input?.click();
  }

  useEffect(() => {
    window.addEventListener(ATTACHMENTS_PROCESSED_EVENT, refresh);
    window.addEventListener(REMOVE_ATTACHMENT_EVENT, handleRemoveAttachment);
    return () => {
      window.removeEventListener(ATTACHMENTS_PROCESSED_EVENT, refresh);
      window.removeEventListener(
        REMOVE_ATTACHMENT_EVENT,
        handleRemoveAttachment,
      );
    };
  }, [slug, threadSlug, refresh]);

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        id="attach-item-btn"
        data-tooltip-id={
          showTooltip ? "tooltip-attach-item-btn" : "attach-item-btn"
        }
        data-tooltip-content={
          !showTooltip
            ? t("chat_window.attach_file")
            : t("chat_window.attach_active_context", { count: files.length })
        }
        aria-label={t("chat_window.attach_file")}
        aria-expanded={showMenu}
        data-testid="attach-item-trigger"
        type="button"
        onClick={handleClick}
        onPointerEnter={refresh}
        className="group border border-transparent relative flex h-11 w-11 items-center justify-center cursor-pointer rounded-full transition-colors duration-150 hover:bg-white/[0.04] light:hover:bg-zinc-100 hover:border-white/[0.06] light:hover:border-zinc-200 md:h-6 md:w-6"
      >
        <div className="relative">
          <Plus
            size={16}
            className="pointer-events-none text-[#a1a1aa] light:text-zinc-600 group-hover:text-[#e4e4e7] light:group-hover:text-zinc-900 shrink-0"
            weight="bold"
          />
          {files.length > 0 && (
            <div className="absolute -top-2.5 -right-2 bg-white text-black light:invert text-[8px] rounded-full px-1 flex items-center justify-center">
              {files.length}
            </div>
          )}
        </div>
      </button>
      {showTooltip && (
        <Tooltip
          ref={tooltipRef}
          id="tooltip-attach-item-btn"
          place="top"
          opacity={1}
          clickable={!isEmbedding}
          delayShow={300}
          delayHide={isEmbedding ? 999999 : 800} // Prevent tooltip from hiding during embedding
          arrowColor={
            theme === "light"
              ? "var(--theme-modal-border)"
              : "var(--theme-bg-primary)"
          }
          className="z-[99] !w-[min(400px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !bg-theme-bg-primary !px-[5px] !rounded-lg !pointer-events-auto light:border-2 light:border-theme-modal-border"
        >
          <ParsedFilesMenu
            onEmbeddingChange={setIsEmbedding}
            tooltipRef={tooltipRef}
            isLoading={isLoading}
            files={files}
            currentTokens={currentTokens}
            contextWindow={contextWindow}
            workspaceSlug={slug}
            threadSlug={threadSlug}
            refresh={refresh}
          />
        </Tooltip>
      )}
      {showMenu &&
        menuPos !== null &&
        createPortal(
          <>
            {/* Backdrop to close menu on outside click */}
            <div
              className="fixed inset-0 z-[999]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowMenu(false)}
            />
            <div
              ref={menuRef}
              style={{
                "--attach-bottom": `calc(100vh - ${menuPos.top}px + 8px)`,
                "--attach-left": `${menuPos.left}px`,
              }}
              className="fixed bottom-[var(--attach-bottom)] left-[max(12px,var(--attach-left))] z-[1000] max-w-[calc(100vw-24px)] rounded-xl border border-white/[0.07] bg-theme-bg-secondary p-0 shadow-2xl shadow-black/50 light:border-zinc-200 light:bg-white md:left-[var(--attach-left)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <AddSourceMenu
                workspaceSlug={slug}
                threadSlug={threadSlug}
                onClose={() => setShowMenu(false)}
                onAddLocalFiles={triggerLocalUpload}
              />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
