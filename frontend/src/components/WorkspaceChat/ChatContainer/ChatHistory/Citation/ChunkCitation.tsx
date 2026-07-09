// SPDX-License-Identifier: MIT
/**
 * ChunkCitation — inline hover popover for [source:N] citation markers.
 *
 * RAGFlow-style chunk-level citation: clicking a numbered superscript in the
 * chat response reveals a popover with a 400-char preview of the exact chunk
 * that the LLM used to generate that part of the answer.
 *
 * The component is intentionally self-contained so it can be mounted once per
 * message and wired to all citation anchors in the rendered HTML via a
 * document.querySelectorAll('[data-citation-index]') observer.
 *
 * Usage:
 *   <ChunkCitationPopoverManager sources={sources} messageId={uuid} />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { omitChunkHeader } from "./index";

interface SourceChunk {
  id?: string;
  text?: string;
  chunkSource?: string;
  score?: number | null;
}

interface Source {
  title?: string;
  url?: string | null;
  published?: string | null;
  chunkIndex?: number | null;
  score?: number | null;
  // The text field lives at the top level of curated sources (from metadata.text)
  text?: string;
  chunks?: SourceChunk[];
}

interface PopoverState {
  visible: boolean;
  x: number;
  y: number;
  source: Source | null;
}

/**
 * Mounts invisible event listeners on citation anchors inside the message
 * container and renders a floating popover with the chunk preview text.
 */
export default function ChunkCitationPopoverManager({
  sources = [],
  messageId,
}: {
  sources: Source[];
  messageId: string;
}) {
  const { t } = useTranslation();
  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    x: 0,
    y: 0,
    source: null,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPopover = useCallback(
    (index: number, anchorEl: HTMLElement) => {
      // Citation markers are 1-indexed in the markdown ([source:1] = sources[0])
      const source = sources[index - 1] ?? null;
      if (!source) return;

      const rect = anchorEl.getBoundingClientRect();
      const scrollY = window.scrollY ?? 0;
      setPopover({
        visible: true,
        // Position above the anchor; the popover is fixed so viewport coords work.
        x: rect.left,
        y: rect.top + scrollY - 8,
        source,
      });
    },
    [sources],
  );

  const hidePopover = useCallback(() => {
    closeTimerRef.current = setTimeout(
      () => setPopover((p) => ({ ...p, visible: false })),
      120,
    );
  }, []);

  const cancelHide = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Wire hover events to citation anchors after the message renders.
  useEffect(() => {
    if (sources.length === 0) return;

    // The message content is rendered inside a sibling element; we search up
    // to the nearest .prompt-reply-container or fall back to document.
    const root =
      containerRef.current?.closest("[data-message-id]") ?? document;

    const anchors: NodeListOf<HTMLElement> = root.querySelectorAll(
      `[data-citation-index]`,
    );
    if (anchors.length === 0) return;

    const handlers: Array<[HTMLElement, string, EventListener]> = [];

    anchors.forEach((anchor) => {
      const idx = Number(anchor.dataset.citationIndex);
      if (!idx || isNaN(idx)) return;

      const onEnter = () => showPopover(idx, anchor);
      const onLeave = () => hidePopover();

      anchor.addEventListener("mouseenter", onEnter);
      anchor.addEventListener("mouseleave", onLeave);
      handlers.push([anchor, "mouseenter", onEnter]);
      handlers.push([anchor, "mouseleave", onLeave]);
    });

    return () => {
      handlers.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
    };
  }, [sources, messageId, showPopover, hidePopover]);

  if (!popover.visible || !popover.source) return <div ref={containerRef} />;

  const { source } = popover;
  // Prefer the top-level `text` field (curated source shape) or fall back
  // to the first chunk's text (combineLikeSources shape).
  const rawText =
    source.text ?? source.chunks?.[0]?.text ?? null;
  const previewText = rawText
    ? omitChunkHeader(rawText).slice(0, 400)
    : null;

  // External link — only shown for link:// chunkSources
  const chunkSource = source.chunks?.[0]?.chunkSource ?? null;
  const externalHref =
    chunkSource?.startsWith("link://") ? chunkSource.replace("link://", "") : null;

  return (
    <>
      {/* Invisible anchor sentinel so the ref is always mounted */}
      <div ref={containerRef} />

      {/* Fixed popover — rendered in document flow but positioned with fixed */}
      <div
        role="tooltip"
        aria-live="polite"
        onMouseEnter={cancelHide}
        onMouseLeave={hidePopover}
        className="fixed z-[9999] w-72 rounded-xl border border-theme-modal-border bg-theme-bg-secondary shadow-2xl text-xs leading-relaxed"
        style={{ left: popover.x, top: popover.y, transform: "translateY(-100%)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-1.5 border-b border-theme-modal-border">
          <p
            className="font-semibold text-theme-text-primary line-clamp-2 flex-1"
            title={source.title}
          >
            {source.title ?? t("citation.unknownSource")}
          </p>
          {externalHref && (
            <a
              href={externalHref}
              target="_blank"
              rel="noreferrer noopener"
              className="flex-shrink-0 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              aria-label={t("citation.openSource")}
            >
              <ArrowSquareOut size={14} />
            </a>
          )}
        </div>

        {/* Chunk preview */}
        <div className="px-3 py-2">
          {previewText ? (
            <p className="text-theme-text-secondary line-clamp-6 whitespace-pre-wrap">
              {previewText}
              {rawText && rawText.length > 400 && (
                <span className="text-theme-text-secondary opacity-60"> …</span>
              )}
            </p>
          ) : (
            <p className="text-theme-text-secondary italic">
              {t("citation.noPreview")}
            </p>
          )}
        </div>

        {/* Footer: score + chunk index */}
        {(source.score != null || source.chunkIndex != null) && (
          <div className="flex items-center gap-3 px-3 pb-2.5 text-theme-text-secondary opacity-70">
            {source.score != null && (
              <span>{Math.round(source.score * 100)}% {t(
                "chat_window.similarity_match",
              )}</span>
            )}
            {source.chunkIndex != null && (
              <span>{t("citation.chunkIndex", { index: source.chunkIndex + 1 })}</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
