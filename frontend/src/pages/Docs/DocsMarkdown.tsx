// SPDX-License-Identifier: MIT
//
// Markdown renderer for the in-app developer documentation. Reuses the same
// markdown-it + highlight.js + DOMPurify stack already used to render chat
// messages, so no new dependencies are introduced.
import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import DOMPurify from "@/utils/chat/purify";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (e) {
        console.warn("highlight.js failed:", e);
      }
    }
    return "";
  },
});

export default function DocsMarkdown({ content }: { content: string }) {
  const html = useMemo(() => {
    if (!content) return "";
    return DOMPurify.sanitize(md.render(content));
  }, [content]);

  if (!content) return null;

  return (
    <div
      className="docs-markdown max-w-3xl"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
