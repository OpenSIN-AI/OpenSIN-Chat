// SPDX-License-Identifier: MIT
import { Plus } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import Workspace from "@/models/workspace";
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
  const tooltipRef = useRef(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
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
   * @returns {void}
   */
  function triggerLocalUpload() {
    document?.getElementById("dnd-chat-file-uploader")?.click();
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
          !showTooltip ? t("chat_window.attach_file") : undefined
        }
        aria-label={t("chat_window.attach_file")}
        aria-expanded={showMenu}
        data-testid="attach-item-trigger"
        type="button"
        onClick={handleClick}
        onPointerEnter={refresh}
        className="group border-none relative flex justify-center items-center cursor-pointer w-6 h-6 rounded-full hover:bg-zinc-700 light:hover:bg-slate-200"
      >
        <div className="relative">
          <Plus
            size={18}
            className="pointer-events-none text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-600 shrink-0"
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
          className="z-99 !w-[400px] !bg-theme-bg-primary !px-[5px] !rounded-lg !pointer-events-auto light:border-2 light:border-theme-modal-border"
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
                position: "fixed",
                bottom: `calc(100vh - ${menuPos.top}px + 8px)`,
                left: menuPos.left,
              }}
              className="bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-300 rounded-lg shadow-lg z-[1000] p-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <AddSourceMenu
                workspaceSlug={slug}
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
