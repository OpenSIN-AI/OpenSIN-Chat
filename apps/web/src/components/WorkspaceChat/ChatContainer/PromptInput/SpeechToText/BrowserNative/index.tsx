// SPDX-License-Identifier: MIT
import { useEffect, useRef } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import Appearance from "@/models/appearance";
import { useTranslation } from "react-i18next";
import showToast from "@/utils/toast";
import MicButton from "../MicButton";

const SILENCE_INTERVAL = 3_200; // wait in seconds of silence before closing.

/**
 * Browser-native speech-to-text using the Web Speech API.
 * @param {Object} props - The component props
 * @param {(textToAppend: string, autoSubmit: boolean) => void} props.sendCommand - The function to send the command
 * @returns {React.ReactElement} The SpeechToText component
 */
export default function BrowserNativeSTT({ sendCommand }: any) {
  const { t } = useTranslation();
  const previousTranscriptRef = useRef("");
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
    isMicrophoneAvailable,
  } = useSpeechRecognition({
    clearTranscriptOnListen: true,
  });

  function startSTTSession() {
    if (!isMicrophoneAvailable) {
      showToast(t("chat_window.stt_mic_access_denied"), "error");
      return;
    }

    resetTranscript();
    previousTranscriptRef.current = "";
    SpeechRecognition.startListening({
      continuous: browserSupportsContinuousListening,
      language: window?.navigator?.language ?? "en-US",
    });
  }

  function endSTTSession() {
    SpeechRecognition.stopListening();

    // If auto submit is enabled, send an empty string to the chat window to submit the current transcript
    // since every chunk of text should have been streamed to the chat window by now.
    if (Appearance.get("autoSubmitSttInput")) {
      sendCommand({
        text: "",
        autoSubmit: true,
        writeMode: "append",
      });
    }

    resetTranscript();
    previousTranscriptRef.current = "";
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    if (transcript?.length > 0 && listening) {
      const previousTranscript = previousTranscriptRef.current;
      const newContent = transcript.slice(previousTranscript.length);

      // Stream just the diff of the new content since transcript is an accumulating string.
      // and not just the new content transcribed.
      if (newContent.length > 0)
        sendCommand({ text: newContent, writeMode: "append" });

      previousTranscriptRef.current = transcript;
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        endSTTSession();
      }, SILENCE_INTERVAL);
    }
  }, [transcript, listening]);

  // Ensure the mic session and pending silence timer are torn down if the
  // component unmounts mid-listen (e.g. navigating away during recording),
  // otherwise the timeout fires and calls sendCommand on an unmounted component
  // while leaving the microphone active.
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      // Guard against environments (headless browsers, unsupported platforms)
      // where the Web Speech API polyfill does not expose stopListening,
      // which would throw a TypeError and crash the ErrorBoundary on unmount.
      if (typeof SpeechRecognition.stopListening === "function") {
        SpeechRecognition.stopListening();
      }
    };
  }, []);

  if (!browserSupportsSpeechRecognition) return null;
  return (
    <MicButton
      listening={listening}
      onStart={startSTTSession}
      onStop={endSTTSession}
    />
  );
}
