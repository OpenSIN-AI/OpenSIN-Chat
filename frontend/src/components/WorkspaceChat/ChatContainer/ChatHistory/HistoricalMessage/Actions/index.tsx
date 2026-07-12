// SPDX-License-Identifier: MIT
/**
 * Purpose: Render hover action icons (copy, edit, regenerate, feedback, more) for a chat message.
 * Docs: Actions/index.tsx (this file)
 */
import { memo, useState } from "react";
import useCopyText from "@/hooks/useCopyText";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { ThumbsUp } from "@phosphor-icons/react/dist/csr/ThumbsUp";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import Workspace from "@/models/workspace";
import { EditMessageAction } from "./EditMessage";
import RenderMetrics from "./RenderMetrics";
import ActionMenu from "./ActionMenu";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { invalidateChatHistory } from "@/hooks/useChatHistory";
import { messageActionButtonClass } from "./MessageActionButton";

const Actions: any = ({
  message,
  feedbackScore,
  chatId,
  slug,
  isLastMessage,
  regenerateMessage,
  forkThread,
  isEditing,
  role,
  metrics = {},
  ttsButton = null,
}: any) => {
  const { t } = useTranslation();
  const { threadSlug = null } = useParams();
  const [selectedFeedback, setSelectedFeedback] = useState(feedbackScore);
  const handleFeedback = async (newFeedback) => {
    const updatedFeedback =
      selectedFeedback === newFeedback ? null : newFeedback;
    await Workspace.updateChatFeedback(chatId, slug, updatedFeedback);
    setSelectedFeedback(updatedFeedback);
    invalidateChatHistory(slug, threadSlug);
  };

  if (isEditing) return <RenderMetrics metrics={metrics} />;

  return (
    <div
      className={`mt-1 flex ${role === "user" ? "w-fit" : "w-full"} flex-wrap items-center gap-y-1 ${role === "user" ? "justify-end" : "justify-between"} md:h-auto transition-all duration-200`}
    >
      <div className="flex min-h-7 items-center gap-1 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        {ttsButton}
        <CopyMessage message={message} />
        <EditMessageAction chatId={chatId} role={role} isEditing={isEditing} />
        {isLastMessage && role !== "user" && (
          <RegenerateMessage
            regenerateMessage={regenerateMessage}
            chatId={chatId}
          />
        )}
        {chatId && role !== "user" && (
          <FeedbackButton
            isSelected={selectedFeedback === true}
            handleFeedback={() => handleFeedback(true)}
            tooltipContent={t("chat_window.good_response")}
            IconComponent={ThumbsUp}
          />
        )}
        <ActionMenu
          chatId={chatId}
          forkThread={forkThread}
          isEditing={isEditing}
          role={role}
        />
      </div>
      <RenderMetrics metrics={metrics} />
    </div>
  );
};

function FeedbackButton({
  isSelected,
  handleFeedback,
  tooltipContent,
  IconComponent,
}: any) {
  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <button
        type="button"
        onClick={handleFeedback}
        data-tooltip-id="feedback-button"
        data-tooltip-content={tooltipContent}
        className={messageActionButtonClass}
        aria-label={tooltipContent}
      >
        <IconComponent size={20} weight={isSelected ? "fill" : "regular"} />
      </button>
    </div>
  );
}

function CopyMessage({ message }: any) {
  const { copied, copyText } = useCopyText();
  const { t } = useTranslation();

  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <button
        type="button"
        onClick={() => copyText(message)}
        data-tooltip-id="copy-message-text"
        data-tooltip-content={t("chat_window.copy")}
        className={messageActionButtonClass}
        aria-label={t("chat_window.copy")}
      >
        {copied ? <Check size={20} /> : <Copy size={20} />}
      </button>
    </div>
  );
}

function RegenerateMessage({ regenerateMessage, chatId }: any) {
  const { t } = useTranslation();
  if (!chatId) return null;
  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <button
        type="button"
        onClick={() => regenerateMessage(chatId)}
        data-tooltip-id="regenerate-assistant-text"
        data-tooltip-content={t("chat_window.regenerate_response")}
        className={messageActionButtonClass}
        aria-label={t("chat_window.regenerate")}
      >
        <ArrowsClockwise size={20} weight="fill" />
      </button>
    </div>
  );
}

export default memo(Actions) as any;
