// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

/**
 * Set the tooltips for the chat container in bulk.
 * Why do this?
 *
 * React-tooltip rendering on _each_ chat will attach an event listener to the body.
 * This will add up if we have many chats open resulting in the browser crashing
 * so we batch them together in a single component that renders at the top most level with
 * a static id the content can change, but this prevents the React-tooltip library from adding
 * hundreds of event listeners to the DOM.
 *
 * In general, anywhere we have iterative rendering the Tooltip should be rendered at the highest level to prevent
 * hundreds of event listeners from being added to the DOM in the worst case scenario.
 * @returns
 */
export function ChatTooltips() {
  const { t } = useTranslation();

  // All chat tooltips are portaled to document.body with z-[100].
  //
  // Why: the message action icons (copy, edit, feedback, regenerate, speak,
  // more-actions) live inside the chat message's own stacking context. When a
  // tooltip is rendered inline there without a z-index, it stacks at `auto` and
  // gets visually overlapped by sibling content that follows the icon row
  // (e.g. the "Basierend auf Quellen" chip and the Quellen source row),
  // producing the faulty hover overlap above/around the AI answers.
  //
  // Portaling to <body> + z-[100] lifts every tooltip above the chat history,
  // matching the already-working pattern previously used only for
  // "similarity-score". Positioning is unaffected — react-tooltip anchors by
  // the trigger element's rect regardless of where the tooltip node lives.
  return createPortal(
    <>
      <Tooltip
        id="message-to-speech"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="regenerate-assistant-text"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="copy-message-text"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="feedback-button"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="action-menu"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="edit-input-text"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="metrics-visibility"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="routing-details"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="expand-cot"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="cot-thinking"
        place="bottom"
        delayShow={500}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="query-refusal-info"
        place="top"
        delayShow={500}
        className="tooltip !text-xs max-w-[350px] z-[100]"
      />
      <Tooltip
        id="context-window-limit-exceeded"
        place="top"
        delayShow={500}
        className="tooltip !text-xs max-w-[350px] z-[100]"
      />
      <Tooltip
        id="attachment-status-tooltip"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="attach-item-btn"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
      />
      <Tooltip
        id="agent-skill-disabled-tooltip"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[100]"
        content={t("chat_window.agent_skills_disabled_in_session")}
      />
      <Tooltip
        id="similarity-score"
        place="top"
        delayShow={100}
        className="tooltip !text-xs z-[100]"
      />
    </>,
    document.body,
  );
}
