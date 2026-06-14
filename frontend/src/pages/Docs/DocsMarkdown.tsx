// SPDX-License-Identifier: MIT
//
// Markdown renderer for the in-app developer documentation. Reuses the same
// markdown-it + highlight.js + DOMPurify stack already used to render chat
// messages, so no new dependencies are introduced.
//
// On top of the base rendering it adds:
//  - stable heading anchors (id + clickable links) for deep-linking,
//  - extraction of the heading outline (used by the right-hand "On this page"),
//  - a header bar with a language label and a copy-to-clipboard button on every
//    fenced code block (state-of-the-art docs code blocks).
import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import DOMPurify from "@/utils/chat/purify";
import { resolveDocLink } from "./docsManifest";

export type DocHeading = { id: string; text: string; level: 2 | 3 };

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
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

// Custom fence renderer: wrap highlighted code in a block with a header bar
// (language label + copy button). The copy button is wired up via event
// delegation in the component below.
const copyIcon =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const checkIcon =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

md.renderer.rules.fence = function (tokens, idx) {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : "";
  const lang = info.split(/\s+/g)[0] || "";
  let highlighted: string;
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(token.content, { language: lang }).value;
    } catch {
      highlighted = md.utils.escapeHtml(token.content);
    }
  } else {
    highlighted = md.utils.escapeHtml(token.content);
  }
  const label = md.utils.escapeHtml(lang || "text");
  const codeClass = lang ? `hljs language-${lang}` : "hljs";
  return (
    `<div class="docs-code-block">` +
    `<div class="docs-code-header">` +
    `<span class="docs-code-lang">${label}</span>` +
    `<button class="docs-code-copy" type="button" data-copy>` +
    `<span class="docs-code-copy-icon">${copyIcon}${checkIcon}</span>` +
    `<span class="docs-code-copy-label"></span>` +
    `</button>` +
    `</div>` +
    `<pre><code class="${codeClass}">${highlighted}</code></pre>` +
    `</div>`
  );
};

/** Turn heading text into a URL-safe slug, keeping unicode letters. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export default function DocsMarkdown({
  content,
  onHeadings,
}: {
  content: string;
  onHeadings?: (headings: DocHeading[]) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const { html, headings } = useMemo(() => {
    if (!content) return { html: "", headings: [] as DocHeading[] };
    const env = {};
    const tokens = md.parse(content, env);
    const collected: DocHeading[] = [];
    const used = new Map<string, number>();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (
        token.type === "heading_open" &&
        (token.tag === "h2" || token.tag === "h3")
      ) {
        const inline = tokens[i + 1];
        const text = inline?.content ?? "";
        let slug = slugify(text) || "section";
        const count = used.get(slug) ?? 0;
        used.set(slug, count + 1);
        if (count > 0) slug = `${slug}-${count}`;
        token.attrSet("id", slug);
        token.attrSet("class", "docs-heading");
        collected.push({
          id: slug,
          text,
          level: token.tag === "h2" ? 2 : 3,
        });
      }
    }

    const rendered = md.renderer.render(tokens, md.options, env);
    const safe = DOMPurify.sanitize(rendered, {
      ADD_ATTR: ["data-internal", "data-copy", "target", "rel", "id"],
    });
    return { html: safe, headings: collected };
  }, [content]);

  // Publish the heading outline to the parent for the "On this page" panel.
  useEffect(() => {
    onHeadings?.(headings);
  }, [headings, onHeadings]);

  // Localize the copy buttons' accessible labels after each render.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const label = t("common.docsCopyCode");
    root
      .querySelectorAll<HTMLButtonElement>("button[data-copy]")
      .forEach((btn) => {
        btn.setAttribute("aria-label", label);
        btn.setAttribute("title", label);
        const labelEl = btn.querySelector(".docs-code-copy-label");
        if (labelEl && !labelEl.textContent) labelEl.textContent = label;
      });
  }, [html, t]);

  // Handle clicks: internal doc links route via React Router, copy buttons
  // write the adjacent code block to the clipboard.
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    const copyBtn = target.closest(
      "button[data-copy]",
    ) as HTMLButtonElement | null;
    if (copyBtn) {
      e.preventDefault();
      const block = copyBtn.closest(".docs-code-block");
      const code = block?.querySelector("code");
      const text = code?.textContent ?? "";
      if (!text) return;
      navigator.clipboard?.writeText(text).then(() => {
        block?.classList.add("is-copied");
        const labelEl = copyBtn.querySelector(".docs-code-copy-label");
        if (labelEl) labelEl.textContent = t("common.docsCodeCopied");
        window.setTimeout(() => {
          block?.classList.remove("is-copied");
          if (labelEl) labelEl.textContent = t("common.docsCopyCode");
        }, 2000);
      });
      return;
    }

    const anchor = target.closest(
      "a[data-internal='true']",
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
      ref={containerRef}
      className="docs-markdown max-w-3xl"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
