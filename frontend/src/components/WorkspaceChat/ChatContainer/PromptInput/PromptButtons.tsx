// SPDX-License-Identifier: MIT
import { ArrowUp, Sparkle } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export function SendPromptButton({ formRef, promptInput, isDisabled }: any): JSX.Element {
  return (
    <button
      ref={formRef}
      type="submit"
      disabled={isDisabled}
      className={`text-white/80 hover:text-white transition-colors duration-200 ${
        isDisabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <ArrowUp size={20} weight="fill" />
    </button>
  );
}

export function EnhancePromptButton({ promptInput, setPromptInput, isStreaming }: any): JSX.Element {
  const { t } = useTranslation();
  const [enhancing, setEnhancing] = useEnhancing(false);
  
  const handleEnhance = async () => {
    setEnhancing(true);
    // Enhancement logic here
    setEnhancing(false);
  };

  return (
    <button
      onClick={handleEnhance}
      disabled={!promptInput.trim() || isStreaming || enhancing}
      className="text-white/80 hover:text-white transition-colors duration-200"
    >
      <Sparkle size={20} weight="fill" />
    </button>
  );
}

function useEnhancing(initial: any): JSX.Element {
  return useState(initial);
}
