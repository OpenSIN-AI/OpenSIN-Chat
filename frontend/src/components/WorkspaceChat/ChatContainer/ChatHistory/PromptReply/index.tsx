// SPDX-License-Identifier: MIT
/* eslint-disable react-hooks/refs */
import { memo, useRef, useEffect } from "react";
import { Warning } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import Citations from "../Citation";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
  ThoughtBrainButton,
} from "../ThoughtContainer";

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
      <div className="flex justify-start w-full">
        <div className="py-1.5 pl-0 pr-4 flex flex-col md:max-w-[80%]">
          <div className="mt-2 ml-1 dot-falling light:invert"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-start w-full">
        <div className="py-1.5 pl-0 pr-4 flex flex-col md:max-w-[80%]">
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
    <div key={uuid} className="flex justify-start w-full">
      <div className="py-1.5 pl-0 pr-4 flex flex-col w-full">
        <RenderAssistantChatContent
          key={`${uuid}-prompt-reply-content`}
          message={reply}
          messageId={uuid}
        />
        <Citations sources={sources} />
      </div>
    </div>
  );
};

function RenderAssistantChatContent({ message, messageId }: any) {
  const contentRef = useRef("");
  const thoughtChainRef = useRef(null);

  // Guard: when reply is undefined but sources exist, parent falls through
  // to this component — without a guard, message.match() below throws.
  if (!message) return null;

  useEffect(() => {
    const thinking =
      message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

    if (thinking && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(message);
      return;
    }

    const completeThoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
    const msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");

    if (completeThoughtChain && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(completeThoughtChain);
    }

    contentRef.current = msgToRender;
  }, [message]);

  const thinking =
    message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

  // Determine thought chain content for the brain button
  const thoughtChainContent = thinking
    ? message
    : (message.match(THOUGHT_REGEX_COMPLETE)?.[0] ?? null);

  if (thinking)
    return (
      <div className="flex flex-col gap-y-1">
        <ThoughtChainComponent
          ref={thoughtChainRef}
          content=""
          messageId={messageId}
        />
        <div className="flex items-start gap-x-1.5">
          <ThoughtBrainButton messageId={messageId} content={message} />
          <div className="mt-3 ml-1 dot-falling light:invert" />
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-y-1">
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
            __html: DOMPurify.sanitize(renderMarkdown(contentRef.current)),
          }}
        />
      </div>
    </div>
  );
}

export default memo(PromptReply);
