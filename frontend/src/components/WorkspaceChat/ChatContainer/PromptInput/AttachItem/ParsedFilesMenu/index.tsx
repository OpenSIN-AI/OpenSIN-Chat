// SPDX-License-Identifier: MIT
import { useState } from "react";
import { X, CircleNotch, Warning } from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import { nFormatter } from "@/utils/numbers";
import showToast from "@/utils/toast";
import { PARSED_FILE_ATTACHMENT_REMOVED_EVENT } from "../../../DnDWrapper";
import useUser from "@/hooks/useUser";
import { useTranslation } from "react-i18next";

export default function ParsedFilesMenu({
  onEmbeddingChange,
  tooltipRef,
  files,
  currentTokens,
  contextWindow,
  isLoading,
  workspaceSlug,
  threadSlug = null,
  refresh,
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const canEmbed = !user || user.role !== "default";
  const initialContextWindowLimitExceeded =
    contextWindow &&
    currentTokens >= contextWindow * Workspace.maxContextWindowLimit;
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embedProgress, setEmbedProgress] = useState(1);
  const [contextWindowLimitExceeded, setContextWindowLimitExceeded] = useState(
    initialContextWindowLimitExceeded,
  );

  async function handleRemove(e, file) {
    e.preventDefault();
    e.stopPropagation();
    if (!file?.id) return;

    const success = await Workspace.deleteParsedFiles(workspaceSlug, [file.id]);
    if (!success) return;

    window.dispatchEvent(
      new CustomEvent(PARSED_FILE_ATTACHMENT_REMOVED_EVENT, {
        detail: { document: file },
      }),
    );
    await refresh();
  }

  async function handleEmbed() {
    if (!files.length) return;
    setIsEmbedding(true);
    onEmbeddingChange?.(true);
    setEmbedProgress(1);
    try {
      let completed = 0;
      await Promise.all(
        files.map((file) =>
          Workspace.embedParsedFile(workspaceSlug, file.id).then(() => {
            completed++;
            setEmbedProgress(completed + 1);
          }),
        ),
      );
      await refresh();
      showToast(
        t("parsedFilesMenu.embedSuccess", { count: files.length }),
        "success",
      );
      tooltipRef?.current?.close();
    } catch (error) {
      console.error("Failed to embed files:", error);
      showToast(t("parsedFilesMenu.embedFailed"), "error");
    }
    setIsEmbedding(false);
    onEmbeddingChange?.(false);
    setEmbedProgress(1);
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-theme-text-primary">
          {t("parsedFilesMenu.currentContext", { count: files.length })}
        </div>
        <div
          {...(contextWindowLimitExceeded &&
            !canEmbed && {
              "data-tooltip-id": "context-window-limit-exceeded", // eslint-disable-line i18next/no-literal-string
              "data-tooltip-content": t("parsedFilesMenu.contextLimitTooltip"),
            })}
          className={`flex items-center gap-x-1 ${contextWindowLimitExceeded && !canEmbed ? "cursor-pointer" : ""}`}
        >
          {contextWindowLimitExceeded && (
            <Warning size={14} className="text-orange-600" />
          )}
          <div
            className={`text-xs ${contextWindowLimitExceeded ? "text-orange-600" : "text-theme-text-secondary"}`}
          >
            {/* eslint-disable i18next/no-literal-string */}
            {nFormatter(currentTokens)} /{" "}
            {contextWindow ? nFormatter(contextWindow) : "--"} tokens
            {/* eslint-enable i18next/no-literal-string */}
          </div>
        </div>
      </div>
      {contextWindowLimitExceeded && canEmbed && (
        <div className="flex flex-col gap-2 p-2 bg-theme-bg-secondary light:bg-theme-bg-primary rounded">
          <div className="flex items-start gap-2">
            <Warning
              className="flex-shrink-0 mt-1 text-yellow-500 light:text-yellow-600"
              size={16}
            />
            <div className="text-xs text-theme-text-primary">
              {t("parsedFilesMenu.contextFullWarning")}
            </div>
          </div>
          <button
            onClick={handleEmbed}
            disabled={isEmbedding}
            className="border-none disabled:opacity-50 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-primary-button hover:bg-theme-button-primary-hover text-white font-medium rounded transition-colors shadow-sm"
          >
            {isEmbedding ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                {t("parsedFilesMenu.embeddingProgress", {
                  current: embedProgress,
                  total: files.length,
                })}
              </>
            ) : (
              t("parsedFilesMenu.embedFilesButton")
            )}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
        {files.length > 0 &&
          files.map((file, i) => (
            <div
              key={i}
              className={
                "flex items-center justify-between gap-2 p-2 text-xs bg-theme-bg-secondary rounded"
              }
            >
              <div className="truncate flex-1 text-theme-text-primary">
                {file.title}
              </div>
              <button
                onClick={(e) => handleRemove(e, file)}
                className="border-none text-theme-text-secondary hover:text-theme-text-primary"
                disabled={isEmbedding}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-xs text-theme-text-secondary text-center py-2">
            <CircleNotch size={16} className="animate-spin" />
            {t("parsedFilesMenu.loading")}
          </div>
        )}
        {!isLoading && files.length === 0 && (
          <div className="text-xs text-theme-text-secondary text-center py-2">
            {t("parsedFilesMenu.noFilesFound")}
          </div>
        )}
      </div>
    </div>
  );
}
