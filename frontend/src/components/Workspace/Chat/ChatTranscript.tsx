// SPDX-License-Identifier: MIT
// Purpose: Modern chat transcript — scrollable message list with auto-scroll and "scroll to bottom" button.
// Docs: Based on Issue #607 §10 ChatTranscript spec + Issue #4.
import React, { useEffect, useRef, useState } from "react";
import { ArrowDown } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { cn } from "@/utils/cn";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "streaming" | "complete" | "error";
};

interface ChatTranscriptProps {
  messages: ChatMessage[];
  children: (message: ChatMessage) => React.ReactNode;
  className?: string;
}

export function ChatTranscript({
  messages,
  children,
  className,
}: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nearBottom, setNearBottom] = useState(true);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    setNearBottom(distance < 120);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }

  useEffect(() => {
    if (!nearBottom) return;
    scrollToBottom("auto");
  }, [messages, nearBottom]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "relative h-full overflow-y-auto",
        "bg-theme-bg-primary",
        className,
      )}
    >
      <div
        className="mx-auto max-w-[52rem] px-4 py-6"
        style={{ minHeight: "100%" }}
      >
        {messages.map((message) => (
          <React.Fragment key={message.id}>{children(message)}</React.Fragment>
        ))}
      </div>

      {!nearBottom && (
        <button
          type="button"
          aria-label="Zum neuesten Beitrag"
          onClick={() => scrollToBottom()}
          className="sticky bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-theme-border bg-theme-bg-sidebar px-3 py-1.5 text-xs font-medium text-theme-text-primary shadow-sm transition-colors hover:bg-theme-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <ArrowDown size={14} />
        </button>
      )}
    </div>
  );
}
