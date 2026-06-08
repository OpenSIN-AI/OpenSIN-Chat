// SPDX-License-Identifier: MIT
import { Plus } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Workspace from "@/models/workspace";
import {
  ATTACHMENTS_PROCESSED_EVENT,
  REMOVE_ATTACHMENT_EVENT,
} from "../../DnDWrapper";
import { useTheme } from "@/hooks/useTheme";
import ParsedFilesMenu from "./ParsedFilesMenu";
import AddSourceMenu from "./AddSourceMenu";

/**
 * This is a simple proxy component that clicks on the DnD file uploader for the user.
 * @returns
 */
export default function AttachItem({
  workspaceSlug = null, workspaceThreadSlug = null, }: any): JSX.Element {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const params = useParams();
  const slug = workspaceSlug || params.slug;
  const threadSlug = workspaceThreadSlug ?? params.threadSlug ?? null;
  const tooltipRef = useRef(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [files, setFiles] = useState([]);
  const [currentTokens, setCurrentTokens] = useState(0);
  const [contextWindow, setContextWindow] = useState(Infinity);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFiles = () => {
    if (!slug) return;
    if (isEmbedding) return;
    setIsLoading(true);
    Workspace.getParsedFiles(slug, threadSlug)
      .then(({ files, contextWindow, currentContextTokenCount }) => {
        setFiles(files);
        setShowTooltip(files.length > 0);
        setContextWindow(contextWindow);
        setCurrentTokens(currentContextTokenCount);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Handles the removal of an attachment from the parsed files
   * and triggers a re-fetch of the parsed files.
   * This function handles when the user clicks the X on an Attachment via the AttachmentManager
   * so we need to sync the state in the ParsedFilesMenu picker here.
   */
  async function handleRemoveAttachment(e: any) {
    const { document } = e.detail;
    await Workspace.deleteParsedFiles(slug, [document.id]);
    fetchFiles();
  }

  /**
   * Toggles the attach-source dropdown menu.
   * @param {MouseEvent} e - The click event.
   * @returns {void}
   */
  function handleClick(e: any): JSX.Element {
    e?.target?.blur();
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
    if (!showMenu) return;
    function handleClickOutside(e: any): JSX.Element {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    fetchFiles();
    window.addEventListener(ATTACHMENTS_PROCESSED_EVENT, fetchFiles);
    window.addEventListener(REMOVE_ATTACHMENT_EVENT, handleRemoveAttachment);
    return () => {
      window.removeEventListener(ATTACHMENTS_PROCESSED_EVENT, fetchFiles);
      window.removeEventListener(
        REMOVE_ATTACHMENT_EVENT,
        handleRemoveAttachment,
      );
    };
  }, [slug, threadSlug]);

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
        type="button"
        onClick={handleClick}
        onPointerEnter={fetchFiles}
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
            setFiles={setFiles}
            currentTokens={currentTokens}
            setCurrentTokens={setCurrentTokens}
            contextWindow={contextWindow}
            workspaceSlug={slug}
            threadSlug={threadSlug}
          />
        </Tooltip>
      )}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-300 rounded-lg shadow-lg z-50 p-1"
        >
          <AddSourceMenu
            workspaceSlug={slug}
            onClose={() => setShowMenu(false)}
            onAddLocalFiles={triggerLocalUpload}
          />
        </div>
      )}
    </div>
  );
}
