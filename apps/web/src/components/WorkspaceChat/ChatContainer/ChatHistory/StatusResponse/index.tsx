// SPDX-License-Identifier: MIT
import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { useTranslation } from "react-i18next";

/**
 * v0-style agent status line.
 *
 * Design goals (matches Vercel v0 1:1):
 *  - No heavy card, no video/webm icon. Just a clean single line.
 *  - While thinking: the current status text shimmers (light sweep).
 *  - When there is a chain of prior steps, a chevron on the left expands them.
 *  - Collapsed shows only the latest line; expanded reveals every step.
 */
export default function StatusResponse({
  messages = [],
  isThinking = false,
}: any) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false as any);

  const currentThought = messages.length ? messages[messages.length - 1] : null;
  const previousThoughts = messages.slice(0, -1);
  const hasChain = previousThoughts.length > 0;

  if (!messages.length && !isThinking) return null;

  function handleToggle() {
    if (!hasChain) return;
    setIsExpanded(!isExpanded);
  }

  const label = currentThought?.content ?? t("statusResponse.thinking");

  return (
    <div className="flex w-full justify-start py-1">
      <div className="flex w-full flex-col gap-y-1">
        <div className="flex items-center gap-x-1.5">
          {hasChain ? (
            <button
              type="button"
              onClick={handleToggle}
              className="flex flex-shrink-0 items-center border-none bg-transparent p-0 text-[var(--chat-text-muted)] transition-colors hover:text-[var(--chat-text)]"
              aria-label={
                isExpanded
                  ? t("statusResponse.hideThoughtChain")
                  : t("statusResponse.showThoughtChain")
              }
            >
              <CaretDown
                size={14}
                className={`transform transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : "-rotate-90"
                }`}
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleToggle}
            className={`min-w-0 border-none bg-transparent p-0 text-left text-sm ${
              hasChain ? "cursor-pointer" : "cursor-default"
            }`}
            aria-live="polite"
          >
            <span
              className={`block truncate ${
                isThinking
                  ? "thinking-shimmer font-medium"
                  : "text-[var(--chat-text-muted)]"
              }`}
            >
              {label}
            </span>
          </button>
        </div>

        {isExpanded && hasChain ? (
          <div className="ml-[22px] flex flex-col gap-y-1 border-l border-[var(--chat-text-muted)]/20 pl-3">
            {(previousThoughts as any).map((thought, index) => (
              <div
                key={`cot-${thought.uuid || index}`}
                className="text-sm leading-relaxed text-[var(--chat-text-muted)]"
              >
                {thought.content}
              </div>
            ))}
            <div className="text-sm leading-relaxed text-[var(--chat-text)]">
              {currentThought?.content ?? ""}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
