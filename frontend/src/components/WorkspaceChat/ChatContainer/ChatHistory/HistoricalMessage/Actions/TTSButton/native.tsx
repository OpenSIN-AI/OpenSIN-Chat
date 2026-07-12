// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SpeakerHigh } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { PauseCircle } from "@phosphor-icons/react/dist/csr/PauseCircle";
import messageToSpeech from "@/utils/chat/messageToSpeech";
import { messageActionButtonClass } from "../MessageActionButton";

export default function NativeTTSMessage({ chatId, message }: any) {
  const { t } = useTranslation();
  const [speaking, setSpeaking] = useState(false as any);
  const [supported, setSupported] = useState(false as any);
  useEffect(() => {
    setSupported("speechSynthesis" in window);
  }, []);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis?.cancel();
      }
    };
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
    <div className="relative flex h-7 w-7 items-center justify-center">
      <button
        type="button"
        onClick={speakMessage}
        data-auto-play-chat-id={chatId}
        data-tooltip-id="message-to-speech"
        data-tooltip-content={
          speaking ? t("common.pauseSpeech") : t("common.speakMessage")
        }
        className={messageActionButtonClass}
        aria-label={
          speaking ? t("common.pauseSpeech") : t("common.speakMessage")
        }
      >
        {speaking ? <PauseCircle size={20} /> : <SpeakerHigh size={20} />}
      </button>
    </div>
  );
}
