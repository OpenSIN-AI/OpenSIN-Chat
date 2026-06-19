// SPDX-License-Identifier: MIT
import React from "react";
import UserIcon from "../UserIcon";
import { userFromStorage } from "@/utils/request";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";

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
  ],
};
const safeMarkdown = (html) => DOMPurify.sanitize(html, MARKDOWN_SANITIZE_OPTS);

export default function ChatBubble({ message, type }: any) {
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
            className={`markdown whitespace-pre-line text-white font-normal text-sm md:text-sm flex flex-col gap-y-1 mt-2`}
            dangerouslySetInnerHTML={{
              __html: safeMarkdown(renderMarkdown(message)),
            }}
          />
        </div>
      </div>
    </div>
  );
}
