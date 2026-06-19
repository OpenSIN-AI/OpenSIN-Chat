// SPDX-License-Identifier: MIT
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SpeakerHigh } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { PauseCircle } from "@phosphor-icons/react/dist/csr/PauseCircle";
import messageToSpeech from "@/utils/chat/messageToSpeech";

export default function NativeTTSMessage({ chatId, message }: any) {
  const { t } = useTranslation();
  const [speaking, setSpeaking] = useState(false as any);
  const [supported, setSupported] = useState(false as any);
  useEffect(() => {
    setSupported("speechSynthesis" in window);
  }, []);

  function endSpeechUtterance() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    return;
  }

  function speakMessage() {
    // if the user is pausing this particular message
    // while the synth is speaking we can end it.
    // If they are clicking another message's TTS
    // we need to ignore that until they pause the one that is playing.
    if (window.speechSynthesis.speaking && speaking) {
      endSpeechUtterance();
      return;
    }

    if (window.speechSynthesis.speaking && !speaking) return;
    const utterance = new SpeechSynthesisUtterance(messageToSpeech(message));
    utterance.addEventListener("end", endSpeechUtterance);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  if (!supported) return null;
  return (
    <div className="relative flex items-center justify-center h-7 w-7">
      <button
        type="button"
        onClick={speakMessage}
        data-auto-play-chat-id={chatId}
        data-tooltip-id="message-to-speech"
        data-tooltip-content={
          speaking ? t("common.pauseSpeech") : t("common.speakMessage")
        }
        className="border-none text-zinc-300 light:text-slate-500"
        aria-label={
          speaking ? t("common.pauseSpeech") : t("common.speakMessage")
        }
      >
        {speaking ? <PauseCircle size={20} /> : <SpeakerHigh size={20} />}
      </button>
    </div>
  );
}
