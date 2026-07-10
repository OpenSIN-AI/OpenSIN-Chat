// SPDX-License-Identifier: MIT
// Purpose: Submits the active chat prompt with a compact, accessible control.
// Docs: SendPromptButton.doc.md
import { useTranslation } from "react-i18next";
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { Tooltip } from "react-tooltip";

interface SendPromptButtonProps {
  formRef: React.RefObject<HTMLButtonElement | null>;
  promptInput: string;
  isDisabled: boolean;
}

export default function SendPromptButton({
  formRef,
  promptInput,
  isDisabled,
}: SendPromptButtonProps) {
  const { t } = useTranslation();

  return (
    <>
      <button
        ref={formRef}
        type="submit"
        disabled={isDisabled || !promptInput.trim().length}
        className={`flex h-8 w-8 items-center justify-center rounded-full border-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
          promptInput.trim().length && !isDisabled
            ? "cursor-pointer bg-[#fafafa] hover:bg-[#d4d4d8] light:bg-zinc-900 light:hover:bg-zinc-800"
            : "cursor-not-allowed bg-white/[0.06] light:bg-zinc-100"
        }`}
        data-tooltip-id="send-prompt"
        data-tooltip-content={
          isDisabled
            ? t("chat_window.attachments_processing")
            : t("chat_window.send")
        }
        aria-label={t("chat_window.send")}
      >
        <ArrowUp
          className={`w-[15px] h-[15px] pointer-events-none ${
            promptInput.trim().length && !isDisabled
              ? "text-black light:text-white"
              : "text-[#3f3f46] light:text-zinc-400"
          }`}
          weight="bold"
        />
        <span className="sr-only">{t("chat_window.send")}</span>
      </button>
      <Tooltip
        id="send-prompt"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-[99]"
      />
    </>
  );
}
