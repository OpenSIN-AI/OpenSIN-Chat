// SPDX-License-Identifier: MIT
//
// Markdown renderer for the in-app developer documentation. Reuses the same
// markdown-it + highlight.js + DOMPurify stack already used to render chat
// messages, so no new dependencies are introduced.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import DOMPurify from "@/utils/chat/purify";
import { resolveDocLink } from "./docsManifest";

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

// Rewrite relative markdown links so cross-references resolve to in-app /docs
// routes (data-internal) or open external GitHub files in a new tab.
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex("href");
  if (hrefIndex >= 0) {
    const href = token.attrs![hrefIndex][1];
    const resolved = resolveDocLink(href);
    if (resolved) {
      token.attrs![hrefIndex][1] = resolved.url;
      if (resolved.external) {
        token.attrSet("target", "_blank");
        token.attrSet("rel", "noreferrer");
      } else {
        token.attrSet("data-internal", "true");
      }
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export default function DocsMarkdown({ content }: { content: string }) {
  const navigate = useNavigate();

  const html = useMemo(() => {
    if (!content) return "";
    return DOMPurify.sanitize(md.render(content), {
      ADD_ATTR: ["data-internal", "target", "rel"],
    });
  }, [content]);

  // Intercept clicks on internal doc links and route via React Router instead
  // of triggering a full page reload.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest(
      "a[data-internal='true']"
    ) as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    e.preventDefault();
    navigate(href);
  };

  if (!content) return null;

  return (
    <div
      className="docs-markdown max-w-3xl"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
