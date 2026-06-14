// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Trash } from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import { useParams } from "react-router-dom";
import { invalidateChatHistory } from "@/hooks/useChatHistory";
import {
  useMessageActionsContext,
  DELETE_EVENT,
} from "@/components/WorkspaceChat/ChatContainer/ChatHistory/MessageActionsContext";

export function useWatchDeleteMessage({
  chatId = null,
  role = "user",
  workspaceSlug = null,
}) {
  const context = useMessageActionsContext();
  const { threadSlug = null } = useParams();
  const [completeDelete, setCompleteDelete] = useState(false);
  const deleteCalled = useRef(false);
  const isDeleted = context?.isDeleted(chatId) ?? false;

  useEffect(() => {
    if (isDeleted && !deleteCalled.current) {
      deleteCalled.current = true;
      if (role === "assistant") {
        Workspace.deleteChat(chatId).then(() => {
          invalidateChatHistory(workspaceSlug, threadSlug);
        });
      }
    }
  }, [isDeleted, chatId, role, workspaceSlug, threadSlug]);

  function onEndAnimation() {
    if (!isDeleted) return;
    setCompleteDelete(true);
  }

  return { isDeleted, completeDelete, onEndAnimation };
}

export function DeleteMessage({ chatId, isEditing, role }) {
  const { t } = useTranslation();
  if (!chatId || isEditing || role === "user") return null;

  function emitDeleteEvent() {
    window.dispatchEvent(new CustomEvent(DELETE_EVENT, { detail: { chatId } }));
  }

  return (
    <button
      onClick={emitDeleteEvent}
      className="border-none flex items-center gap-x-1 w-full"
      role="menuitem"
    >
      <Trash size={21} weight="fill" />
      <p>{t("common.delete")}</p>
    </button>
  );
}
