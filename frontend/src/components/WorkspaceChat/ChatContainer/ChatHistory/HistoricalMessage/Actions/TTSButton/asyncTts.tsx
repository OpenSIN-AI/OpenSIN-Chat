// SPDX-License-Identifier: MIT
import { useEffect, useState, useRef } from "react";
import { SpeakerHigh } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { PauseCircle } from "@phosphor-icons/react/dist/csr/PauseCircle";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

export default function AsyncTTSMessage({ slug, chatId }: any) {
  const playerRef = useRef(null);
  const fetchInFlightRef = useRef(false);
  const [speaking, setSpeaking] = useState(false as any);
  const [loading, setLoading] = useState(false as any);
  const [audioSrc, setAudioSrc] = useState(null);
  const { t } = useTranslation();

  function speakMessage() {
    if (speaking) {
      playerRef?.current?.pause();
      return;
    }

    try {
      if (!audioSrc) {
        if (fetchInFlightRef.current) return; // Prevent concurrent TTS fetches
        fetchInFlightRef.current = true;
        setLoading(true);
        Workspace.ttsMessage(slug, chatId)
          .then((audioBlob) => {
            if (!audioBlob)
              throw new Error("Failed to load or play TTS message response.");
            setAudioSrc(audioBlob);
          })
          .catch((e) => showToast(e.message, "error", { clear: true }))
          .finally(() => {
            fetchInFlightRef.current = false;
            setLoading(false);
          });
      } else {
        playerRef.current.play();
      }
    } catch (e) {
      console.error(e);
      fetchInFlightRef.current = false;
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

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, []);

  if (!chatId) return null;
  return (
    <div className="mt-3 relative">
      <button
        type="button"
        onClick={speakMessage}
        data-auto-play-chat-id={chatId}
        data-tooltip-id="message-to-speech"
        data-tooltip-content={
          speaking
            ? t("chat_window.pause_tts_speech_message")
            : t("chat_window.tts_speak_message")
        }
        className="border-none text-zinc-300 light:text-slate-500"
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
