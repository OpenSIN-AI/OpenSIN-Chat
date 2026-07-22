// SPDX-License-Identifier: MIT
// Purpose: Renders the live streamed assistant reply and its transient activity state.
// Docs: index.doc.md

import { memo, useRef, useEffect, useState } from "react";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import ChunkCitationPopoverManager from "../Citation/ChunkCitation";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
  ThoughtBrainButton,
} from "../ThoughtContainer";
import AssistantMessageShell from "@/features/messages/AssistantMessageShell";
import AssistantMessageActions from "@/features/messages/AssistantMessageActions";
import AnswerSources from "@/features/citations/AnswerSources";

const MARKDOWN_SANITIZE_OPTS = {
  ALLOWED_TAGS: [
    "a", "b", "i", "u", "strong", "em", "br", "p", "span", "sup", "div",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "th", "td",
    "img", "hr", "svg", "path", "rect", "polyline",
    "think", "thinking", "thought", "thought_chain", "think_chain",
    "response", "answer",
  ],
};
const safeMarkdown = (html) => DOMPurify.sanitize(html, MARKDOWN_SANITIZE_OPTS);

function preprocessInlineCitations(markdown: string): string {
  return markdown.replace(
    /\[source:(\d+)\]/g,
    (_m, n) =>
      `<sup><a href="#citation-${n}" class="inline-citation" data-citation-index="${n}">[${n}]</a></sup>`,
  );
}

export function stripInlineCitations(text: string): string {
  return text.replace(/\[source:\d+\]/g, "");
}

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

const PromptReply: any = ({
  uuid,
  reply,
  pending,
  error,
  errorId = null,
  sources = [],
  notebookMode = "chat",
}: any) => {
  const { t } = useTranslation();
  if (!reply && sources.length === 0 && !pending && !error) return null;

  if (pending) {
    return (
      <div className="flex min-h-14 w-full justify-start py-4">
        <AssistantActivity label={t("statusResponse.thinking")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-start w-full py-2.5">
        <div className="flex flex-col md:max-w-[85%] w-full">
          <span className="inline-block p-2 rounded-lg bg-red-500/[0.08] text-red-400">
            <Warning className="h-4 w-4 mb-1 inline-block" />{" "}
            {t("promptReply.couldNotRespond")}
            <span className="text-xs">
              {t("promptReply.reason", {
                reason: error || t("promptReply.unknown"),
              })}
            </span>
            {errorId ? (
              <span className="block mt-1 text-xs opacity-75 select-all font-mono">
                {t("promptReply.errorId", { id: errorId })}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    );
  }

  const cleanedReply = stripThoughtContent(reply);

  return (
    <div key={uuid} className="flex min-h-14 w-full justify-start py-4">
      <AssistantMessageShell
        mode={notebookMode}
        streaming={Boolean(pending)}
        citations={
          sources.length > 0 ? (
            <AnswerSources sources={sources} />
          ) : null
        }
        actions={
          <AssistantMessageActions
            message={cleanedReply}
            disabled={Boolean(pending)}
          />
        }
      >
        <RenderAssistantChatContent
          key={`${uuid}-prompt-reply-content`}
          message={reply}
          messageId={uuid}
        />
        {sources.length > 0 && (
          <ChunkCitationPopoverManager sources={sources} messageId={uuid} />
        )}
      </AssistantMessageShell>
    </div>
  );
};

function RenderAssistantChatContent({ message, messageId }: any) {
  const { t } = useTranslation();
  const thoughtChainRef = useRef<any>(null);
  const [pendingThoughtContent, setPendingThoughtContent] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const thinking =
      message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

    const contentToUpdate = thinking
      ? message
      : (message.match(THOUGHT_REGEX_COMPLETE)?.[0] ?? null);

    if (contentToUpdate && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(contentToUpdate);
      setPendingThoughtContent(null);
      return;
    }

    if (contentToUpdate) {
      setPendingThoughtContent(contentToUpdate);
    }
  }, [message]);

  useEffect(() => {
    if (pendingThoughtContent && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(pendingThoughtContent);
      setPendingThoughtContent(null);
    }
  }, [pendingThoughtContent]);

  if (!message) return null;

  const thinking =
    message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

  const completeThoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
  const msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");

  const thoughtChainContent = thinking
    ? message
    : (completeThoughtChain ?? null);

  if (thinking)
    return (
      <div className="flex flex-col gap-y-0.5">
        <ThoughtChainComponent
          ref={thoughtChainRef}
          content=""
          messageId={messageId}
          defaultExpanded={true}
        />
        <div className="flex items-center gap-x-1.5">
          <ThoughtBrainButton
            messageId={messageId}
            content={message}
            className="mt-0"
          />
          <AssistantActivity label={t("statusResponse.thinking")} compact />
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-y-0.5">
      {thoughtChainContent && (
        <ThoughtChainComponent
          ref={thoughtChainRef}
          content=""
          messageId={messageId}
        />
      )}
      <div className="flex items-start gap-x-1.5">
        {thoughtChainContent && (
          <ThoughtBrainButton
            messageId={messageId}
            content={thoughtChainContent}
          />
        )}
        <span
          className="assistant-markdown min-w-0 flex-1 break-words leading-relaxed text-[var(--chat-text)]"
          dangerouslySetInnerHTML={{
            __html: safeMarkdown(
              renderMarkdown(preprocessInlineCitations(msgToRender)),
            ),
          }}
        />
      </div>
    </div>
  );
}

function AssistantActivity({ label, compact = false }: any) {
  return (
    <div
      className={`flex items-center text-sm ${compact ? "" : "px-0.5"}`}
      role="status"
      aria-live="polite"
    >
      <span className="thinking-shimmer font-medium">{label}</span>
    </div>
  );
}

export default memo(PromptReply) as any;
