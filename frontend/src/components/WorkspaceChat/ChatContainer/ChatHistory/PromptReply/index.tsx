// SPDX-License-Identifier: MIT

import { memo, useRef, useEffect, useState } from "react";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import Citations from "../Citation";
import GroundingBadge from "../GroundingBadge";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
  ThoughtBrainButton,
} from "../ThoughtContainer";

const MARKDOWN_SANITIZE_OPTS = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "i",
    "u",
    "strong",
    "em",
    "br",
    "p",
    "span",
    "div",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
    "hr",
    "svg",
    "path",
    "rect",
    "polyline",
    "think",
    "thinking",
    "thought",
    "thought_chain",
    "think_chain",
    "response",
    "answer",
  ],
};
const safeMarkdown = (html) => DOMPurify.sanitize(html, MARKDOWN_SANITIZE_OPTS);

const PromptReply: any = ({
  uuid,
  reply,
  pending,
  error,
  errorId = null,
  sources = [],
}: any) => {
  const { t } = useTranslation();
  if (!reply && sources.length === 0 && !pending && !error) return null;

  if (pending) {
    return (
      <div className="flex justify-start w-full py-2.5">
        <div className="flex items-center w-full">
          <div className="flex items-center gap-1.5 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 light:bg-slate-400 animate-pulse [animation-delay:0ms]" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 light:bg-slate-400 animate-pulse [animation-delay:200ms]" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 light:bg-slate-400 animate-pulse [animation-delay:400ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-start w-full py-2.5">
        <div className="flex flex-col md:max-w-[85%] w-full">
          <span className="inline-block p-2 rounded-lg bg-red-50 text-red-500">
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

  return (
    <div key={uuid} className="flex justify-start w-full py-2.5">
      <div className="flex flex-col w-full md:max-w-[85%]">
        <RenderAssistantChatContent
          key={`${uuid}-prompt-reply-content`}
          message={reply}
          messageId={uuid}
        />
        <GroundingBadge sources={sources} />
        <Citations sources={sources} />
      </div>
    </div>
  );
};

function RenderAssistantChatContent({ message, messageId }: any) {
  const thoughtChainRef = useRef(null);
  const [pendingThoughtContent, setPendingThoughtContent] = useState<
    string | null
  >(null);

  // Update the ThoughtChainComponent imperatively when the message changes.
  // The rendered markdown content is computed during render (not via ref)
  // so streaming chunks appear immediately without a one-render lag.
  // If the ref is null (component between render states), stash the content
  // in state so it can be applied once the ref becomes available.
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

    // Ref not ready yet — preserve content for when it mounts
    if (contentToUpdate) {
      setPendingThoughtContent(contentToUpdate);
    }
  }, [message]);

  // Apply pending thought content once the ref becomes available
  useEffect(() => {
    if (pendingThoughtContent && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(pendingThoughtContent);
      setPendingThoughtContent(null);
    }
  }, [pendingThoughtContent]);

  // Guard: when reply is undefined but sources exist, parent falls through
  // to this component — without a guard, message.match() below throws.
  if (!message) return null;

  const thinking =
    message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

  // Compute rendered content during render so streaming is real-time
  const completeThoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
  const msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");

  // Determine thought chain content for the brain button
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
          <div className="dot-falling light:invert" />
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
          className="flex-1 min-w-0 break-words"
          dangerouslySetInnerHTML={{
            __html: safeMarkdown(renderMarkdown(msgToRender)),
          }}
        />
      </div>
    </div>
  );
}

export default memo(PromptReply) as any;
