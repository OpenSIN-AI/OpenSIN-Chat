// SPDX-License-Identifier: MIT
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  createContext,
  useContext,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import ThinkingAnimation from "@/media/animations/thinking-animation.webm";
import ThinkingStatic from "@/media/animations/thinking-static.png";

/**
 * Context to persist thought expansion state across component transitions
 * (e.g., from PromptReply to HistoricalMessage)
 */
const ThoughtExpansionContext = createContext<any>(null);

export function ThoughtExpansionProvider({ children }: any) {
  const [expansionStates, setExpansionStates] = useState({} as any);

  const getExpanded = useCallback(
    (messageId) => {
      if (!messageId) return false;
      return expansionStates[messageId] ?? false;
    },
    [expansionStates],
  );

  const setExpanded = useCallback((messageId, expanded) => {
    if (!messageId) return;
    setExpansionStates((prev) => ({
      ...prev,
      [messageId]: expanded,
    }));
  }, []);

  return (
    <ThoughtExpansionContext.Provider value={{ getExpanded, setExpanded }}>
      {children}
    </ThoughtExpansionContext.Provider>
  );
}

export function useThoughtExpansion(messageId: any) {
  const context = useContext(ThoughtExpansionContext);
  if (!context) {
    return { expanded: false, setExpanded: () => {} };
  }
  return {
    expanded: context.getExpanded(messageId),
    setExpanded: (value) => context.setExpanded(messageId, value),
  };
}

const THOUGHT_KEYWORDS = [
  "thought",
  "thinking",
  "think",
  "thought_chain",
  "arg_value",
];
const CLOSING_TAGS = [...THOUGHT_KEYWORDS, "response", "answer"];
export const THOUGHT_REGEX_OPEN = new RegExp(
  (THOUGHT_KEYWORDS as any)
    .map((keyword) => `<${keyword}\\s*(?:[^>]*?)?\\s*>`)
    .join("|"),
);
export const THOUGHT_REGEX_CLOSE = new RegExp(
  (CLOSING_TAGS as any)
    .map((keyword) => `</${keyword}\\s*(?:[^>]*?)?>`)
    .join("|"),
);
export const THOUGHT_REGEX_COMPLETE = new RegExp(
  (THOUGHT_KEYWORDS as any)
    .map(
      (keyword) =>
        `<${keyword}\\s*(?:[^>]*?)?\\s*>[\\s\\S]*?<\\/${keyword}\\s*(?:[^>]*?)?>`,
    )
    .join("|"),
);

function contentIsNotEmpty(content: any = "") {
  return (
    content
      ?.trim()
      ?.replace(THOUGHT_REGEX_OPEN, "")
      ?.replace(THOUGHT_REGEX_CLOSE, "")
      ?.replace(/[\n\s]/g, "")?.length > 0
  );
}

/**
 * Small brain icon button that sits to the LEFT of the AI message.
 * Clicking it toggles the thought chain panel.
 */
export function ThoughtBrainButton({
  messageId,
  content,
  className = "",
}: any) {
  const { expanded, setExpanded } = useThoughtExpansion(messageId);
  const { t } = useTranslation();

  const isThinking =
    content?.match(THOUGHT_REGEX_OPEN) && !content?.match(THOUGHT_REGEX_CLOSE);
  const isComplete =
    content?.match(THOUGHT_REGEX_COMPLETE) ||
    content?.match(THOUGHT_REGEX_CLOSE);
  const hasContent = contentIsNotEmpty(content);

  if (!hasContent) return null;

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      title={
        expanded
          ? t("thoughtContainer.hideThoughts")
          : t("thoughtContainer.showThoughts")
      }
      aria-label={
        expanded
          ? t("thoughtContainer.hideThoughts")
          : t("thoughtContainer.showThoughts")
      }
      className={`flex-shrink-0 mt-2 p-1 rounded-md border-none cursor-pointer transition-colors ${
        expanded
          ? "bg-zinc-700 light:bg-slate-200"
          : "bg-transparent hover:bg-zinc-800 light:hover:bg-slate-100"
      } ${className}`}
    >
      {isThinking ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-[16px] h-[16px] scale-[115%] light:invert light:opacity-50"
        >
          <source src={ThinkingAnimation} type="video/webm" />
        </video>
      ) : (
        <img
          src={ThinkingStatic}
          alt={t("thoughtContainer.thoughtChain")}
          className="w-[16px] h-[16px] light:invert light:opacity-50"
        />
      )}
    </button>
  );
}

/**
 * Renders the expanded thought chain content.
 * Only visible when the expansion state is true (toggled via ThoughtBrainButton).
 */
export const ThoughtChainComponent = forwardRef(
  ({ content: initialContent, messageId }: any, ref) => {
    const [content, setContent] = useState(initialContent);
    const [hasReadableContent, setHasReadableContent] = useState(() =>
      contentIsNotEmpty(initialContent),
    );
    const { expanded: persistedExpanded, setExpanded: setPersistedExpanded } =
      useThoughtExpansion(messageId);
    const [localExpanded, setLocalExpanded] = useState(false as any);

    const isExpanded = messageId ? persistedExpanded : localExpanded;

    useEffect(() => {
      if (initialContent !== content) {
        setContent(initialContent);
        setHasReadableContent(contentIsNotEmpty(initialContent));
      }
    }, [initialContent, content]);

    useImperativeHandle(ref, () => ({
      updateContent: (newContent) => {
        setContent(newContent);
        setHasReadableContent(contentIsNotEmpty(newContent));
      },
    }));

    if (!content || !content.length || !hasReadableContent) return null;
    // Hidden by default — only show when expanded via the brain button
    if (!isExpanded) return null;

    const tagStrippedContent = content
      .replace(THOUGHT_REGEX_OPEN, "")
      .replace(THOUGHT_REGEX_CLOSE, "");

    return (
      <div className="w-full mb-2">
        <div className="bg-zinc-800 light:bg-slate-100 rounded-xl p-4 overflow-y-auto max-h-[400px]">
          <div className="text-zinc-300 light:text-slate-700 font-mono text-sm leading-relaxed [&_p]:m-0">
            <span
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(renderMarkdown(tagStrippedContent)),
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);
ThoughtChainComponent.displayName = "ThoughtChainComponent";
