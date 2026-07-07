// SPDX-License-Identifier: MIT
export default function SuggestedMessages({
  suggestedMessages = [],
  sendCommand,
}: any) {
  if (!suggestedMessages?.length) return null;

  return (
    <div className="flex flex-col w-full max-w-[650px] mt-6 px-4">
      {(suggestedMessages as any).map((msg, index) => {
        const text = msg.heading?.trim()
          ? `${msg.heading.trim()} ${msg.message?.trim() || ""}`
          : msg.message?.trim() || "";
        if (!text) return null;

        return (
          <div key={`${msg.heading || msg.message || ""}-${index}`}>
            {index > 0 && (
              <div className="border-t border-zinc-800 light:border-theme-chat-input-border" />
            )}
            <button
              type="button"
              onClick={() => sendCommand({ text, autoSubmit: true })}
              className="w-full text-left py-3 px-3 text-theme-text-primary text-sm font-normal leading-5 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors light:text-theme-text-primary light:hover:text-theme-text-primary/80 hover:bg-zinc-800 light:hover:bg-black/20 rounded-lg"
            >
              {text}
            </button>
          </div>
        );
      })}
    </div>
  );
}
