// SPDX-License-Identifier: MIT
// Purpose: Displays persisted user and assistant messages with attachments, citations, and message actions.
// Docs: index.doc.md
import { memo, useLayoutEffect, useRef, useState } from "react";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import Actions from "./Actions";
import renderMarkdown from "@/utils/chat/markdown";
import Citations from "../Citation";
import GroundingBadge from "../GroundingBadge";
import { v4 } from "uuid";
import DOMPurify from "@/utils/chat/purify";
import { EditMessageForm, useEditMessage } from "./Actions/EditMessage";
import { useWatchDeleteMessage } from "./Actions/DeleteMessage";
import TTSMessage from "./Actions/TTSButton";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
  ThoughtBrainButton,
} from "../ThoughtContainer";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { chatQueryRefusalResponse } from "@/utils/chat";
import HistoricalOutputs from "./HistoricalOutputs";
import HistoricalClarifyingQuestions from "./HistoricalClarifyingQuestions";
import { openImageLightbox } from "@/components/ImageLightbox";

const HistoricalMessage = ({
  uuid: uuidProp,
  message,
  role,
  workspace,
  sources = [],
  attachments = [],
  error = false,
  feedbackScore = null,
  chatId = null,
  isLastMessage = false,
  regenerateMessage,
  saveEditedMessage,
  forkThread,
  metrics = {},
  outputs = [],
  clarifyingQuestions = [],
}: any) => {
  // Freeze uuid on first render. User messages arrive without a uuid and this value
  // is used as the wrapper div's `key` — a default param fallback would regenerate
  // on every render and remount the subtree, wiping TruncatableContent state.
  const [uuid] = useState(() => uuidProp ?? v4());
  const { t } = useTranslation();
  const { isEditing } = useEditMessage({ chatId, role });
  const { isDeleted, completeDelete, onEndAnimation } = useWatchDeleteMessage({
    chatId,
    role,
    workspaceSlug: workspace?.slug,
  });
  const adjustTextArea: any = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const isRefusalMessage =
    role === "assistant" && message === chatQueryRefusalResponse(workspace);
  const thoughtChainContent =
    role === "assistant" ? getThoughtChainContent(message) : null;

  if (completeDelete) return null;

  if (!!error) {
    return (
      <div key={uuid} className="flex justify-start w-full">
        <div className="py-1.5 pl-0 pr-4 flex flex-col md:max-w-[80%]">
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/[0.08] text-red-400">
            <span className="inline-flex items-center gap-x-1.5 text-sm font-medium">
              <Warning className="h-4 w-4 inline-block" />
              {t("common.couldNotRespond")}
            </span>
            <p className="text-xs font-mono mt-2 border-l-2 border-red-500/40 pl-2.5 py-1.5 bg-red-500/[0.06] rounded-sm text-red-300/90">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (role === "user") {
    if (isEditing) {
      return (
        <div key={uuid} className="flex justify-end w-full py-2.5">
          <div className="max-w-[80%]">
            <EditMessageForm
              role={role}
              chatId={chatId}
              message={message}
              attachments={attachments}
              adjustTextArea={adjustTextArea}
              saveChanges={saveEditedMessage}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        key={uuid}
        onAnimationEnd={onEndAnimation}
        className={`${isDeleted ? "animate-remove" : ""} group flex w-full justify-end py-3`}
      >
        <div className="flex max-w-[88%] flex-col items-end sm:max-w-[80%]">
          <div className="rounded-2xl rounded-br-md border border-[var(--chat-border)] bg-[var(--chat-user-bubble)] px-4 py-2.5 text-[var(--chat-text)] [&_p]:m-0">
            <TruncatableContent>
              <RenderChatContent
                role={role}
                message={message}
                messageId={uuid}
              />
              <ChatAttachments attachments={attachments} />
            </TruncatableContent>
          </div>
          <Actions
            message={message}
            feedbackScore={feedbackScore}
            chatId={chatId}
            slug={workspace?.slug}
            isLastMessage={isLastMessage}
            regenerateMessage={regenerateMessage}
            isEditing={isEditing}
            role={role}
            forkThread={forkThread}
            metrics={metrics}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      key={uuid}
      onAnimationEnd={onEndAnimation}
      className={`${isDeleted ? "animate-remove" : ""} group flex w-full justify-start py-4`}
    >
      <div className="flex w-full flex-col">
        {isEditing ? (
          <EditMessageForm
            role={role}
            chatId={chatId}
            message={message}
            attachments={attachments}
            adjustTextArea={adjustTextArea}
            saveChanges={saveEditedMessage}
          />
        ) : (
          <div className="break-words">
            <HistoricalClarifyingQuestions surveys={clarifyingQuestions} />
            {/* Thought chain content — only visible when the brain icon is toggled. */}
            {thoughtChainContent && (
              <ThoughtChainComponent
                content={thoughtChainContent}
                messageId={uuid}
              />
            )}
            {/* Brain icon + message side by side */}
            <div className="flex items-start gap-x-1.5">
              {thoughtChainContent && (
                <ThoughtBrainButton
                  messageId={uuid}
                  content={thoughtChainContent}
                />
              )}
              <div className="flex-1 min-w-0">
                <RenderChatContent
                  role={role}
                  message={message}
                  messageId={uuid}
                />
              </div>
            </div>
            {isRefusalMessage && (
              <Link
                data-tooltip-id="query-refusal-info"
                data-tooltip-content={`${t("chat.refusal.tooltip-description")}`}
                className="!no-underline group !flex w-fit"
                to={paths.chatModes()}
                target="_blank"
              >
                <div className="flex flex-row items-center gap-x-1 group-hover:opacity-100 opacity-60 w-fit">
                  <Info className="text-theme-text-secondary" />
                  <p className="!m-0 !p-0 text-theme-text-secondary !no-underline text-xs cursor-pointer">
                    {t("chat.refusal.tooltip-title")}
                  </p>
                </div>
              </Link>
            )}
            <ChatAttachments attachments={attachments} />
            <HistoricalOutputs outputs={outputs} />
          </div>
        )}
        <div className="flex items-start md:items-center gap-x-1">
          <Actions
            message={message}
            feedbackScore={feedbackScore}
            chatId={chatId}
            slug={workspace?.slug}
            isLastMessage={isLastMessage}
            regenerateMessage={regenerateMessage}
            isEditing={isEditing}
            role={role}
            forkThread={forkThread}
            metrics={metrics}
            ttsButton={
              chatId && role !== "user" ? (
                <TTSMessage
                  slug={workspace?.slug}
                  chatId={chatId}
                  message={
                    // Strip thought/thinking blocks so TTS only speaks the final answer.
                    // Mirrors the logic in RenderChatContent and messageToSpeech.js.
                    (() => {
                      if (!message) return message;
                      let ttsMessage = message;
                      // Remove complete thought blocks entirely.
                      ttsMessage = ttsMessage.replace(
                        THOUGHT_REGEX_COMPLETE,
                        "",
                      );
                      // If an unclosed opening tag remains, strip it and everything after.
                      if (
                        ttsMessage.match(THOUGHT_REGEX_OPEN) &&
                        !ttsMessage.match(THOUGHT_REGEX_CLOSE)
                      ) {
                        ttsMessage = ttsMessage.replace(THOUGHT_REGEX_OPEN, "");
                      }
                      // Strip <response>/<answer> wrapper tags but keep their content.
                      ttsMessage = ttsMessage
                        .replace(/<\/?(response|answer)\s*(?:[^>]*?)?>/gi, " ")
                        .trim();
                      return ttsMessage;
                    })()
                  }
                />
              ) : null
            }
          />
        </div>
        {role === "assistant" && <GroundingBadge sources={sources} />}
        {role === "assistant" && <Citations sources={sources} />}
      </div>
    </div>
  );
};

export default memo(
  HistoricalMessage,
  (prevProps, nextProps) =>
    prevProps.uuid === nextProps.uuid &&
    prevProps.chatId === nextProps.chatId &&
    prevProps.message === nextProps.message &&
    prevProps.error === nextProps.error &&
    prevProps.sources === nextProps.sources &&
    prevProps.attachments === nextProps.attachments &&
    prevProps.isLastMessage === nextProps.isLastMessage &&
    prevProps.feedbackScore === nextProps.feedbackScore &&
    prevProps.outputs === nextProps.outputs &&
    prevProps.clarifyingQuestions === nextProps.clarifyingQuestions,
);

function getThoughtChainContent(message: string | null | undefined) {
  if (!message) return null;
  if (message.match(THOUGHT_REGEX_COMPLETE)) {
    return message.match(THOUGHT_REGEX_COMPLETE)?.[0] ?? null;
  }
  if (
    message.match(THOUGHT_REGEX_OPEN) &&
    !message.match(THOUGHT_REGEX_CLOSE)
  ) {
    return message;
  }
  return null;
}

/**
 * Currently only renders image attachments as clickable thumbnails that open in the lightbox.
 * Other attachment types may be supported here in the future.
 */
function ChatAttachments({ attachments = [] }: any) {
  const { t } = useTranslation();
  const imageAttachments = (attachments as any).filter(
    (item: any) =>
      item?.contentString &&
      (!item?.mime || item.mime.toLowerCase().startsWith("image/")),
  );
  if (!imageAttachments.length) return null;
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      {imageAttachments.map((item, index) => (
        <button
          type="button"
          key={`${item.name}-${index}`}
          aria-label={item.name || t("chat_window.source", "Source")}
          onClick={() => openImageLightbox(imageAttachments, index)}
          className="p-0 border-none bg-transparent cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            alt={`Attachment: ${item.name}`}
            src={item.contentString}
            className="w-[120px] h-[120px] object-cover rounded-lg"
          />
        </button>
      ))}
    </div>
  );
}

function TruncatableContent({ children }: any) {
  const contentRef = useRef<any>(null);
  const [isExpanded, setIsExpanded] = useState(false as any);
  const [isOverflowing, setIsOverflowing] = useState(false as any);
  const { t } = useTranslation();

  // useLayoutEffect (not useEffect) so collapse applies before paint — avoids a
  // one-frame flash of uncollapsed content on mount.
  useLayoutEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > 250);
    }
  }, []);

  const showTruncation = !isExpanded && isOverflowing;

  return (
    <>
      <div className="relative">
        <div
          ref={contentRef}
          className={`text-[var(--chat-text)] ${showTruncation ? "max-h-[250px] overflow-hidden" : ""}`}
        >
          {children}
        </div>
        {showTruncation && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 border-b border-[var(--chat-border)] bg-[var(--chat-user-bubble)]/90" />
        )}
      </div>
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={
            isExpanded
              ? t("common.collapse", "Collapse")
              : t("common.expand", "Expand")
          }
          aria-expanded={isExpanded}
          className="mt-2 text-xs font-medium leading-4 text-[var(--chat-text-muted)] hover:text-[var(--chat-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-focus-ring)]"
        >
          {isExpanded ? t("chat_window.see_less") : t("chat_window.see_more")}
        </button>
      )}
    </>
  );
}

const RenderChatContent = memo(
  ({ role, message }: any) => {
    // If the message is not from the assistant, we can render it directly
    // as normal since the user cannot think (lol)
    if (role !== "assistant")
      return (
        <span
          className="markdown flex flex-col gap-y-0.5 leading-relaxed text-[var(--chat-text)]"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(message)),
          }}
        />
      );
    let msgToRender = message;
    if (!message) return null;

    // If the message is a perfect thought chain, we can render it directly
    // Complete == open and close tags match perfectly.
    if (message.match(THOUGHT_REGEX_COMPLETE)) {
      msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");
    }

    // If the message is a thought chain but not a complete thought chain (matching opening tags but not closing tags),
    // we can render it as a thought chain if we can at least find a closing tag
    // This can occur when the assistant starts with <thinking> and then <response>'s later.
    if (
      message.match(THOUGHT_REGEX_OPEN) &&
      !message.match(THOUGHT_REGEX_CLOSE)
    ) {
      msgToRender = "";
    }

    return (
      <>
        <span
          className="markdown flex flex-col gap-y-0.5 leading-relaxed text-[var(--chat-text)]"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(msgToRender)),
          }}
        />
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.role === nextProps.role &&
      prevProps.message === nextProps.message
    );
  },
);
