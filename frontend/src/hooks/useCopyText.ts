// SPDX-License-Identifier: MIT
import { THOUGHT_REGEX_COMPLETE } from "@/components/WorkspaceChat/ChatContainer/ChatHistory/ThoughtContainer";
import { copyMarkdownAsRichText } from "@/utils/clipboard";
import { useEffect, useRef, useState } from "react";

export default function useCopyText(delay = 2500) {
  const [copied, setCopied] = useState(false as any);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copyText = async (content) => {
    if (!content) return;

    // Filter thinking blocks from the content if they exist
    const nonThinkingContent = content.replace(THOUGHT_REGEX_COMPLETE, "");
    await copyMarkdownAsRichText(nonThinkingContent);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCopied(true);
    timeoutRef.current = setTimeout(() => setCopied(false), delay);
  };

  return { copyText, copied };
}
