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
        className={`border-none flex justify-center items-center rounded-full w-8 h-8 transition-all ${
          promptInput.trim().length && !isDisabled
            ? "cursor-pointer bg-white hover:bg-zinc-200 light:bg-slate-800 light:hover:bg-slate-600"
            : "cursor-not-allowed bg-zinc-600 light:bg-slate-400"
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
          className="w-[18px] h-[18px] pointer-events-none text-zinc-800 light:text-white"
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
