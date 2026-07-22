// SPDX-License-Identifier: MIT

import { Fragment } from "react";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import { tokenizeInlineCitations } from "./inline-citations";
import InlineCitation from "./InlineCitation";

interface CitedMarkdownProps {
  markdown: string;
  sources?: any[];
  workspaceSlug?: string;
  className?: string;
}

export default function CitedMarkdown({
  markdown,
  sources = [],
  workspaceSlug,
  className = "",
}: CitedMarkdownProps) {
  const tokens = tokenizeInlineCitations(markdown);

  return (
    <div className={["assistant-markdown", className].join(" ")}>
      {tokens.map((token, index) => {
        if (token.type === "citation") {
          const sourceIndex = token.sourceIndex ?? -1;
          return (
            <InlineCitation
              key={`citation-${index}-${sourceIndex}`}
              number={sourceIndex + 1}
              source={sources[sourceIndex]}
              workspaceSlug={workspaceSlug}
            />
          );
        }

        return (
          <Fragment key={`text-${index}`}>
            <span
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(renderMarkdown(token.value)),
              }}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
