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
        className={`border-none flex justify-center items-center rounded-full w-8 h-8 transition-opacity ${
          promptInput.trim().length && !isDisabled
            ? "cursor-pointer bg-slate-800 hover:opacity-80"
            : "cursor-not-allowed bg-transparent"
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
          className={`w-[18px] h-[18px] pointer-events-none ${
            promptInput.trim().length && !isDisabled
              ? "text-white"
              : "text-slate-400 light:text-slate-300"
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
