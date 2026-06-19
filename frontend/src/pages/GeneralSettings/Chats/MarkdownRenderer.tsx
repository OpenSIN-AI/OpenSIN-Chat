// SPDX-License-Identifier: MIT
// Purpose: Markdown renderer with thought bubble support
// Docs: MarkdownRenderer.doc.md
import { useState } from "react";
import { useTranslation } from "react-i18next";
import MarkdownIt from "markdown-it";
import hljs from "@/utils/chat/hljs";
import { CaretDown } from "@phosphor-icons/react";
import "highlight.js/styles/github-dark.css";
import DOMPurify from "@/utils/chat/purify";

const md = new MarkdownIt({
  html: true,
  breaks: true,
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

interface ThoughtBubbleProps {
  thought: string;
}

const ThoughtBubble = ({
  thought,
}: ThoughtBubbleProps): React.ReactElement | null => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!thought) return null;

  const cleanThought = thought.replace(/<\/?think>/g, "").trim();
  if (!cleanThought) return null;

  return (
    <div className="mb-3">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer flex items-center gap-x-2 text-theme-text-secondary hover:text-theme-text-primary transition-colors mb-2"
      >
        <CaretDown
          size={14}
          weight="bold"
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
        <span className="text-xs font-medium">{t("common.viewThoughts")}</span>
      </div>
      {isExpanded && (
        <div className="bg-theme-bg-chat-input rounded-md p-3 border-l-2 border-theme-text-secondary/30">
          <div className="text-xs text-theme-text-secondary font-mono whitespace-pre-wrap">
            {cleanThought}
          </div>
        </div>
      )}
    </div>
  );
};

interface ContentPart {
  type: "normal" | "think";
  text: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  content.replace(
    /<think>([^]*?)<\/think>/g,
    (match: string, thinkContent: string, offset: number) => {
      if (offset > lastIndex) {
        parts.push({ type: "normal", text: content.slice(lastIndex, offset) });
      }
      parts.push({ type: "think", text: thinkContent });
      lastIndex = offset + match.length;
      return match;
    },
  );
  if (lastIndex < content.length) {
    parts.push({ type: "normal", text: content.slice(lastIndex) });
  }
  return parts;
}

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({
  content,
}: MarkdownRendererProps): React.ReactElement | null {
  if (!content) return null;

  const parts = parseContent(content);
  return (
    <div className="whitespace-normal">
      {parts.map((part, index) => {
        const html = md.render(part.text);
        if (part.type === "think")
          return <ThoughtBubble key={index} thought={part.text} />;
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
          />
        );
      })}
    </div>
  );
}
