// SPDX-License-Identifier: MIT
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SendPromptButton({ formRef, promptInput, isDisabled }: any) {
  return (
    <button
      ref={formRef}
      type="submit"
      disabled={isDisabled}
      className={`text-theme-text-primary hover:text-white transition-colors duration-200 ${
        isDisabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <ArrowUp size={20} weight="fill" />
    </button>
  );
}

export function EnhancePromptButton({
  promptInput,
  setPromptInput,
  isStreaming,
}: any) {
  const { t } = useTranslation();
  const [enhancing, setEnhancing] = useEnhancing(false);

  const handleEnhance = async () => {
    setEnhancing(true);
    // Enhancement logic here
    setEnhancing(false);
  };

  return (
    <button
      type="button"
      onClick={handleEnhance}
      disabled={!promptInput.trim() || isStreaming || enhancing}
      className="text-theme-text-primary hover:text-white transition-colors duration-200"
    >
      <Sparkle size={20} weight="fill" />
    </button>
  );
}

function useEnhancing(initial: any) {
  return useState(initial);
}
