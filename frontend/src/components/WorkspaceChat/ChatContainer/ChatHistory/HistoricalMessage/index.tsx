// SPDX-License-Identifier: MIT
// Purpose: Displays persisted user and assistant messages with attachments, citations, and message actions.
// Docs: index.doc.md
import { memo, useLayoutEffect, useRef, useState } from "react";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import Actions from "./Actions";
import renderMarkdown from "@/utils/chat/markdown";
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
import { Link } from "react-router";
import { chatQueryRefusalResponse } from "@/utils/chat";
import HistoricalOutputs from "./HistoricalOutputs";
import HistoricalClarifyingQuestions from "./HistoricalClarifyingQuestions";
import { openImageLightbox } from "@/components/ImageLightbox";
import AssistantMessageShell from "@/features/messages/AssistantMessageShell";
import AssistantMessageActions from "@/features/messages/AssistantMessageActions";
import AnswerSources from "@/features/citations/AnswerSources";
import CitedMarkdown from "@/features/citations/CitedMarkdown";
import type { NotebookModeId } from "@/features/notebook/modes";

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
  notebookMode = "chat",
  workDetails = [],
}: any) => {
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

  if (
    role === "assistant" &&
    !message &&
    !error &&
    !sources?.length &&
    !attachments?.length &&
    !outputs?.length &&
    !clarifyingQuestions?.length
  ) {
    return null;
  }

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
        <div className="flex max-w-[90%] flex-col items-end sm:max-w-[75%]">
          <div className="rounded-[18px] rounded-br-[6px] bg-[var(--chat-user-bubble)] px-4 py-2.5 shadow-sm text-[var(--chat-text)] [&_p]:m-0">
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

  // Assistant message
  const cleanedMessage = stripThoughtContent(message);

  function strippedTtsMessage() {
    if (!message) return message;
    let ttsMessage = message;
    ttsMessage = ttsMessage.replace(THOUGHT_REGEX_COMPLETE, "");
    if (
      ttsMessage.match(THOUGHT_REGEX_OPEN) &&
      !ttsMessage.match(THOUGHT_REGEX_CLOSE)
    ) {
      ttsMessage = ttsMessage.replace(THOUGHT_REGEX_OPEN, "");
    }
    ttsMessage = ttsMessage
      .replace(/<\/?(response|answer)\s*(?:[^>]*?)?>/gi, " ")
      .trim();
    return ttsMessage;
  }

  return (
    <div
      key={uuid}
      onAnimationEnd={onEndAnimation}
      className={`${isDeleted ? "animate-remove" : ""} flex w-full justify-start py-5`}
    >
      {isEditing ? (
        <div className="w-full">
          <EditMessageForm
            role={role}
            chatId={chatId}
            message={message}
            attachments={attachments}
            adjustTextArea={adjustTextArea}
            saveChanges={saveEditedMessage}
          />
        </div>
      ) : (
        <AssistantMessageShell
          mode={notebookMode as NotebookModeId}
          citations={
            sources?.length ? (
              <AnswerSources sources={sources} workspaceSlug={workspace?.slug} />
            ) : null
          }
          actions={
            <AssistantMessageActions
              message={cleanedMessage || ""}
              onRegenerate={isLastMessage ? regenerateMessage : undefined}
              readAloudButton={
                chatId ? (
                  <TTSMessage
                    slug={workspace?.slug}
                    chatId={chatId}
                    message={strippedTtsMessage()}
                  />
                ) : undefined
              }
            />
          }
        >
          <HistoricalClarifyingQuestions surveys={clarifyingQuestions} />
          {thoughtChainContent && (
            <ThoughtChainComponent content={thoughtChainContent} messageId={uuid} />
          )}
          {thoughtChainContent && (
            <ThoughtBrainButton messageId={uuid} content={thoughtChainContent} />
          )}
          <CitedMarkdown
            markdown={cleanedMessage || ""}
            sources={sources}
            workspaceSlug={workspace?.slug}
          />
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
        </AssistantMessageShell>
      )}
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
    prevProps.clarifyingQuestions === nextProps.clarifyingQuestions &&
    prevProps.notebookMode === nextProps.notebookMode,
);

function stripThoughtContent(message: string | null | undefined): string {
  if (!message) return "";
  let result = message;
  if (result.match(THOUGHT_REGEX_COMPLETE)) {
    result = result.replace(THOUGHT_REGEX_COMPLETE, "");
  }
  if (
    result.match(THOUGHT_REGEX_OPEN) &&
    !result.match(THOUGHT_REGEX_CLOSE)
  ) {
    result = result.replace(THOUGHT_REGEX_OPEN, "");
  }
  return result
    .replace(/<\/?(response|answer)\s*(?:[^>]*?)?>/gi, " ")
    .trim();
}

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

function getFileIcon(mime: string) {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return "📊";
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return "📽️";
  if (mime.includes("zip") || mime.includes("archive") || mime.includes("compressed"))
    return "📦";
  if (mime.includes("text/") || mime.includes("json") || mime.includes("xml"))
    return "📃";
  return "📎";
}

function formatFileSize(bytes: number | undefined | null): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ChatAttachments({ attachments = [] }: any) {
  const { t } = useTranslation();
  const imageAttachments = (attachments as any).filter(
    (item: any) =>
      item?.contentString &&
      (!item?.mime || item.mime.toLowerCase().startsWith("image/")),
  );
  const fileAttachments = (attachments as any).filter(
    (item: any) => !item?.contentString && item?.name,
  );
  if (!imageAttachments.length && !fileAttachments.length) return null;
  return (
    <div className="flex flex-col gap-2 mt-3">
      {fileAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fileAttachments.map((item: any, index: number) => (
            <div
              key={`${item.name}-${index}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--chat-border)] bg-[var(--chat-user-bubble)] px-3 py-2 max-w-[220px]"
              title={item.name}
            >
              <span className="text-base leading-none shrink-0" aria-hidden>
                {getFileIcon(item.mime || "")}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-[var(--chat-text)] truncate leading-tight">
                  {item.name}
                </span>
                {formatFileSize(item.size) && (
                  <span className="text-[10px] text-[var(--chat-text-muted)] leading-tight">
                    {formatFileSize(item.size)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {imageAttachments.map((item: any, index: number) => (
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
      )}
    </div>
  );
}

function TruncatableContent({ children }: any) {
  const contentRef = useRef<any>(null);
  const [isExpanded, setIsExpanded] = useState(false as any);
  const [isOverflowing, setIsOverflowing] = useState(false as any);
  const { t } = useTranslation();

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

    if (message.match(THOUGHT_REGEX_COMPLETE)) {
      msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");
    }

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
