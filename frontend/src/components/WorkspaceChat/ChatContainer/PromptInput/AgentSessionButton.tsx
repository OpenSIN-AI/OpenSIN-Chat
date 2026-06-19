// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import { At } from "@phosphor-icons/react/dist/csr/At";
import { Tooltip } from "react-tooltip";

interface AgentSessionButtonProps {
  sendCommand: (cmd: { text: string; writeMode: string }) => void;
  promptInput: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  visible?: boolean;
}

export default function AgentSessionButton({
  sendCommand,
  promptInput,
  textareaRef,
  visible = true,
}: AgentSessionButtonProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  function handleClick() {
    try {
      if (promptInput?.trim()?.startsWith("@agent")) return;
      sendCommand({ text: "@agent", writeMode: "prepend" });
    } finally {
      textareaRef?.current?.focus();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        data-tooltip-id="agent-session"
        data-tooltip-content={t("chat_window.start_agent_session")}
        aria-label={t("chat_window.start_agent_session")}
        className="group border-none relative flex justify-center items-center cursor-pointer w-6 h-6 rounded-full hover:bg-zinc-700 light:hover:bg-slate-200"
      >
        <At
          size={18}
          className="pointer-events-none text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-600 shrink-0"
        />
      </button>
      <Tooltip
        id="agent-session"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </>
  );
}
