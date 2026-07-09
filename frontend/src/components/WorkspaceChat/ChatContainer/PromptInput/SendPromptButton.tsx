// SPDX-License-Identifier: MIT
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
        className={`border-none flex justify-center items-center rounded-full w-7 h-7 transition-all ${
          promptInput.trim().length && !isDisabled
            ? "cursor-pointer bg-white hover:bg-zinc-100 shadow-sm"
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
              ? "text-black light:text-black"
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
        className="tooltip !text-xs z-99"
      />
    </>
  );
}
