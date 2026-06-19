// SPDX-License-Identifier: MIT
import { createContext, useContext, useEffect, useMemo } from "react";
import useSystemSettings from "@/hooks/useSystemSettings";
import Appearance from "@/models/appearance";

const ASSISTANT_MESSAGE_COMPLETE_EVENT = "ASSISTANT_MESSAGE_COMPLETE_EVENT";
const TTSProviderContext = createContext<any>(undefined);

/**
 * This component is used to provide the TTS provider context to the application.
 */
export function TTSProvider({ children }: any) {
  const { settings, loading } = useSystemSettings();
  const provider = useMemo(
    () => settings?.TextToSpeechProvider ?? "native",
    [settings],
  );

  const contextValue = useMemo(
    () => ({
      settings,
      provider,
      loading,
    }),
    [settings, provider, loading],
  );

  return (
    <TTSProviderContext.Provider value={contextValue}>
      {children}
    </TTSProviderContext.Provider>
  );
}

/**
 * This hook is used to get the TTS provider settings easily without
 * having to refetch the settings from the System.keys() call each component mount.
 *
 * @returns {{settings: {TTSPiperTTSVoiceModel: string|null}, provider: string, loading: boolean}} The TTS provider settings.
 */
export function useTTSProvider() {
  const context = useContext(TTSProviderContext);
  if (!context)
    throw new Error("useTTSProvider must be used within a TTSProvider");
  return context;
}

/**
 * This function will emit the ASSISTANT_MESSAGE_COMPLETE_EVENT event.
 *
 * This event is used to notify the TTSProvider that a message has been fully generated and that the TTS response
 * should be played if the user setting is enabled.
 *
 * @param {string} chatId - The chatId of the message that has been fully generated.
 */
export function emitAssistantMessageCompleteEvent(chatId: any) {
  window.dispatchEvent(
    new CustomEvent(ASSISTANT_MESSAGE_COMPLETE_EVENT, { detail: { chatId } }),
  );
}

/**
 * This hook will establish a listener for the ASSISTANT_MESSAGE_COMPLETE_EVENT event.
 * When the event is triggered, the hook will attempt to play the TTS response for the given chatId.
 * It will attempt to play the TTS response for the given chatId until it is successful or the maximum number of attempts
 * is reached.
 *
 * This is accomplished by looking for a button with the data-auto-play-chat-id attribute that matches the chatId.
 */
export function useWatchForAutoPlayAssistantTTSResponse() {
  const autoPlayAssistantTtsResponse = Appearance.get(
    "autoPlayAssistantTtsResponse",
  );

  useEffect(() => {
    if (!autoPlayAssistantTtsResponse) return;

    const pendingTimers: ReturnType<typeof setTimeout>[] = [];

    function handleAutoPlayTTSEvent(event: any) {
      let autoPlayAttempts = 0;
      const { chatId } = event.detail;

      function attemptToPlay() {
        const playBtn = document.querySelector<HTMLElement>(
          `[data-auto-play-chat-id="${chatId}"]`,
        );
        if (!playBtn) {
          autoPlayAttempts++;
          if (autoPlayAttempts > 3) return false;
          const t = setTimeout(() => {
            attemptToPlay();
          }, 1000 * autoPlayAttempts);
          pendingTimers.push(t);
          return false;
        }
        playBtn.click();
        return true;
      }
      const t = setTimeout(() => {
        attemptToPlay();
      }, 800);
      pendingTimers.push(t);
    }

    window.addEventListener(
      ASSISTANT_MESSAGE_COMPLETE_EVENT,
      handleAutoPlayTTSEvent,
    );
    return () => {
      window.removeEventListener(
        ASSISTANT_MESSAGE_COMPLETE_EVENT,
        handleAutoPlayTTSEvent,
      );
      pendingTimers.forEach((t) => clearTimeout(t));
    };
  }, [autoPlayAssistantTtsResponse]);
}
