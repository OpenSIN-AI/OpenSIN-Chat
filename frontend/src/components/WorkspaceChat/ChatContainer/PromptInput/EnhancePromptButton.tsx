import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkle } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";

/**
 * Enhance Prompt Button — improves the current prompt via the server API.
 */
export default function EnhancePromptButton({
  promptInput,
  setPromptInput,
  isStreaming,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function handleEnhance() {
    const text = promptInput.trim();
    if (!text || loading || isStreaming) return;
    setLoading(true);
    try {
      const res = await fetch("/api/utils/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) setPromptInput(data.enhanced);
      }
    } catch {
      // silently ignore — server may not support the endpoint yet
    } finally {
      setLoading(false);
    }
  }

  if (!promptInput.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleEnhance}
        disabled={loading || isStreaming}
        data-tooltip-id="enhance-prompt"
        data-tooltip-content={t(
          "chat_window.enhance_prompt",
          "Prompt verbessern",
        )}
        aria-label={t("chat_window.enhance_prompt", "Prompt verbessern")}
        className={`group border-none flex justify-center items-center rounded-full w-8 h-8 transition-all ${
          loading || isStreaming
            ? "cursor-not-allowed opacity-40 bg-transparent"
            : "cursor-pointer bg-transparent hover:bg-zinc-700 light:hover:bg-slate-200"
        }`}
      >
        <Sparkle
          size={17}
          weight={loading ? "fill" : "regular"}
          className={`pointer-events-none transition-colors ${
            loading
              ? "text-yellow-400 animate-pulse"
              : "text-zinc-300 light:text-slate-500 group-hover:text-white light:group-hover:text-slate-800"
          }`}
        />
      </button>
      <Tooltip
        id="enhance-prompt"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </>
  );
}
