// SPDX-License-Identifier: MIT
import { THOUGHT_REGEX_COMPLETE } from "@/components/WorkspaceChat/ChatContainer/ChatHistory/ThoughtContainer";
import {
  copyMarkdownAsRichText,
  copyText as copyPlainText,
} from "@/utils/clipboard";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export default function useCopyText(delay = 2500) {
  const [copied, setCopied] = useState(false as any);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copyText = useCallback(
    async (content) => {
      if (!content) return;

      // Filter thinking blocks from the content if they exist
      const nonThinkingContent = content.replace(THOUGHT_REGEX_COMPLETE, "");
      // Try rich-text copy first; fall back to plain text if it fails
      // (e.g. ClipboardItem unavailable, non-secure context, headless browser).
      const ok = await copyMarkdownAsRichText(nonThinkingContent);
      if (!ok) {
        const fallbackOk = await copyPlainText(nonThinkingContent);
        if (!fallbackOk) return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), delay);
    },
    [delay],
  );

  return useMemo(() => ({ copyText, copied }), [copyText, copied]);
}
