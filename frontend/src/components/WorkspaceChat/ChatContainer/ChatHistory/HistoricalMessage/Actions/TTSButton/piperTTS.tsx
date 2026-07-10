// SPDX-License-Identifier: MIT
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { SpeakerHigh } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { PauseCircle } from "@phosphor-icons/react/dist/csr/PauseCircle";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import PiperTTSClient from "@/utils/piperTTS";
import messageToSpeech from "@/utils/chat/messageToSpeech";
import logger from "@/utils/logger";

export default function PiperTTS({ chatId, voiceId = null, message }: any) {
  const { t } = useTranslation();
  const playerRef = useRef<any>(null);
  const [speaking, setSpeaking] = useState(false as any);
  const [loading, setLoading] = useState(false as any);
  const [audioSrc, setAudioSrc] = useState<any>(null);

  async function speakMessage(e: any) {
    e.preventDefault();
    if (speaking) {
      playerRef?.current?.pause();
      return;
    }

    try {
      if (!audioSrc) {
        setLoading(true);
        const client = new PiperTTSClient({ voiceId });
        const blobUrl = await client.getAudioBlobForText(
          messageToSpeech(message),
        );
        setAudioSrc(blobUrl);
        setLoading(false);
      } else {
        playerRef.current.play();
      }
    } catch (e) {
      logger.error(e);
      setLoading(false);
      setSpeaking(false);
    }
  }

  useEffect(() => {
    const player = playerRef?.current;
    if (!player) return;

    function handlePlay() {
      setSpeaking(true);
    }

    function handlePause() {
      player.currentTime = 0;
      setSpeaking(false);
    }

    function handleEnded() {
      player.currentTime = 0;
      setSpeaking(false);
    }

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Release the generated audio blob URL when it is replaced or the component
  // unmounts so the in-memory blob is not leaked.
  useEffect(() => {
    return () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc);
    };
  }, [audioSrc]);

  return (
    <div className="mt-3 relative">
      <button
        type="button"
        onClick={speakMessage}
        disabled={loading}
        data-auto-play-chat-id={chatId}
        data-tooltip-id="message-to-speech"
        data-tooltip-content={
          speaking ? t("common.pauseSpeech") : t("common.speakMessage")
        }
        className="border-none text-[var(--theme-sidebar-footer-icon-fill)]"
        aria-label={
          speaking ? t("common.pauseSpeech") : t("common.speakMessage")
        }
      >
        {speaking ? (
          <PauseCircle size={18} className="mb-1" />
        ) : (
          <>
            {loading ? (
              <CircleNotch size={18} className="mb-1 animate-spin" />
            ) : (
              <SpeakerHigh size={18} className="mb-1" />
            )}
          </>
        )}
        <audio
          ref={playerRef}
          hidden={true}
          src={audioSrc}
          autoPlay={true}
          controls={false}
        />
      </button>
    </div>
  );
}
