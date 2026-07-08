// SPDX-License-Identifier: MIT
import React, { memo } from "react";
import UserIcon from "../UserIcon";
import { userFromStorage } from "@/utils/request";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import type { Config as DOMPurifyConfig } from "dompurify";

const MARKDOWN_SANITIZE_OPTS: DOMPurifyConfig = {
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
const safeMarkdown = (html: string): string =>
  DOMPurify.sanitize(html, MARKDOWN_SANITIZE_OPTS);

function ChatBubble({
  message,
  type,
}: {
  message: string;
  type: string;
}) {
  const isUser = type === "user";

  return (
    <div
      className={`flex justify-center items-end w-full bg-theme-bg-secondary`}
    >
      <div className={`py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col`}>
        <div className="flex gap-x-5">
          <UserIcon
            user={{ uid: isUser ? userFromStorage()?.username : "system" }}
            role={type}
          />

          <div
            role="article"
            aria-label={isUser ? "User message" : "Assistant message"}
            className={`markdown whitespace-pre-line text-theme-text-primary light:text-theme-text-primary font-normal text-sm md:text-sm flex flex-col gap-y-1 mt-2`}
            dangerouslySetInnerHTML={{
              __html: safeMarkdown(renderMarkdown(message)),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(ChatBubble);
