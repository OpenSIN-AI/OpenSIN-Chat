// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Appearance from "@/models/appearance";
import System from "@/models/system";
import showToast from "@/utils/toast";
import MicButton from "../MicButton";
import useSilenceDetector from "../useSilenceDetector";
import logger from "@/utils/logger";

const SILENCE_INTERVAL = 3_200; // ms of silence before auto-stop, matches BrowserNative.
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

/**
 * Records mic audio with MediaRecorder and uploads it to the configured
 * server-side STT provider. Auto-stops after SILENCE_INTERVAL of mic silence
 * via useSilenceDetector. Honors `autoSubmitSttInput` on completion.
 * @param {Object} props - The component props
 * @param {(textToAppend: string, autoSubmit: boolean) => void} props.sendCommand - The function to send the command
 * @returns {React.ReactElement} The ServerSTT component
 */
export default function ServerSTT({ sendCommand }: any) {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false as any);
  const [processing, setProcessing] = useState(false as any);
  const [stream, setStream] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  useSilenceDetector(listening ? stream : null, {
    onSilence: stopListening,
    silenceMs: SILENCE_INTERVAL,
  });

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast(t("chat_window.stt_unsupported"), "error");
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mimeType = MIME_CANDIDATES.find((m) =>
        MediaRecorder.isTypeSupported(m),
      );
      const recorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        audioStream.getTracks().forEach((t) => t.stop());
        setStream(null);
        setListening(false);
        recorderRef.current = null;

        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (blob.size === 0) return;

        await uploadAndDispatch(
          blob,
          recorder.mimeType,
          sendCommand,
          setProcessing,
          t,
        );
      };

      recorderRef.current = recorder;
      recorder.start();
      setStream(audioStream);
      setListening(true);
    } catch (e) {
      logger.error("Failed to start microphone:", e);
      showToast(t("chat_window.stt_mic_denied"), "error", { clear: true });
    }
  }, [sendCommand, t]);

  // Tear down the recorder and microphone stream if the component unmounts
  // mid-recording (e.g. navigating away), otherwise the MediaRecorder keeps
  // running and the mic tracks stay open, leaving the browser mic indicator on.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recorder?.stream?.getTracks?.().forEach((track) => track.stop());
      recorderRef.current = null;
    };
  }, []);

  return (
    <MicButton
      listening={listening}
      processing={processing}
      onStart={startListening}
      onStop={stopListening}
    />
  );
}

async function uploadAndDispatch(
  blob: any,
  mimeType: any,
  sendCommand: any,
  setProcessing: any,
  t: any,
) {
  setProcessing(true);
  const extension = mimeType.includes("ogg")
    ? "ogg"
    : mimeType.includes("mp4") || mimeType.includes("m4a")
      ? "m4a"
      : "webm";
  const { text, error } = await System.transcribeAudio(
    blob,
    `audio.${extension}`,
  );
  setProcessing(false);

  if (error) {
    showToast(t("chat_window.stt_transcription_failed", { error }), "error", {
      clear: true,
    });
    return;
  }
  if (!text) return;

  sendCommand({
    text,
    autoSubmit: !!Appearance.get("autoSubmitSttInput"),
    writeMode: "append",
  });
}
