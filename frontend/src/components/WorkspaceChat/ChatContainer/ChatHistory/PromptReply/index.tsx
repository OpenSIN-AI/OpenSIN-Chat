// SPDX-License-Identifier: MIT

import { memo, useRef, useEffect } from "react";
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
    "button",
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
  sources = [],
}: any) => {
  const { t } = useTranslation();
  if (!reply && sources.length === 0 && !pending && !error) return null;

  if (pending) {
    return (
      <div className="flex justify-start w-full py-2.5">
        <div className="flex items-center w-full">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-zinc-400 light:bg-slate-400 animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-zinc-400 light:bg-slate-400 animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-zinc-400 light:bg-slate-400 animate-pulse" style={{ animationDelay: "300ms" }} />
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

  // Update the ThoughtChainComponent imperatively when the message changes.
  // The rendered markdown content is computed during render (not via ref)
  // so streaming chunks appear immediately without a one-render lag.
  useEffect(() => {
    if (!message) return;
    const thinking =
      message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

    if (thinking && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(message);
      return;
    }

    const completeThoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
    if (completeThoughtChain && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(completeThoughtChain);
    }
  }, [message]);

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
